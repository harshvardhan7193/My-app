import { useState, useEffect } from 'react';

// Easing used for the input bar slide — matches the hook's transition so
// movement feels smooth even when Android WebView reports keyboard open/close
// in a single instant frame (common in Flutter APK wrappers).
export const KEYBOARD_TRANSITION = 'bottom 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * Tracks how many CSS pixels the on-screen keyboard (or any UI chrome
 * shrinking the visual viewport) occupies at the bottom of the screen.
 *
 * Designed for hybrid apps: Chrome animates keyboard resize natively, but
 * Android WebView often fires one abrupt layout change. Pair the returned
 * inset with `KEYBOARD_TRANSITION` on a `position: fixed` bottom bar so
 * the UI glides up/down instead of jumping.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const compute = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setInset(0);
        return;
      }
      const next = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setInset(next);
    };

    compute();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', compute);
    vv?.addEventListener('scroll', compute);
    window.addEventListener('resize', compute);

    return () => {
      vv?.removeEventListener('resize', compute);
      vv?.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, []);

  return inset;
}
