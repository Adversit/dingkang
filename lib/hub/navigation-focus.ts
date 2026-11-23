const focusableSelector = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';

/** Keep the mobile drawer operable without moving the desktop navigation. */
export function installNavigationModal(panel: HTMLElement, trigger: HTMLElement | null, close: () => void): () => void {
  const doc = panel.ownerDocument;
  const previousOverflow = doc.body.style.overflow;
  const visible = (element: HTMLElement) => element.isConnected && element.getClientRects().length > 0 && !element.closest('[hidden],[inert]');
  const controls = () => Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(visible);
  const focusFirst = () => (controls()[0] || panel).focus({preventScroll: true});
  const keyboard = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = controls(), first = items[0], last = items.at(-1);
    if (!first) { event.preventDefault(); panel.focus({preventScroll: true}); return; }
    if (!panel.contains(doc.activeElement) || doc.activeElement === panel || (event.shiftKey ? doc.activeElement === first : doc.activeElement === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus({preventScroll: true});
    }
  };
  const focus = (event: FocusEvent) => {
    if (!panel.contains(event.target as Node)) focusFirst();
  };
  doc.body.style.overflow = 'hidden';
  doc.addEventListener('keydown', keyboard);
  doc.addEventListener('focusin', focus);
  focusFirst();
  return () => {
    doc.removeEventListener('keydown', keyboard);
    doc.removeEventListener('focusin', focus);
    doc.body.style.overflow = previousOverflow;
    // Navigation may have opened an iframe or removed this theme by now.
    if (trigger && visible(trigger)) trigger.focus({preventScroll: true});
  };
}
