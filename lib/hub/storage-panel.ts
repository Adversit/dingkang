import type {StorageBridge} from '@/components/ModuleStorageGate';

export type HubStorageMode = 'bridge' | 'native';
export type ModuleStorageBinding = {window: Window; bridge: StorageBridge};

/** Errors from an iframe have another Error prototype. Preserve their message. */
export function storageErrorMessage(error: unknown, fallback = '操作未完成，请保留当前页面后重试。'): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.trim()) return error.message;
  return fallback;
}

/** Only untouched, signed-out initialization is a login prompt, not a save fault. */
export function isSignedOutStorageFailure(error: unknown, bridge?: StorageBridge | null): boolean {
  return !!(error && typeof error === 'object' && 'name' in error && error.name === 'SecurityError' &&
    bridge?.canLeaveWithoutSaving === true && bridge.userId === null);
}

declare global {
  interface Window {
    /** Native module drafts may veto a hub-driven iframe navigation. */
    HubBeforeLeave?: () => boolean | Promise<boolean>;
    /** Revoke a one-use unload permit when hub navigation does not complete. */
    HubCancelLeave?: () => void;
  }
}

/** Cancelled hub navigation must not leave a native beforeunload bypass armed. */
export function cancelHubModuleLeave(root: Window | null, origin?: string): void {
  const expectedOrigin = origin ?? (typeof window === 'undefined' ? null : window.location.origin);
  if (!expectedOrigin) return;
  try {
    if (root?.location.origin !== expectedOrigin || !root.document) return;
    if (typeof root.HubCancelLeave === 'function') root.HubCancelLeave.call(root);
  } catch { /* A replaced/cross-origin document cannot retain this module's permit. */ }
}

const bridgeModules = new Set([
  'agent-architecture-journey', 'aipm-studio-dk', 'wandeng-evening',
  'cloudrush-runner', 'starfall-creature-isles', 'pocket-arcade-ten',
  'yourwar-battle-forge', 'mistbound-letters', 'moonlit-immortal-chronicle', 'yunque-sanguo',
]);

/** Unknown/business modules must not be reported as synced by the state bridge. */
export function hubStorageMode(moduleId: string, root?: Window | null): HubStorageMode {
  // The current novel workspace saves through its own APIs. Only its original
  // index document still edits bridge-backed archives. Settings has no bridge.
  if (moduleId === 'novel-studio') {
    try { return ['/apps/novel-studio/index.html', '/apps/novel-studio/index', '/apps/novel-studio/', '/apps/novel-studio'].includes(root?.location.pathname ?? '') ? 'bridge' : 'native'; }
    catch { return 'native'; }
  }
  return bridgeModules.has(moduleId) ? 'bridge' : 'native';
}

/** Inspect only accessible same-origin documents, including Moonlit's inner iframe. */
export function findModuleStorage(root: Window | null, moduleId: string, origin: string, depth = 0): ModuleStorageBinding | null {
  if (!root || depth > 3) return null;
  try {
    if (root.location.origin !== origin) return null;
    // Accessing document also rejects opaque sandboxed frames.
    if (!root.document) return null;
    const bridge = root.HubStorage;
    if (bridge?.moduleId === moduleId) return {window: root, bridge};
    for (let index = 0; index < Math.min(root.frames.length, 8); index++) {
      const nested = findModuleStorage(root.frames[index], moduleId, origin, depth + 1);
      if (nested) return nested;
    }
  } catch { /* Navigation or a cross-origin child may make a document inaccessible. */ }
  return null;
}

/** Await this before unmounting a bridge iframe; on rejection keep the module open. */
export async function flushHubModule(root: Window | null, moduleId: string, origin: string, mode = hubStorageMode(moduleId, root)): Promise<void> {
  let document: Document | null = null, guard: Window['HubBeforeLeave'];
  try {
    if (root?.location.origin === origin) { document = root.document; guard = root.HubBeforeLeave; }
  } catch { /* A cross-origin frame cannot expose a native draft guard. */ }
  if (root && document && typeof guard === 'function') {
    if (await guard.call(root) === false) {
      const error = new Error('已保留当前应用，未离开。');
      error.name = 'AbortError';
      throw error;
    }
    try {
      if (root.location.origin !== origin || root.document !== document) throw new Error();
    } catch { throw new Error('应用页面已变化，请确认当前内容后再离开。'); }
  }
  if (mode === 'native') return;
  const binding = findModuleStorage(root, moduleId, origin);
  if (!binding) throw new Error('存档组件尚未连接，请稍后再离开此应用。');
  const requireCurrentDocument = () => {
    const current = findModuleStorage(root, moduleId, origin);
    if (!current || current.window !== binding.window || current.bridge !== binding.bridge) {
      throw new Error('应用页面已变化，请等待当前存档重新连接后再离开。');
    }
  };
  try { await binding.bridge.ready; }
  catch (error) {
    requireCurrentDocument();
    // A guest/auth failure before the module loaded any state must not trap the
    // user in its loading screen. Loaded/dirty bridges never grant this signal.
    if (binding.bridge.canLeaveWithoutSaving === true) return;
    throw error;
  }
  requireCurrentDocument();
  if (binding.bridge.status.state === 'conflict') throw new Error('请先选择保留本机或云端存档，再离开此应用。');
  await binding.bridge.flush();
  requireCurrentDocument();
  if (binding.bridge.status.state !== 'saved') throw new Error('进度尚未同步。请重试或导出本机副本，并保留当前应用。');
}
