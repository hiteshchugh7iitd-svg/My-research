import { useEffect, useState, useSyncExternalStore } from 'react';
import { listAll, publicClient, parseJson, type ModelName } from './amplify';
import { onSync } from './sync';

/**
 * Small cache for public content: each model is loaded once per page view and
 * shared by every component. `invalidate()` refetches after an edit (also when
 * the edit happened in another browser tab — see sync.ts).
 */
type Entry = { data?: unknown[]; error?: string; promise?: Promise<void>; version: number };
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load(model: ModelName) {
  const entry = cache.get(model) ?? { version: 0 };
  if (entry.promise) return;
  entry.promise = listAll<unknown>(publicClient.models[model])
    .then((data) => {
      entry.data = data;
      entry.error = undefined;
    })
    .catch((e: Error) => {
      entry.error = e.message;
      entry.data = entry.data ?? [];
    })
    .finally(() => {
      entry.promise = undefined;
      entry.version++;
      emit();
    });
  cache.set(model, entry);
}

export function invalidate(...models: ModelName[]) {
  for (const m of models) {
    const e = cache.get(m);
    if (e) {
      e.promise = undefined;
      load(m);
    }
  }
}

onSync((msg) => {
  if (msg.type === 'data-changed') invalidate(msg.model as ModelName);
});

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Returns all items of a public model: { items, loading, error }. */
export function useModel<T>(model: ModelName): { items: T[]; loading: boolean; error?: string } {
  const version = useSyncExternalStore(subscribe, () => cache.get(model)?.version ?? -1);
  useEffect(() => {
    if (!cache.get(model)?.data) load(model);
  }, [model]);
  void version;
  const entry = cache.get(model);
  return { items: (entry?.data as T[]) ?? [], loading: !entry?.data, error: entry?.error };
}

/** A SiteContent block (editable list or text) with a built-in default. */
export function useContent<T>(id: string, fallback: T): T {
  const { items } = useModel<{ id: string; data: unknown }>('SiteContent');
  const block = items.find((b) => b.id === id);
  return block ? parseJson<T>(block.data, fallback) : fallback;
}

/** Generic async hook for one-off loads. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): { data?: T; loading: boolean; error?: string; reload: () => void } {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: string }>({ loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fn()
      .then((data) => alive && setState({ data, loading: false }))
      .catch((e: Error) => alive && setState({ loading: false, error: e.message }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}
