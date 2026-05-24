import cron from 'node-cron';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendPushToUser } from './notificationService.js';

let task;

export const startScheduler = () => {
  console.log('✅ Background scheduler started');
  // Run every minute
  task = cron.schedule('* * * * *', async () => {
    try {
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
