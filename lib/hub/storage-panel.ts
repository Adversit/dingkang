import type {StorageBridge} from '@/components/ModuleStorageGate';

export type HubStorageMode = 'bridge' | 'native';
export type ModuleStorageBinding = {window: Window; bridge: StorageBridge};

const bridgeModules = new Set([
  'agent-architecture-journey', 'aipm-studio-dk', 'wandeng-evening',
  'cloudrush-runner', 'starfall-creature-isles', 'pocket-arcade-ten',
  'yourwar-battle-forge', 'mistbound-letters', 'moonlit-immortal-chronicle', 'yunque-sanguo',
]);

/** Unknown/business modules must not be reported as synced by the state bridge. */
export function hubStorageMode(moduleId: string): HubStorageMode {
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
export async function flushHubModule(root: Window | null, moduleId: string, origin: string, mode = hubStorageMode(moduleId)): Promise<void> {
  if (mode === 'native') return;
  const binding = findModuleStorage(root, moduleId, origin);
  if (!binding) throw new Error('存档组件尚未连接，请稍后再离开此应用。');
  const requireCurrentDocument = () => {
    const current = findModuleStorage(root, moduleId, origin);
    if (!current || current.window !== binding.window || current.bridge !== binding.bridge) {
      throw new Error('应用页面已变化，请等待当前存档重新连接后再离开。');
    }
  };
  await binding.bridge.ready;
  requireCurrentDocument();
  if (binding.bridge.status.state === 'conflict') throw new Error('请先选择保留本机或云端存档，再离开此应用。');
  await binding.bridge.flush();
  requireCurrentDocument();
  if (binding.bridge.status.state !== 'saved') throw new Error('进度尚未同步。请重试或导出本机副本，并保留当前应用。');
}
