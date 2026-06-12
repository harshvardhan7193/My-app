import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RoutePersister = () => {
  const location = useLocation();

  useEffect(() => {
    // We only save valid user-facing routes. We don't want to trap the user
    // in a broken state, the login page, or admin pages.
    const path = location.pathname;
    
    if (
      path !== '/login' && 
      path !== '/signup' && 
      !path.startsWith('/admin')
    ) {
      try {
        localStorage.setItem('lastRoute', path);
        localStorage.setItem('lastRouteTime', Date.now().toString());
      } catch {
        // Ignore localStorage errors (e.g. quota exceeded or incognito mode)
      }
    }
  }, [location.pathname]);

  return null;
};

export default RoutePersister;
