import { useEffect, useState, useRef } from 'react';
import { requestNotificationPermission, messaging, onForegroundMessage } from '../config/firebase';
import api from '../utils/api';

export const useNotifications = (isAuthenticated) => {
  const [permissionState, setPermissionState] = useState(
    'Notification' in window ? Notification.permission : 'default'
  );
  const [fcmToken, setFcmToken] = useState(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !messaging || registeredRef.current) return;

    const initPush = async () => {
      try {
        const token = await requestNotificationPermission();
        if (token) {
          setFcmToken(token);
          localStorage.setItem('fcmToken', token);
          setPermissionState('granted');
          await api.registerFcmToken(token);
          registeredRef.current = true;
          console.log('FCM token registered with backend.');
        } else {
          setPermissionState(Notification.permission);
        }
      } catch (err) {
        console.error('Error during FCM registration:', err);
      }
    };

    // If permission is already granted, auto-initialize on boot
    if (Notification.permission === 'granted') {
      initPush();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Received foreground message:', payload);
      
      const isChatUrl = payload.data?.url === '/chat';
      const isOnChatPage = window.location.pathname === '/chat';
      if (isOnChatPage && isChatUrl) {
        return;
      }

      if (Notification.permission === 'granted' && payload.notification) {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: payload.notification.image || '/favicon.svg'
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const requestPermission = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setFcmToken(token);
        localStorage.setItem('fcmToken', token);
        setPermissionState('granted');
        await api.registerFcmToken(token);
        registeredRef.current = true;
        return true;
      } else {
        setPermissionState(Notification.permission);
        return false;
      }
    } catch (err) {
      console.error('Error requesting permission:', err);
      return false;
    }
  };

  const deregister = async () => {
    if (fcmToken) {
      try {
        await api.deregisterFcmToken(fcmToken);
      } catch (err) {
        console.error('Failed to deregister FCM token:', err);
      }
      setFcmToken(null);
      localStorage.removeItem('fcmToken');
      registeredRef.current = false;
    }
  };

  return { permissionState, fcmToken, requestPermission, deregister };
};
