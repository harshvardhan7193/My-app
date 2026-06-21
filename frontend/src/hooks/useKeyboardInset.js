import { useState, useEffect } from 'react';

export const KEYBOARD_TRANSITION = 'bottom 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

function readVisualKeyboard() {
  const vv = window.visualViewport;
  if (!vv || vv.scale > 1.01) return 0;
  return Math.max(
    0,
    Math.round(window.innerHeight - vv.height - (vv.offsetTop || 0)),
  );
}

async function readFlutterKeyboard() {
  if (!window.flutter_inappwebview?.callHandler) return 0;
  try {
    const value = await window.flutter_inappwebview.callHandler('getKeyboardInset');
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  } catch {
    return 0;
  }
}

/**
 * Keyboard inset for the fixed chat composer.
 *
 * Only active while `focused` is true (input has focus). Resets to 0 on blur
 * immediately so a stale native value cannot leave the bar floating mid-screen.
 */
export function useKeyboardInset(focused = false) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!focused) {
      setOffset(0);
      return undefined;
    }

    let cancelled = false;

    const measure = async () => {
      if (cancelled) return;
      const native = await readFlutterKeyboard();
      const visual = readVisualKeyboard();
      const next = Math.max(native, visual);
      if (!cancelled) setOffset(next);
    };

    measure();
    const interval = setInterval(measure, 100);

    const onNativeKeyboard = (e) => {
      if (cancelled || !focused) return;
      const h = Math.max(0, Math.round(Number(e?.detail?.height) || 0));
      setOffset(h);
    };

    window.addEventListener('aura:keyboard', onNativeKeyboard);
    window.visualViewport?.addEventListener('resize', measure);
    window.addEventListener('resize', measure);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('aura:keyboard', onNativeKeyboard);
      window.visualViewport?.removeEventListener('resize', measure);
      window.removeEventListener('resize', measure);
      setOffset(0);
    };
  }, [focused]);

  return offset;
}
