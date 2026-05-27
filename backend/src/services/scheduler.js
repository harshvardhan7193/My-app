import cron from 'node-cron';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import { sendPushToUser } from './notificationService.js';

let task;

export const startScheduler = () => {
  console.log('✅ Background scheduler started');
  // Run every minute
  task = cron.schedule('* * * * *', async () => {
    try {
      // 1. Process scheduled notifications
      const pendingNotifications = await Notification.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() }
      });

      if (pendingNotifications.length > 0) {
        console.log(`Processing ${pendingNotifications.length} scheduled notifications...`);
      }

      for (const notification of pendingNotifications) {
        let totalSuccess = 0;

        const filter = { coupleId: notification.coupleId };
        if (notification.target === 'male') filter.role = 'male';
        if (notification.target === 'female') filter.role = 'female';

        const users = await User.find(filter);
        
        for (const user of users) {
          const result = await sendPushToUser(
            user._id, 
            { 
              title: notification.title, 
              body: notification.body, 
              imageUrl: notification.imageUrl 
            }, 
            notification.category, 
            false, 
            notification.coupleId
          );
          if (result) totalSuccess += result.success;
        }

        notification.status = totalSuccess > 0 ? 'delivered' : 'failed';
        notification.sentAt = new Date();
        await notification.save();
      }

      // 2. Check user presence: mark offline if inactive for >5 mins
      try {
        const threshold = new Date(Date.now() - 5 * 60 * 1000);
        await User.updateMany(
          { isOnline: true, lastSeen: { $lt: threshold } },
          { $set: { isOnline: false } }
        );
      } catch (err) {
        console.error('Error in presence updater scheduler task:', err);
      }

      // 3. Prune old activity logs (>30 days)
      try {
        const pruneThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const deleteResult = await ActivityLog.deleteMany({ createdAt: { $lt: pruneThreshold } });
        if (deleteResult.deletedCount > 0) {
          console.log(`🧹 Cleaned up ${deleteResult.deletedCount} activity logs older than 30 days`);
        }
      } catch (err) {
        console.error('Error in activity pruning scheduler task:', err);
      }
    } catch (err) {
      console.error('Error in scheduled notifications task:', err);
    }
  });
};

export const stopScheduler = () => {
  if (task) {
    task.stop();
    console.log('🛑 Background scheduler stopped');
  }
};
