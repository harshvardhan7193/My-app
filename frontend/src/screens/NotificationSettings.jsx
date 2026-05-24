import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, Heart, Calendar, Image as ImageIcon, MessageCircle, Star, ShieldAlert } from 'lucide-react';
import api from '../utils/api';
import { useNotifications } from '../hooks/useNotifications';

const Toggle = ({ checked, onChange, disabled }) => (
  <div 
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: '44px',
      height: '24px',
      borderRadius: '12px',
      backgroundColor: checked ? 'var(--blush-pink)' : 'var(--border-light)',
      position: 'relative',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background-color 0.3s',
      opacity: disabled ? 0.5 : 1
    }}
  >
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
      style={{
        width: '20px',
        height: '20px',
        borderRadius: '10px',
        backgroundColor: 'white',
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    />
  </div>
);

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { permissionState, requestPermission } = useNotifications(true);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    pushEnabled: false,
    memories: true,
    stories: true,
    events: true,
    milestones: true,
    chat: true,
    adminBroadcasts: true
  });

  useEffect(() => {
    let cancelled = false;
    const fetchSettings = async () => {
      try {
        const data = await api.getSettings();
        if (!cancelled && data && data.notifications) {
          setSettings(data.notifications);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSettings();
    return () => { cancelled = true; };
  }, []);

  const handleToggle = async (key, value) => {
    if (key === 'pushEnabled' && value) {
      if (permissionState !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          alert('Please enable notifications in your browser settings.');
          return;
        }
      }
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await api.updateSettings({ notifications: newSettings });
    } catch (err) {
      console.error('Failed to update settings:', err);
      // Revert on fail
      setSettings(settings);
    }
  };

  const SETTINGS_ITEMS = [
    { key: 'chat', label: 'Chat Messages', icon: MessageCircle, color: '#4CAF50', desc: 'Direct messages from your partner' },
    { key: 'memories', label: 'New Memories', icon: ImageIcon, color: '#9c27b0', desc: 'When your partner uploads a photo' },
    { key: 'stories', label: 'Stories', icon: Heart, color: '#FFB7C5', desc: 'When your partner posts a story' },
    { key: 'events', label: 'Calendar Events', icon: Calendar, color: '#D4AF37', desc: 'Reminders for upcoming dates' },
    { key: 'milestones', label: 'Milestones', icon: Star, color: '#FF9800', desc: 'Celebrations and anniversaries' },
    { key: 'adminBroadcasts', label: 'System Announcements', icon: ShieldAlert, color: '#607D8B', desc: 'Important app updates' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      style={{ padding: '24px 20px', paddingBottom: '100px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', marginLeft: '-8px' }}
        >
          <ChevronLeft size={24} color="var(--text-main)" />
        </button>
        <h2 style={{ fontSize: '24px', color: 'var(--text-main)', marginLeft: '8px' }}>Notifications</h2>
      </div>

      <div className="premium-card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Push Notifications</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>Enable notifications on this device</p>
        </div>
        <Toggle 
          checked={settings.pushEnabled && permissionState === 'granted'} 
          onChange={(v) => handleToggle('pushEnabled', v)} 
        />
      </div>

      {settings.pushEnabled && permissionState === 'granted' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', margin: '8px 0 4px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Preferences
          </h3>
          
          {SETTINGS_ITEMS.map((item) => (
            <div key={item.key} className="premium-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: `${item.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <item.icon size={20} color={item.color} />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-main)', marginBottom: '2px' }}>{item.label}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{item.desc}</p>
                </div>
              </div>
              <Toggle 
                checked={settings[item.key]} 
                onChange={(v) => handleToggle(item.key, v)} 
              />
            </div>
          ))}
        </motion.div>
      )}

      {(!settings.pushEnabled || permissionState !== 'granted') && !loading && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Bell size={48} color="var(--border-light)" style={{ marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-sub)', fontSize: '14px', lineHeight: 1.5 }}>
            Push notifications are disabled. Turn them on to stay connected with your partner's updates.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default NotificationSettings;
