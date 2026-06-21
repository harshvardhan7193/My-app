/**
 * Syncs real screen / visual-viewport dimensions to CSS custom properties so
 * layouts adapt across Android WebView devices (different heights, notches, IME).
 */

export function applyViewportMetrics(native = null) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const root = document.documentElement;
  const vv = window.visualViewport;
  const layoutW = window.innerWidth;
  const layoutH = window.innerHeight;
  const vvH = vv?.height ?? layoutH;
  const vvTop = vv?.offsetTop ?? 0;
  const vvW = vv?.width ?? layoutW;

  const metrics = native || window.__auraNativeMetrics || null;
  const safeTop = metrics?.safeTop ?? 0;
  const safeBottom = metrics?.safeBottom ?? 0;
  const nativeKeyboard =
    metrics != null && metrics.keyboard != null
      ? Math.max(0, Math.round(Number(metrics.keyboard) || 0))
      : null;

  // Always use live inner dimensions — native inject holds full-screen height
  // and must NOT override layout when adjustResize shrinks the WebView for IME.
  const appHeight = layoutH;
  const appWidth = layoutW;

  root.style.setProperty('--aura-vw', `${appWidth}px`);
  root.style.setProperty('--aura-vh', `${appHeight}px`);
  root.style.setProperty('--aura-layout-h', `${layoutH}px`);
  root.style.setProperty('--aura-vv-h', `${vvH}px`);
  root.style.setProperty('--aura-vv-w', `${vvW}px`);
  root.style.setProperty('--aura-vv-top', `${vvTop}px`);

  const keyboard = nativeKeyboard != null
    ? nativeKeyboard
    : Math.max(0, Math.round(layoutH - vvH - vvTop));
  root.style.setProperty('--aura-keyboard', `${keyboard}px`);
  root.classList.toggle('aura-keyboard-open', keyboard > 48);

  if (metrics?.safeTop != null) {
    root.style.setProperty('--aura-safe-top', `${metrics.safeTop}px`);
  }
  if (metrics?.safeBottom != null) {
    root.style.setProperty('--aura-safe-bottom', `${metrics.safeBottom}px`);
  }

  const padTop = Math.max(safeTop, Math.round(appWidth * 0.035));
  const padBottom = Math.max(safeBottom, Math.round(appWidth * 0.035));
  if (keyboard <= 48) {
    root.style.setProperty('--app-pad-top', `${padTop}px`);
    root.style.setProperty('--app-pad-bottom', `${padBottom}px`);
  }

  const isNativeShell = !!(metrics || window.flutter_inappwebview);
  const navBottom =
    keyboard > 48 ? 0 : Math.max(safeBottom, padBottom, isNativeShell ? 48 : 0);
  root.style.setProperty('--aura-nav-bottom', `${navBottom}px`);

  // Chat composer sits flush on the screen edge (no app bottom nav). Android
  // WebViews often report env(safe-area-inset-bottom) as 0 — use native inject
  // with a 48px floor for 3-button / gesture navigation bars.
  const composerBottom =
    keyboard > 48 ? 8 : Math.max(8, safeBottom, padBottom, isNativeShell ? 48 : 0);
  root.style.setProperty('--aura-composer-bottom', `${composerBottom}px`);

  const scale = Math.min(1, Math.max(0.88, appHeight / 760));
  root.style.setProperty('--aura-scale', String(scale));

  root.classList.toggle('aura-compact', appHeight < 680);
  root.classList.toggle('aura-tall', appHeight >= 820);
  root.classList.toggle('aura-narrow', appWidth < 360);
}

export function initViewportLayoutListeners() {
  if (typeof window === 'undefined') return () => {};

  const run = () => applyViewportMetrics(window.__auraNativeMetrics || null);

  run();
  window.__auraApplyViewport = run;

  const vv = window.visualViewport;
  vv?.addEventListener('resize', run);
  // Do NOT listen to visualViewport 'scroll' — fires when IME opens and
  // re-triggers layout, causing the floating-keyboard artifact on Android.
  window.addEventListener('resize', run);
  window.addEventListener('orientationchange', run);

  return () => {
    delete window.__auraApplyViewport;
    vv?.removeEventListener('resize', run);
    window.removeEventListener('resize', run);
    window.removeEventListener('orientationchange', run);
  };
}
