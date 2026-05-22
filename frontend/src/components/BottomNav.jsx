import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Image, MessageSquare, Calendar as CalendarIcon, User } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNav = () => {
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/gallery', icon: Image, label: 'Memories' },
    { path: '/calendar', icon: CalendarIcon, label: 'Planner' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/profile', icon: User, label: 'You' },
  ];

  return (
    <nav className="glass-nav" style={{
      position: 'fixed',
      bottom: '24px',
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
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textDecoration: 'none',
            color: isActive ? 'var(--blush-pink)' : 'var(--text-muted)',
            transition: 'color 0.3s ease'
          })}
        >
          {({ isActive }) => (
            <>
              <item.icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2}
                style={{ marginBottom: '4px' }}
              />
              <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400, fontFamily: 'var(--font-main)' }}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--blush-pink)'
                  }}
                />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
