import React from 'react';
import { Menu, Bell, Search, Sun, Moon, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../utils/api';

const AdminHeader = ({ isCollapsed, setIsCollapsed }) => {
  const [isDark, setIsDark] = React.useState(document.body.classList.contains('dark-mode'));

  const toggleTheme = async () => {
    const nextIsDark = !isDark;
    document.body.classList.toggle('dark-mode', nextIsDark);
    setIsDark(nextIsDark);
    try {
      await api.setPreferredTheme(nextIsDark ? 'dark' : 'light');
    } catch (err) {
      console.error('Failed to persist theme preference:', err);
    }
  };

  return (
    <header className="admin-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <motion.div
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ cursor: 'pointer', color: 'var(--text-sub)' }}
        >
          <Menu size={24} />
        </motion.div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--chat-bg)',
          padding: '8px 16px',
          borderRadius: '100px',
          width: '300px',
          border: '1px solid var(--border-light)'
        }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            placeholder="Search anything..."
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '14px',
              width: '100%',
              color: 'var(--text-main)'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <motion.div
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          style={{ cursor: 'pointer', color: 'var(--text-sub)' }}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </motion.div>

        <div style={{ position: 'relative', cursor: 'pointer', color: 'var(--text-sub)' }}>
          <Bell size={20} />
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#FF5252',
            border: '2px solid var(--header-bg)'
          }} />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingLeft: '24px',
          borderLeft: '1px solid var(--border-light)'
        }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', fontWeight: 600 }}>Harsh Panchal</p>
            <p style={{ fontSize: '12px', color: 'var(--text-sub)' }}>Admin</p>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid var(--blush-pink)'
          }}>
            <img src="https://i.pravatar.cc/100?u=Harsh" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
