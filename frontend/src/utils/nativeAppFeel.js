const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], .allow-text-select';

const isEditableTarget = (target) => {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(target.closest(EDITABLE_SELECTOR));
};

const isInConsumerApp = (target) => {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(target.closest('.mobile-container'));
};

const shouldBlockWebSelection = (target) =>
  isInConsumerApp(target) && !isEditableTarget(target);

/** Disable long-press selection, copy, and browser context menus in the mobile app shell. */
export function initNativeAppFeel() {
  const block = (e) => {
    if (shouldBlockWebSelection(e.target)) {
      e.preventDefault();
    }
  };

  document.addEventListener('contextmenu', block, { capture: true });
  document.addEventListener('selectstart', block, { capture: true });
  document.addEventListener('copy', block, { capture: true });
  document.addEventListener('cut', block, { capture: true });
}
