import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import NotificationToast from './NotificationToast';
import { onForegroundMessage } from '../config/firebase';

const NotificationContext = createContext(null);

export const useNotificationToast = () => useContext(NotificationContext);

export const NotificationToastProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((notification) => {
    // Disabled per user request to remove all toasts
    // const id = Date.now().toString() + Math.random().toString();
    // setNotifications((prev) => [...prev, { id, ...notification }]);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Listen to Firebase foreground messages
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Foreground message received:', payload);
      const { title, body, image } = payload.notification || {};
      const { url, category } = payload.data || {};
      
      showNotification({
        title: title || 'Aura',
        body: body || 'You have a new notification',
        image: image || payload.data?.imageUrl,
        url,
        category: category || 'default'
      });
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: 'calc(100% - 40px)',
          maxWidth: '360px',
          pointerEvents: 'none', // Lets clicks pass through the container
        }}
      >
        <AnimatePresence>
          {notifications.map((n) => (
            <NotificationToast
              key={n.id}
              notification={n}
              onDismiss={() => dismissNotification(n.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};
