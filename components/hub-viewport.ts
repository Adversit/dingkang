/** Keep embedded applications inside the area left visible by the on-screen keyboard.
 * Dynamic viewport units do not shrink for overlay keyboards on mobile browsers.
 */
export function installImmersiveViewport(shell: HTMLElement, view: Window = window) {
  const viewport = view.visualViewport;
  const keys = ['--hub-viewport-height', '--hub-viewport-top'] as const;
  const previous = keys.map(key => ({key,value:shell.style.getPropertyValue(key),priority:shell.style.getPropertyPriority(key)}));
  let frame: number | null = null;
  const update = () => {
    frame = null;
    // Pinch zoom should magnify the current layout, not continuously resize it.
    if (viewport && Math.abs(viewport.scale - 1) > .01) return;
    const height = viewport?.height ?? view.innerHeight;
    if (!Number.isFinite(height) || height <= 0) return;
    const top = Math.max(0,viewport?.offsetTop ?? 0);
    const values = [`${Math.round(height)}px`,`${Math.round(Number.isFinite(top) ? top : 0)}px`];
    keys.forEach((key,index) => {
      if (shell.style.getPropertyValue(key) !== values[index]) shell.style.setProperty(key,values[index]);
    });
  };
  const schedule = () => {if (frame === null) frame = view.requestAnimationFrame(update);};
  viewport?.addEventListener('resize',schedule);
  viewport?.addEventListener('scroll',schedule);
  view.addEventListener('resize',schedule);
  update();
  return () => {
    if (frame !== null) view.cancelAnimationFrame(frame);
    viewport?.removeEventListener('resize',schedule);
    viewport?.removeEventListener('scroll',schedule);
    view.removeEventListener('resize',schedule);
    previous.forEach(({key,value,priority}) => value ? shell.style.setProperty(key,value,priority) : shell.style.removeProperty(key));
  };
}

/** Do not steal typing or native shortcuts, or focus a field behind an open dialog. */
export function canFocusHubSearch(event: KeyboardEvent, doc: Document = document) {
  if (event.key !== '/' || event.defaultPrevented || event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return false;
  const target = event.target as HTMLElement | null;
  if (target?.isContentEditable || target?.closest?.('input,textarea,select,[role="textbox"]')) return false;
  return !doc.querySelector('dialog[open],[aria-modal="true"]');
}
