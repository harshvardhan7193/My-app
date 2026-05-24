import { getMessaging } from '../config/firebase.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import Notification from '../models/Notification.js';

const cleanupStaleTokens = async (userId, failedTokens) => {
  if (!failedTokens.length) return;
  try {
    await User.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: { $in: failedTokens } }
    });
    console.log(`Cleaned up ${failedTokens.length} stale tokens for user ${userId}`);
  } catch (err) {
    console.error(`Error cleaning up stale tokens for user ${userId}:`, err);
  }
};

const sendToTokens = async (userId, tokens, messagePayload) => {
  if (!tokens || tokens.length === 0) return { success: 0, failure: 0 };
  
  try {
    const messaging = getMessaging();
    const message = {
      ...messagePayload,
      tokens
    };
    
    const response = await messaging.sendEachForMulticast(message);
    
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (errCode === 'messaging/invalid-registration-token' || 
            errCode === 'messaging/registration-token-not-registered') {
          failedTokens.push(tokens[idx]);
        }
      }
    });
    
    if (failedTokens.length > 0) {
      await cleanupStaleTokens(userId, failedTokens);
    }
    
    return { success: response.successCount, failure: response.failureCount };
  } catch (err) {
    console.error('Error sending multicast message:', err);
    return { success: 0, failure: tokens.length };
  }
};

export const sendPushToUser = async (userId, payload, category = 'love', saveHistory = true, coupleId = null) => {
  const user = await User.findById(userId);
  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return null;

  if (user.coupleId) {
    const settings = await Settings.findOne({ coupleId: user.coupleId });
    if (settings?.notifications) {
      if (settings.notifications.pushEnabled === false) return null;
      if (settings.notifications[category] === false) return null;
    }
  }

  const messagePayload = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      category,
      ...payload.data
    }
  };
  
  if (payload.imageUrl) {
    messagePayload.notification.imageUrl = payload.imageUrl;
    messagePayload.data.imageUrl = payload.imageUrl;
  }

  const result = await sendToTokens(userId, user.fcmTokens, messagePayload);

  if (saveHistory) {
    await Notification.create({
      title: payload.title,
      body: payload.body,
      category,
      imageUrl: payload.imageUrl || '',
      status: result.success > 0 ? 'delivered' : 'failed',
      target: user.role, // 'male' or 'female'
      sentAt: new Date(),
      coupleId: coupleId || user.coupleId,
      userId: user._id,
      data: payload.data || {}
    });
  }

  return result;
};

export const sendPushToCouple = async (coupleId, payload, category = 'love', excludeUserId = null, saveHistory = true) => {
  const users = await User.find({ coupleId });
  
  const results = [];
  for (const user of users) {
    if (excludeUserId && user._id.toString() === excludeUserId.toString()) continue;
    const result = await sendPushToUser(user._id, payload, category, saveHistory, coupleId);
    if (result) results.push(result);
  }
  
  return results;
};

export const sendPushToPartner = async (actingUserId, coupleId, payload, category = 'love', saveHistory = true) => {
  return await sendPushToCouple(coupleId, payload, category, actingUserId, saveHistory);
};
