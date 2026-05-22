import { getDatabase } from '../config/firebase.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get all chat messages (admin)
// @route   GET /api/chat/messages
export const getMessages = asyncHandler(async (req, res) => {
  const db = getDatabase();
  const ref = db.ref(`chats/${req.coupleId}/messages`);
  const snapshot = await ref.orderByChild('createdAt').limitToLast(200).once('value');

  const messages = [];
  snapshot.forEach(child => {
    messages.push({ id: child.key, ...child.val() });
  });

  res.json(messages);
});

// @desc    Delete a message (admin)
// @route   DELETE /api/chat/messages/:id
export const deleteMessage = asyncHandler(async (req, res) => {
  const db = getDatabase();
  const ref = db.ref(`chats/${req.coupleId}/messages/${req.params.id}`);
  await ref.remove();
  res.json({ message: 'Message deleted' });
});
