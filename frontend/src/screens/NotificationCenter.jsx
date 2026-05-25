import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, Heart, Calendar, Image as ImageIcon, MessageCircle, Star, ShieldAlert } from 'lucide-react';
import api from '../utils/api';


const CATEGORY_STYLES = {
  love:      { icon: Heart,         color: '#FFB7C5' },
  events:    { icon: Calendar,      color: '#D4AF37' },
  media:     { icon: ImageIcon,     color: '#9c27b0' },
  chat:      { icon: MessageCircle, color: '#4CAF50' },
  milestones:{ icon: Star,          color: '#FF9800' },
  system:    { icon: ShieldAlert,   color: '#607D8B' },
  default:   { icon: Bell,          color: 'var(--blush-pink)' },
};

const formatTimeAgo = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 5) return 'just now';
  if (seconds < 60) return 'a few seconds ago';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return 'a minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'an hour ago';
  if (hours < 24) return `${hours} hours ago`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'a day ago';
  if (days < 30) return `${days} days ago`;
  
  const months = Math.floor(days / 30);
  if (months === 1) return 'a month ago';
  if (months < 12) return `${months} months ago`;
  
  const years = Math.floor(months / 12);
  if (years === 1) return 'a year ago';
  return `${years} years ago`;
};

const NotificationCenter = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.getMyNotifications(1);
      setNotifications(data.notifications);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id, url) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, readAt: new Date() } : n));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
    if (url) {
      navigate(url.replace(window.location.origin, ''));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      style={{ padding: '24px 20px', paddingBottom: '100px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', marginLeft: '-8px' }}
        >
          <ChevronLeft size={24} color="var(--text-main)" />
        </button>
        <h2 style={{ fontSize: '24px', color: 'var(--text-main)', marginLeft: '8px' }}>Updates</h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Bell size={48} color="var(--border-light)" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-sub)' }}>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map(notif => {
            const style = CATEGORY_STYLES[notif.category] || CATEGORY_STYLES.default;
            const Icon = style.icon;
            const isUnread = !notif.readAt;

            return (
              <motion.div
                key={notif._id}
                whileTap={{ scale: 0.98 }}
                onClick={() => markAsRead(notif._id, notif.data?.url)}
                className="premium-card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  gap: '16px',
                  position: 'relative',
                  cursor: 'pointer',
                  borderLeft: isUnread ? `4px solid ${style.color}` : 'none',
                  backgroundColor: isUnread ? 'var(--card-bg)' : 'var(--bg-main)',
                  opacity: isUnread ? 1 : 0.7
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: `${style.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={20} color={style.color} />
                </div>
                
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: isUnread ? 700 : 500, color: 'var(--text-main)', marginBottom: '4px' }}>
                    {notif.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-sub)', lineHeight: 1.4, marginBottom: '8px' }}>
                    {notif.body}
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
                    {formatTimeAgo(notif.sentAt || notif.createdAt)}
                  </span>
                </div>

                {notif.imageUrl && (
                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={notif.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default NotificationCenter;
