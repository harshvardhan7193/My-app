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
  const nativeW = metrics?.w;
  const nativeH = metrics?.h;
  const safeTop = metrics?.safeTop ?? 0;
  const safeBottom = metrics?.safeBottom ?? 0;

  const appHeight = Number.isFinite(nativeH) && nativeH > 0 ? nativeH : layoutH;
  const appWidth = Number.isFinite(nativeW) && nativeW > 0 ? nativeW : layoutW;

  root.style.setProperty('--aura-vw', `${appWidth}px`);
  root.style.setProperty('--aura-vh', `${appHeight}px`);
  root.style.setProperty('--aura-layout-h', `${layoutH}px`);
  root.style.setProperty('--aura-vv-h', `${vvH}px`);
  root.style.setProperty('--aura-vv-w', `${vvW}px`);
  root.style.setProperty('--aura-vv-top', `${vvTop}px`);

  const keyboard = Math.max(0, Math.round(layoutH - vvH - vvTop));
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
  root.style.setProperty('--app-pad-top', `${padTop}px`);
  root.style.setProperty('--app-pad-bottom', `${padBottom}px`);

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
  vv?.addEventListener('scroll', run);
  window.addEventListener('resize', run);
  window.addEventListener('orientationchange', run);

  return () => {
    delete window.__auraApplyViewport;
    vv?.removeEventListener('resize', run);
    vv?.removeEventListener('scroll', run);
    window.removeEventListener('resize', run);
    window.removeEventListener('orientationchange', run);
  };
}
