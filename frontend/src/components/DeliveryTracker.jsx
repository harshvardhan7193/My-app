import { useEffect, useRef } from 'react';
import { subscribeMessages, updateMessageStatus } from '../config/firebase';
import api from '../utils/api';
import { acknowledgeChatDelivery } from '../utils/chatDelivery';

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Marks incoming partner messages as "delivered" when they reach this device
 * via Firebase RTDB (app open / background sync).
 */
export default function DeliveryTracker() {
  const unsubRef = useRef(null);
  const identityRef = useRef({ coupleId: null, myId: null });

  useEffect(() => {
    if (!api.accessToken) return undefined;

    const attach = (coupleId, myId) => {
      if (!coupleId || !myId) return;
      identityRef.current = { coupleId, myId };
      unsubRef.current?.();
      unsubRef.current = subscribeMessages(
        coupleId,
        (messages) => {
          messages.forEach((msg) => {
            if (
              msg.sender !== String(myId)
              && msg.id
              && (msg.status === 'sent' || !msg.status)
            ) {
              updateMessageStatus(coupleId, msg.id, 'delivered').catch(() => {});
            }
          });
        },
        50,
      );
    };

    const bootstrap = async () => {
      const stored = readStoredUser();
      let coupleId = stored?.coupleId;
      let myId = stored?._id || stored?.id;
      if (!coupleId || !myId) {
        try {
          const me = await api.getMe();
          coupleId = me?.coupleId;
          myId = me?._id;
        } catch {
          return;
        }
      }
      attach(coupleId, myId);
    };

    bootstrap();

    const onAuthChange = (e) => {
      unsubRef.current?.();
      unsubRef.current = null;
      if (!e.detail) return;
      attach(e.detail.coupleId, e.detail._id);
    };

    window.addEventListener('auth-user-changed', onAuthChange);
    return () => {
      unsubRef.current?.();
      window.removeEventListener('auth-user-changed', onAuthChange);
    };
  }, []);

  return null;
}
