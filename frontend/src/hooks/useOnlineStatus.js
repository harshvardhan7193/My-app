import { useEffect, useState } from 'react';

/**
 * Online status — prefers native Flutter connectivity when available.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => {
    if (typeof window !== 'undefined' && typeof window.auraIsOnline === 'function') {
      return window.auraIsOnline();
    }
    return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  });

  useEffect(() => {
    const sync = () => {
      if (typeof window.auraIsOnline === 'function') {
        setOnline(window.auraIsOnline());
      } else {
        setOnline(navigator.onLine !== false);
      }
    };

    const onNative = (e) => {
      if (e?.detail && typeof e.detail.online === 'boolean') {
        setOnline(e.detail.online);
      } else {
        sync();
      }
    };

    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    window.addEventListener('aura:connectivity', onNative);

    if (window.flutter_inappwebview) {
      window.flutter_inappwebview.callHandler('isOnline')
        .then((v) => setOnline(!!v))
        .catch(() => {});
    } else {
      window.addEventListener('flutterInAppWebViewPlatformReady', sync);
    }

    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      window.removeEventListener('aura:connectivity', onNative);
      window.removeEventListener('flutterInAppWebViewPlatformReady', sync);
    };
  }, []);

  return online;
}

export default useOnlineStatus;
