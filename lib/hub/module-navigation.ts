export type ModuleNavigationAction = 'hub:open-menu' | 'hub:return';

/** Only the active app document may invoke its shared workspace navigation. */
export function moduleNavigationAction(
  event: Pick<MessageEvent, 'origin' | 'source' | 'data'>,
  frame: Window | null,
  origin: string,
  activeModuleId: string | null,
): ModuleNavigationAction | null {
  if (!frame || activeModuleId !== 'novel-studio' || event.origin !== origin || event.source !== frame) return null;
  const input: unknown = event.data;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const message = input as Record<string, unknown>;
  if (message.moduleId !== activeModuleId) return null;
  return message.type === 'hub:open-menu' || message.type === 'hub:return' ? message.type : null;
}
