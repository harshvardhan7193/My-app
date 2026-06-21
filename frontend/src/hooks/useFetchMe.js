import { useEffect, useState } from 'react';
import api from '../utils/api';

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('currentUser');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.coupleId && (parsed._id || parsed.id)) return parsed;
    return parsed._id || parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

export function persistMeUser(me) {
  if (!me) return;
  localStorage.setItem('user', JSON.stringify(me));

  const savedMe = localStorage.getItem('currentUser');
  if (savedMe) {
    try {
      const parsed = JSON.parse(savedMe);
      parsed._id = me._id;
      parsed.coupleId = me.coupleId;
      parsed.name = me.name;
      parsed.avatar = me.avatar;
      localStorage.setItem('currentUser', JSON.stringify(parsed));
    } catch {
      /* ignore */
    }
  }

  window.dispatchEvent(new CustomEvent('auth-user-changed', { detail: me }));
}

/** Fetches GET /users/me on mount and keeps localStorage + theme listeners in sync. */
export default function useFetchMe() {
  const [me, setMe] = useState(readStoredUser);
  const [loading, setLoading] = useState(!!api.accessToken);

  useEffect(() => {
    if (!api.accessToken) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await api.getMe();
        if (!cancelled && data) {
          persistMeUser(data);
          setMe(data);
        }
      } catch (err) {
        console.error('[useFetchMe] Failed to fetch user:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { me, setMe, loading };
}
