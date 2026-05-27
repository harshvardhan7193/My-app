import { useEffect } from 'react';
import api from '../utils/api';

export const useLocationTracker = (isAuthenticated) => {
  useEffect(() => {
    if (!isAuthenticated) return;

    const trackLocation = () => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            await api.updateCoordinates(latitude, longitude);
          } catch (err) {
            console.error('Failed to update location coordinates:', err);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    // Initial check on mounting/login
    trackLocation();

    // Check every 2 minutes (120,000 ms)
    const interval = setInterval(trackLocation, 120_000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);
};
