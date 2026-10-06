/**
 * Cross-tab messaging. When an admin edits data or uploads files in one browser
 * tab, every other open tab of the site hears about it and refreshes, so several
 * tabs can be used side by side without showing stale data.
 */
export type SyncMessage =
  | { type: 'data-changed'; model: string }
  | { type: 'uploads'; tabId: string; label: string; items: { name: string; progress: number; state: string }[] }
  | { type: 'tab-closed'; tabId: string };

export const TAB_ID = Math.random().toString(36).slice(2, 8);

const channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('sakurai-seminar') : null;
const handlers = new Set<(m: SyncMessage) => void>();

channel?.addEventListener('message', (e: MessageEvent<SyncMessage>) => handlers.forEach((h) => h(e.data)));

export function broadcast(msg: SyncMessage) {
  channel?.postMessage(msg);
}

export function onSync(handler: (m: SyncMessage) => void) {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => broadcast({ type: 'tab-closed', tabId: TAB_ID }));
}
