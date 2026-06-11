import React, { useEffect, useMemo } from 'react';
import { subscribeMessages, updateMessageStatus } from '../config/firebase';

/**
 * A silent, global component that runs when the user is authenticated.
 * It listens to recent chat messages and marks incoming "sent" messages as "delivered"
 * so the sender knows they've successfully reached this device.
 */
export default function DeliveryTracker() {
  const user = useMemo(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!user?.coupleId) return undefined;

    // Listen to the most recent 30 messages
    const unsub = subscribeMessages(
      user.coupleId,
      (messages) => {
        messages.forEach((msg) => {
          // If a message was sent by the partner and its status is exactly 'sent'
          if (msg.sender !== String(user._id) && msg.status === 'sent') {
            updateMessageStatus(user.coupleId, msg.id, 'delivered').catch(console.error);
          }
        });
      },
      30
    );

    return unsub;
  }, [user]);

  return null;
}
