import { useEffect, useState, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import api from './utils/api';
import { NotificationToastProvider } from './components/NotificationToastProvider';
import { useNotifications } from './hooks/useNotifications';
import { useLocationTracker } from './hooks/useLocationTracker';
import Dashboard from './screens/Dashboard';
import Gallery from './screens/Gallery';
import Chat from './screens/Chat';
import Timeline from './screens/Timeline';
import Profile from './screens/Profile';
import EditProfile from './screens/EditProfile';
import MemoryDetail from './screens/MemoryDetail';
import SpecialMoments from './screens/SpecialMoments';
import Login from './screens/Login';
import Albums from './screens/Albums';
import MemoryRecap from './screens/MemoryRecap';
import Calendar from './screens/Calendar';
import PartnerProfile from './screens/PartnerProfile';
import AlbumDetail from './screens/AlbumDetail';
import PhotoView from './screens/PhotoView';
import ChatMedia from './screens/ChatMedia';
import NotificationSettings from './screens/NotificationSettings';
import NotificationCenter from './screens/NotificationCenter';
import BottomNav from './components/BottomNav';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/screens/AdminDashboard';
import UserManagement from './admin/screens/UserManagement';
import MemoriesManager from './admin/screens/MemoriesManager';
import AlbumsManager from './admin/screens/AlbumsManager';
import ChatManager from './admin/screens/ChatManager';
import CalendarManager from './admin/screens/CalendarManager';
import TimelineManager from './admin/screens/TimelineManager';
import MomentsManager from './admin/screens/MomentsManager';
import AdminSettings from './admin/screens/AdminSettings';
import AlbumDetailAdmin from './admin/screens/AlbumDetailAdmin';
import ActivityMonitor from './admin/screens/ActivityMonitor';
import NotificationsManager from './admin/screens/NotificationsManager';
import AdminLogin from './admin/screens/AdminLogin';
import './index.css';

// Catches any uncaught render error anywhere below it and shows a fallback
// instead of unmounting the whole tree (which would leave the WebView showing
// a blank #root — the "blank white screen on second launch" symptom).
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // Surfaced to adb logcat via the WebView's onConsoleMessage bridge so we
    // can diagnose the actual crash from the native shell.
    console.error('[aura-error-boundary]', error?.message || String(error),
      info?.componentStack || '');
  }
  reset = () => {
    this.setState({ hasError: false, error: null });
    try { window.location.replace('/'); } catch { /* noop */ }
  };
  render() {
    if (!this.state.hasError) return this.props.children;
    const msg = this.state.error?.message || 'Something went wrong.';
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        backgroundColor: 'var(--warm-white, #FFFAF8)',
        color: 'var(--text-primary, #332D2D)',
        fontFamily: 'var(--font-body, Inter, sans-serif)'
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Something went wrong</h2>
        <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '20px', maxWidth: 320 }}>
          {msg}
        </p>
        <button
          onClick={this.reset}
          style={{
            background: 'linear-gradient(135deg, #F4D3D3, #FFB7C5)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '100px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}

const resolveShouldUseDark = (theme = 'light') => {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return theme === 'dark' || (theme === 'system' && prefersDark);
};

const applyTheme = (theme = 'light') => {
  document.body.classList.toggle('dark-mode', resolveShouldUseDark(theme));
};

const App = () => {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [preferredTheme, setPreferredTheme] = useState('light');
  
  // Call useNotifications hook. It will auto-register if permission was already granted,
  // and do nothing if not authenticated yet.
  const isAuthenticated = bootstrapped && !!api.accessToken;
  useNotifications(isAuthenticated);
  useLocationTracker(isAuthenticated);

  // Apply current theme state whenever it changes.
  useEffect(() => {
    applyTheme(preferredTheme);
  }, [preferredTheme]);

  // If user selected "system", react to OS theme changes live.
  useEffect(() => {
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const onSystemThemeChange = () => {
      if (preferredTheme === 'system') {
        applyTheme('system');
      }
    };
    media?.addEventListener?.('change', onSystemThemeChange);

    return () => {
      media?.removeEventListener?.('change', onSystemThemeChange);
    };
  }, [preferredTheme]);

  // On boot, prefer stored access token, then fallback to refresh cookie.
  useEffect(() => {
    let cancelled = false;

    const hydrateFromMe = async () => {
      const me = await api.getMe();
      if (!cancelled) setPreferredTheme(me?.preferredTheme || 'light');
    };

    const clearSession = () => {
      api.setAccessToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('currentUser');
      if (!cancelled) setPreferredTheme('light');
    };

    // The refresh-token cookie is httpOnly so we can't see it directly. We use
    // localStorage.user as a proxy for "this WebView has logged in at least
    // once" — set on api.login(), cleared on logout / refresh failure. On a
    // fresh install (first launch of the Flutter WebView, incognito tab, etc.)
    // both are empty, so we skip the /auth/refresh probe entirely and avoid a
    // pointless 401 on the very first page load.
    const hasPriorSession = !!localStorage.getItem('user');

    (async () => {
      try {
        if (api.accessToken) {
          await hydrateFromMe();
          return;
        }

        if (!hasPriorSession) {
          clearSession();
          return;
        }

        const refreshed = await api.refreshToken();
        if (!refreshed) {
          clearSession();
          return;
        }

        await hydrateFromMe();
      } catch {
        // If token path fails, attempt one silent refresh retry — but only if
        // there was evidence of a prior session to begin with.
        if (hasPriorSession) {
          try {
            const refreshed = await api.refreshToken();
            if (refreshed) {
              await hydrateFromMe();
              return;
            }
          } catch {
            // ignore
          }
        }
        clearSession();
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (!bootstrapped) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-sub, #7D7474)',
        backgroundColor: 'var(--warm-white, #FFFAF8)'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AppErrorBoundary>
    <NotificationToastProvider>
      <Router>
        <AnimatePresence mode="wait">
          <Routes>
            {/* Consumer Routes (Fixed Width Mobile Container) */}
            <Route element={<MobileContainer />}>
              {/* Public routes — accessible without auth. If a session already
                  exists, skip the login screen and go straight to the app. */}
              <Route
                path="/login"
                element={api.accessToken ? <Navigate to="/" replace /> : <Login />}
              />
              <Route path="/signup" element={<Navigate to="/login" replace />} />

              {/* Authenticated routes — RequireAuth bounces to /login when no session */}
              <Route element={<RequireAuth />}>
                <Route path="/" element={<WithNav><Dashboard /></WithNav>} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/gallery" element={<WithNav><Gallery /></WithNav>} />
                <Route path="/albums" element={<WithNav><Albums /></WithNav>} />
                <Route path="/album/:albumId" element={<AlbumDetail />} />
                <Route path="/album/:albumId/photo/:id" element={<PhotoView />} />
                <Route path="/gallery/photo/:id" element={<PhotoView />} />
                <Route path="/chat-media/photo/:id" element={<PhotoView />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/calendar" element={<WithNav><Calendar /></WithNav>} />
                <Route path="/timeline" element={<WithNav><Timeline /></WithNav>} />
                <Route path="/profile" element={<WithNav><Profile /></WithNav>} />
                <Route path="/edit-profile" element={<EditProfile />} />
                <Route path="/memory/:id" element={<MemoryDetail />} />
                <Route path="/celebration" element={<SpecialMoments />} />
                <Route path="/recap" element={<MemoryRecap />} />
                <Route path="/partner-profile" element={<PartnerProfile />} />
                <Route path="/chat-media" element={<ChatMedia />} />
                <Route path="/notification-settings" element={<NotificationSettings />} />
                <Route path="/notifications" element={<NotificationCenter />} />
              </Route>
            </Route>

            {/* Admin Routes (Full Width Desktop) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="memories" element={<MemoriesManager />} />
              <Route path="albums" element={<AlbumsManager />} />
              <Route path="albums/:albumId" element={<AlbumDetailAdmin />} />
              <Route path="chat" element={<ChatManager />} />
              <Route path="calendar" element={<CalendarManager />} />
              <Route path="timeline" element={<TimelineManager />} />
              <Route path="moments" element={<MomentsManager />} />
              <Route path="activity" element={<ActivityMonitor />} />
              <Route path="notifications" element={<NotificationsManager />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Routes>
        </AnimatePresence>
      </Router>
    </NotificationToastProvider>
    </AppErrorBoundary>
  );
};

const MobileContainer = () => (
  <div className="mobile-container">
    <Outlet />
  </div>
);

// Guards consumer routes. Without an access token we have no way to talk to the
// API, so bounce to /login instead of rendering screens that will silently 401
// and look like a blank white page (especially in the Flutter WebView wrapper
// where the very first launch starts with empty cookies + empty localStorage).
const RequireAuth = () => {
  const location = useLocation();
  if (!api.accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
};

// Guards /admin/* — only users with role === 'admin' may pass.
// Verifies against the backend so a stale localStorage value can't be spoofed.
const RequireAdmin = ({ children }) => {
  const [state, setState] = useState({ loading: true, allowed: false, authed: false });

  useEffect(() => {
    let cancelled = false;
    api.getMe()
      .then((me) => {
        if (!cancelled) {
          setState({ loading: false, allowed: me?.role === 'admin', authed: !!me });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, allowed: false, authed: false });
      });
    return () => { cancelled = true; };
  }, []);

  if (state.loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
        Loading admin space...
      </div>
    );
  }
  if (!state.authed) return <Navigate to="/admin/login" replace />;
  if (!state.allowed) return <Navigate to="/" replace />;
  return children;
};

const WithNav = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ 
      flex: 1, 
      overflowY: 'auto', 
      paddingBottom: '90px', 
      WebkitOverflowScrolling: 'touch' 
    }} className="hide-scrollbar">
      {children}
    </div>
    <BottomNav />
  </div>
);

export default App;
