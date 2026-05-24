import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, Calendar, Image as ImageIcon, MessageCircle, Gift, Star, X } from 'lucide-react';

const CATEGORY_STYLES = {
  love:      { icon: Heart,         color: '#FFB7C5' },
  reminder:  { icon: Calendar,      color: '#D4AF37' },
  media:     { icon: ImageIcon,     color: '#9c27b0' },
  message:   { icon: MessageCircle, color: '#4CAF50' },
  surprise:  { icon: Gift,          color: '#FF5252' },
  milestone: { icon: Star,          color: '#FF9800' },
  default:   { icon: Bell,          color: 'var(--blush-pink)' },
};

const NotificationToast = ({ notification, onDismiss }) => {
  const navigate = useNavigate();
  const { title, body, image, url, category } = notification;
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.default;
  const Icon = style.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleClick = () => {
    onDismiss();
    if (url) {
      navigate(url.replace(window.location.origin, ''));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '360px',
        background: 'var(--card-bg)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border-light)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        pointerEvents: 'auto',
      }}
      onClick={handleClick}
    >
      {image && (
        <div style={{ width: '100%', height: '120px', overflow: 'hidden' }}>
          <img src={image} alt="notification" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: `${style.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={14} color={style.color} />
            </div>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>Aura</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={14} />
          </button>
        </div>
        
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', lineHeight: 1.3 }}>{title}</p>
        <p style={{ fontSize: '13px', color: 'var(--text-sub)', lineHeight: 1.4, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{body}</p>
      </div>

      <motion.div 
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 5, ease: 'linear' }}
        style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', background: style.color }}
      />
    </motion.div>
  );
};

export default NotificationToast;
