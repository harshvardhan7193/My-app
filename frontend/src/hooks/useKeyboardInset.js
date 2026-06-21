import { useState, useEffect } from 'react';

export const KEYBOARD_TRANSITION = 'bottom 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

function isFlutterShell() {
  return typeof window !== 'undefined' && !!window.flutter_inappwebview;
}

function readNativeKeyboard() {
  if (typeof window === 'undefined') return null;
  const raw = window.__auraNativeMetrics?.keyboard;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/**
 * Keyboard inset for the fixed chat composer.
 *
 * In the Flutter APK we use ONLY native viewInsets.bottom injected from Dart.
 * visualViewport / CSS fallbacks are browser-only — mixing them with a resized
 * WebView caused double-lift (gap above keyboard) and stale height on close.
 */
export function useKeyboardInset() {
  const [state, setState] = useState({ offset: 0, isOpen: false });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const applyNative = (height) => {
      const kb = Math.max(0, Math.round(Number(height) || 0));
      setState({ offset: kb, isOpen: kb > 48 });
    };

    const computeBrowser = () => {
      const vv = window.visualViewport;
      if (!vv || vv.scale > 1.01) {
        setState({ offset: 0, isOpen: false });
        return;
      }
      const overlap = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - (vv.offsetTop || 0)),
      );
      setState({ offset: overlap, isOpen: overlap > 48 });
    };

    const compute = () => {
      if (isFlutterShell()) {
        const native = readNativeKeyboard();
        if (native != null) {
          applyNative(native);
          return;
        }
      }
      computeBrowser();
    };

    const onNativeKeyboard = (e) => {
      if (isFlutterShell() && e?.detail?.height != null) {
        applyNative(e.detail.height);
      }
    };

    const onFocusOut = () => {
      setTimeout(compute, 50);
      setTimeout(compute, 180);
      setTimeout(compute, 360);
    };

    compute();

    window.addEventListener('aura:keyboard', onNativeKeyboard);
    window.addEventListener('resize', compute);
    window.visualViewport?.addEventListener('resize', compute);
    document.addEventListener('focusin', compute, true);
    document.addEventListener('focusout', onFocusOut, true);

    return () => {
      window.removeEventListener('aura:keyboard', onNativeKeyboard);
      window.removeEventListener('resize', compute);
      window.visualViewport?.removeEventListener('resize', compute);
      document.removeEventListener('focusin', compute, true);
      document.removeEventListener('focusout', onFocusOut, true);
    };
  }, []);

  return state;
}
