import api from './api';
import { updateMessageStatus } from '../config/firebase';

/**
 * Mark a chat message as delivered on this device.
 * Prefers a direct RTDB write when authenticated; falls back to the public
 * REST ack used by the service worker / native FCM shell.
 */
export async function acknowledgeChatDelivery(messageId, coupleId) {
  if (!messageId || !coupleId) return;

  if (api.accessToken) {
    try {
      await updateMessageStatus(coupleId, messageId, 'delivered');
      return;
    } catch {
      /* fall through to REST ack */
    }
  }

  await api.markChatMessageDelivered(messageId, coupleId);
}
