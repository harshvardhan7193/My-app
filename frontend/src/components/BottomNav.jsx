import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Image, MessageSquare, Calendar as CalendarIcon, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { subscribeMessages } from '../config/firebase';
import api from '../utils/api';

const BottomNav = () => {
  const location = useLocation();
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    let active = true;
    let unsub = null;

    const init = async () => {
      let coupleId = null;
      let myId = null;

      // Try local storage 'user' or 'currentUser' first
      const savedUser = localStorage.getItem('user') || localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          coupleId = parsed.coupleId;
          myId = parsed._id || parsed.id;
        } catch (e) {
          // ignore
        }
      }

      // If missing, fetch from API
      if (!coupleId || !myId) {
        try {
          const me = await api.getMe();
          if (me) {
            coupleId = me.coupleId;
            myId = me._id;
          }
        } catch (e) {
          console.error('[BottomNav] Failed to fetch current user profile:', e);
        }
      }

      if (!coupleId || !myId || !active) return;

      unsub = subscribeMessages(
        coupleId,
        (messages) => {
          if (!active) return;
          // Count unread messages sent by the partner
          const count = messages.filter(msg => msg.sender !== String(myId) && msg.status !== 'read').length;
          setUnreadChatCount(count);
        },
        50
      );
    };

    init();

    return () => {
      active = false;
      if (unsub) unsub();
    };
  }, []);
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    {
      // Memories section — defaults to /albums, but stays highlighted on the
      // sibling Memories tab and on individual album/photo deep links.
      path: '/albums',
      icon: Image,
      label: 'Memories',
      matches: (p) =>
        p === '/albums' ||
        p === '/gallery' ||
        p.startsWith('/album/') ||
        p.startsWith('/gallery/'),
    },
    { path: '/calendar', icon: CalendarIcon, label: 'Planner' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/profile', icon: User, label: 'You' },
  ];

  return (
    <nav className="glass-nav" style={{
      position: 'fixed',
      bottom: 'calc(4px + var(--app-pad-bottom, 0px))',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - clamp(24px, 6vw, 40px))',
      maxWidth: 'min(390px, calc(var(--aura-vw, 100vw) - 24px))',
      height: '72px',
      borderRadius: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 12px',
      zIndex: 100,
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
    }}>
      {navItems.map((item) => {
        const customActive = item.matches ? item.matches(location.pathname) : null;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => {
              const active = customActive ?? isActive;
              return {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textDecoration: 'none',
                color: active ? 'var(--blush-pink)' : 'var(--text-muted)',
                transition: 'color 0.3s ease',
              };
            }}
          >
            {({ isActive }) => {
              const active = customActive ?? isActive;
              return (
                <>
                  <div style={{ position: 'relative' }}>
                    <item.icon
                      size={24}
                      strokeWidth={active ? 2.5 : 2}
                      style={{ marginBottom: '4px' }}
                    />
                    {item.path === '/chat' && unreadChatCount > 0 && (
                      <motion.div
                        key={unreadChatCount}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: [1.3, 0.9, 1], opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-10px',
                          minWidth: '18px',
                          height: '18px',
                          borderRadius: '9px',
                          backgroundColor: '#ff4d62',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                          border: '2px solid var(--card-bg)',
                          boxShadow: '0 2px 8px rgba(255, 77, 98, 0.35)'
                        }}
                      >
                        {unreadChatCount}
                      </motion.div>
                    )}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400, fontFamily: 'var(--font-main)' }}>
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="active-nav"
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--blush-pink)',
                      }}
                    />
                  )}
                </>
              );
            }}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNav;
