import { useState, useEffect } from 'react';

// Easing used for the input bar slide — matches the hook's transition so
// movement feels smooth even when Android WebView reports keyboard open/close
// in a single instant frame (common in Flutter APK wrappers).
export const KEYBOARD_TRANSITION = 'bottom 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * Tracks keyboard state for a hybrid Flutter WebView + SPA chat input.
 *
 * Returns:
 *   offset — CSS `bottom` value for a `position: fixed` input bar.
 *            Only non-zero when the layout viewport stays full-height
 *            (adjustNothing + overlays-content). When Android adjustResize
 *            shrinks the layout, offset is forced to 0 to avoid double-lift.
 *   isOpen — whether the keyboard (or bottom chrome) is covering the screen.
 */
export function useKeyboardInset() {
  const [state, setState] = useState({ offset: 0, isOpen: false });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let peakLayoutHeight = window.innerHeight;

    const compute = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setState({ offset: 0, isOpen: false });
        return;
      }

      if (vv.scale > 1.01) {
        setState({ offset: 0, isOpen: false });
        return;
      }

      peakLayoutHeight = Math.max(peakLayoutHeight, window.innerHeight);

      const overlap = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );

      // adjustResize + resizes-content shrinks innerHeight with the keyboard.
      // Applying overlap on top would lift the input twice (gap above keyboard).
      const layoutShrunk = peakLayoutHeight - window.innerHeight > 80;
      const isOpen = overlap > 40 || layoutShrunk;

      if (!isOpen) {
        peakLayoutHeight = window.innerHeight;
      }

      setState({
        offset: layoutShrunk ? 0 : overlap,
        isOpen,
      });
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

  return state;
}
