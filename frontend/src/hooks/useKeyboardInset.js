import { useState, useEffect } from 'react';

export const KEYBOARD_TRANSITION = 'bottom 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

function readCssKeyboard() {
  if (typeof document === 'undefined') return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--aura-keyboard');
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Tracks keyboard inset for a fixed chat composer in the Flutter WebView shell.
 *
 * Prefers native `viewInsets.bottom` injected by Flutter, then CSS `--aura-keyboard`,
 * then visualViewport overlap. When adjustResize already shrinks innerHeight, offset
 * is forced to 0 so the composer is not lifted twice.
 */
export function useKeyboardInset() {
  const [state, setState] = useState({ offset: 0, isOpen: false });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let peakLayoutHeight = window.innerHeight;

    const compute = () => {
      const vv = window.visualViewport;
      const nativeKb = Number(window.__auraNativeMetrics?.keyboard) || 0;
      const cssKb = readCssKeyboard();

      let overlap = 0;
      if (vv && vv.scale <= 1.01) {
        overlap = Math.max(
          0,
          Math.round(window.innerHeight - vv.height - (vv.offsetTop || 0)),
        );
      }

      peakLayoutHeight = Math.max(peakLayoutHeight, window.innerHeight);
      const layoutShrunk = peakLayoutHeight - window.innerHeight > 80;
      const keyboardHeight = Math.max(nativeKb, cssKb, overlap);
      const isOpen = keyboardHeight > 48 || layoutShrunk;

      if (!isOpen) {
        peakLayoutHeight = window.innerHeight;
      }

      setState({
        offset: layoutShrunk ? 0 : keyboardHeight,
        isOpen,
      });
    };

    compute();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', compute);
    window.addEventListener('resize', compute);
    document.addEventListener('focusin', compute, true);
    document.addEventListener('focusout', compute, true);

    return () => {
      vv?.removeEventListener('resize', compute);
      window.removeEventListener('resize', compute);
      document.removeEventListener('focusin', compute, true);
      document.removeEventListener('focusout', compute, true);
    };
  }, []);

  return state;
}
