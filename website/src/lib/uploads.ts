import { useEffect, useState, useSyncExternalStore } from 'react';
import { uploadFile, type UploadResult, type UploadTarget } from './files';
import { broadcast, onSync, TAB_ID } from './sync';

/**
 * Parallel upload queue used by the admin console and the student portal.
 *
 * - Up to 4 files upload at the same time; the rest wait in line.
 * - Each file shows its own progress and can be cancelled or retried.
 * - Identical files are detected by fingerprint and not stored twice.
 * - Progress is shared with other open tabs, so an admin can start uploads in
 *   several tabs at once and watch them all from any tab.
 */
export type UploadState = 'queued' | 'uploading' | 'done' | 'duplicate' | 'error' | 'cancelled';
export type UploadItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  state: UploadState;
  error?: string;
  result?: UploadResult;
  target: UploadTarget;
  batch: string;
  cancel?: () => void;
};

const CONCURRENCY = 4;
let items: UploadItem[] = [];
let identity: string | undefined;
const listeners = new Set<() => void>();
const waiters = new Map<string, (r: UploadResult | undefined) => void>();
let snapshot = items;

function emit() {
  snapshot = [...items];
  listeners.forEach((l) => l());
  scheduleBroadcast();
}

let broadcastTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleBroadcast() {
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = undefined;
    broadcast({
      type: 'uploads',
      tabId: TAB_ID,
      label: document.title,
      items: items.map((i) => ({ name: i.name, progress: i.progress, state: i.state })),
    });
  }, 400);
}

function update(id: string, patch: Partial<UploadItem>) {
  items = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
  emit();
}

function pump() {
  const running = items.filter((i) => i.state === 'uploading').length;
  const next = items.filter((i) => i.state === 'queued').slice(0, Math.max(0, CONCURRENCY - running));
  for (const item of next) {
    const signal: { cancel?: () => void } = {};
    update(item.id, { state: 'uploading', progress: 0, cancel: () => signal.cancel?.() });
    uploadFile(item.file, item.target, identity, (p) => update(item.id, { progress: p }), signal)
      .then((result) => {
        update(item.id, { state: result.skipped ? 'duplicate' : 'done', progress: 1, result });
        waiters.get(item.id)?.(result);
      })
      .catch((e: Error) => {
        const cancelled = items.find((i) => i.id === item.id)?.state === 'cancelled';
        if (!cancelled) update(item.id, { state: 'error', error: e.message });
        waiters.get(item.id)?.(undefined);
      })
      .finally(() => {
        waiters.delete(item.id);
        pump();
      });
  }
}

export const uploads = {
  setIdentity(id: string | undefined) {
    identity = id;
  },
  /** Adds files to the queue; resolves with one result per file (undefined if it failed or was cancelled). */
  add(files: File[], target: UploadTarget, batch = 'default'): Promise<(UploadResult | undefined)[]> {
    const added = files.map<UploadItem>((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      state: 'queued',
      target,
      batch,
    }));
    items = [...items, ...added];
    const promises = added.map((a) => new Promise<UploadResult | undefined>((res) => waiters.set(a.id, res)));
    emit();
    pump();
    return Promise.all(promises);
  },
  cancel(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (item.state === 'uploading') item.cancel?.();
    if (item.state === 'queued' || item.state === 'uploading') {
      update(id, { state: 'cancelled' });
      waiters.get(id)?.(undefined);
      waiters.delete(id);
      pump();
    }
  },
  retry(id: string) {
    const item = items.find((i) => i.id === id);
    if (item && (item.state === 'error' || item.state === 'cancelled')) {
      update(id, { state: 'queued', error: undefined, progress: 0 });
      pump();
    }
  },
  /** Removes successfully finished uploads from the list; failed ones stay visible so they can be retried. */
  clearFinished(batch?: string) {
    items = items.filter((i) => (batch && i.batch !== batch) || !(i.state === 'done' || i.state === 'duplicate' || i.state === 'cancelled'));
    emit();
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useUploads(batch?: string): UploadItem[] {
  const all = useSyncExternalStore(subscribe, () => snapshot);
  return batch ? all.filter((i) => i.batch === batch) : all;
}

/** Upload activity reported by other open tabs of this site. */
export function useOtherTabUploads() {
  const [tabs, setTabs] = useState<Record<string, { label: string; items: { name: string; progress: number; state: string }[]; at: number }>>({});
  useEffect(
    () =>
      onSync((m) => {
        if (m.type === 'uploads') setTabs((t) => ({ ...t, [m.tabId]: { label: m.label, items: m.items, at: Date.now() } }));
        if (m.type === 'tab-closed')
          setTabs((t) => {
            const { [m.tabId]: _gone, ...rest } = t;
            void _gone;
            return rest;
          });
      }),
    [],
  );
  return tabs;
}
