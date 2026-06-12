import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Image, MessageSquare, Calendar as CalendarIcon, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { subscribeMessages } from '../config/firebase';

const BottomNav = () => {
  const location = useLocation();
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (!saved) return;
    let user;
    try { user = JSON.parse(saved); } catch { return; }
    
    if (!user?.coupleId) return;

    const unsub = subscribeMessages(
      user.coupleId,
      (messages) => {
        // Any message from the partner that isn't read
        const unread = messages.some(msg => msg.sender !== String(user._id) && msg.status !== 'read');
        setHasUnreadChat(unread);
      },
      15
    );

    return unsub;
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
      width: 'calc(100% - 40px)',
      maxWidth: '390px',
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
                    {item.path === '/chat' && hasUnreadChat && !active && (
                      <motion.div
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-4px',
                          width: '8px',
                          height: '8px',
                          backgroundColor: 'var(--blush-pink)',
                          borderRadius: '50%',
                          border: '2px solid var(--card-bg)'
                        }}
                      />
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
