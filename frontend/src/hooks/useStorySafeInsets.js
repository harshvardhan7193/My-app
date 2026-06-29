import { useEffect, useState } from 'react';

/** Pixel insets for fullscreen story chrome (status bar + nav bar). */
export function getStorySafeInsets() {
  if (typeof window === 'undefined') {
    return { top: 28, bottom: 52 };
  }

  window.__auraApplyViewport?.();

  const metrics = window.__auraNativeMetrics || {};
  const isNative = !!(metrics && Object.keys(metrics).length) || !!window.flutter_inappwebview;

  const safeTop = Math.max(0, Number(metrics.safeTop) || 0);
  const safeBottom = Math.max(0, Number(metrics.safeBottom) || 0);

  const root = getComputedStyle(document.documentElement);
  const appPadTop = parseFloat(root.getPropertyValue('--app-pad-top')) || 0;
  const composerBottom = parseFloat(root.getPropertyValue('--aura-composer-bottom')) || 0;

  // Match chat composer safe-area — small breathing room only, no stacked buffers.
  const top = Math.ceil(Math.max(safeTop, appPadTop, isNative ? 20 : 8)) + 6;
  const bottom = Math.ceil(Math.max(safeBottom, composerBottom, isNative ? 40 : 12)) + 6;

  return { top, bottom };
}

const storyChromeShell = {
  position: 'fixed',
  left: 0,
  right: 0,
  marginLeft: 'auto',
  marginRight: 'auto',
  width: '100%',
  maxWidth: 430,
  boxSizing: 'border-box',
  zIndex: 5020,
};

export function storyChromeStyle(insets, edge, extra = 0) {
  return {
    ...storyChromeShell,
    [edge]: insets[edge] + extra,
  };
}

export default function useStorySafeInsets() {
  const [insets, setInsets] = useState(getStorySafeInsets);

  useEffect(() => {
    const update = () => setInsets(getStorySafeInsets());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      vv?.removeEventListener('resize', update);
    };
  }, []);

  return insets;
}
