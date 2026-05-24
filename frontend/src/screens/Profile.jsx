import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Settings, Shield, Bell, Palette, LogOut, ChevronRight, Heart, Edit2 } from 'lucide-react';
import api from '../utils/api';

const Profile = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(document.body.classList.contains('dark-mode'));

  // Local fallback for instant render, then hydrated with real data below
  const cachedUser = React.useMemo(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return {
      role: 'male',
      name: 'Harsh Panchal',
      partnerName: 'Neha Panchal',
      avatar: 'https://i.pravatar.cc/200?u=Harsh',
      partnerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop',
    };
  }, []);

  const [me, setMe] = useState(null);
  const [partner, setPartner] = useState(null);
  const [stats, setStats] = useState({ memoriesCount: null, albumsCount: null, daysTogether: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dash = await api.getDashboard();
        if (cancelled) return;
        setStats({
          memoriesCount: dash.memoriesCount ?? 0,
          albumsCount: dash.albumsCount ?? 0,
          daysTogether: dash.daysTogether ?? 0,
        });
        setPartner(dash.partner || null);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      }
      try {
        const meData = await api.getMe();
        if (!cancelled) {
          setMe(meData);
          const shouldBeDark = meData?.preferredTheme === 'dark' || (meData?.preferredTheme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
          document.body.classList.toggle('dark-mode', !!shouldBeDark);
          setIsDark(!!shouldBeDark);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Resolve display values (real data → cached → seed defaults)
  const user = {
    name: me?.name || cachedUser.name,
    avatar: me?.avatar || cachedUser.avatar,
    partnerName: partner?.name || cachedUser.partnerName,
  };

  // Pretty "3.4y" style label from total days together
  const formatYears = (days) => {
    if (days == null) return '—';
    if (days < 365) return `${days}d`;
    return `${(days / 365).toFixed(1)}y`;
  };

  const handleSignOut = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    navigate('/login');
  };

  const toggleTheme = async () => {
    const nextIsDark = !isDark;
    document.body.classList.toggle('dark-mode', nextIsDark);
    setIsDark(nextIsDark);
    try {
      await api.setPreferredTheme(nextIsDark ? 'dark' : 'light');
      setMe((prev) => prev ? { ...prev, preferredTheme: nextIsDark ? 'dark' : 'light' } : prev);
    } catch (err) {
      console.error('Failed to persist theme preference:', err);
    }
  };

  const menuItems = [
    { icon: Edit2, label: 'Edit Profile', color: '#D3E4F4', onClick: () => navigate('/edit-profile') },
    { icon: Palette, label: 'Theme Personalization', color: '#F4D3D3', onClick: toggleTheme },
    { icon: Bell, label: 'Notification Settings', color: '#EBE8F3', onClick: () => navigate('/notification-settings') },
    { icon: Shield, label: 'Privacy & Security', color: '#FFF5F2' },
    { icon: Settings, label: 'Account Preferences', color: '#FFF5F2' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '24px 20px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 20px auto' }}>
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '60px',
            overflow: 'hidden',
            border: '4px solid var(--card-bg)',
            boxShadow: 'var(--shadow-medium)'
          }}>
            <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
          </div>
          <div style={{
            position: 'absolute',
            bottom: '5px',
            right: '5px',
            width: '32px',
            height: '32px',
            borderRadius: '16px',
            backgroundColor: 'var(--blush-pink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--card-bg)',
            color: 'white'
          }}>
            <Heart size={16} fill="white" />
          </div>
        </div>
        <h2 style={{ fontSize: '24px', color: 'var(--text-main)' }}>{user.name}</h2>
        <p style={{ color: 'var(--text-sub)', fontSize: '14px' }}>Connected with <span style={{ color: 'var(--blush-pink)', fontWeight: 600 }}>{(user.partnerName || 'Partner').split(' ')[0]}</span></p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
        <div className="premium-card" style={{ flex: 1, textAlign: 'center', padding: '16px' }}>
          <h4 style={{ fontSize: '20px', color: 'var(--text-main)' }}>{stats.memoriesCount ?? '—'}</h4>
          <p style={{ fontSize: '11px', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Memories</p>
        </div>
        <div className="premium-card" style={{ flex: 1, textAlign: 'center', padding: '16px' }}>
          <h4 style={{ fontSize: '20px', color: 'var(--text-main)' }}>{stats.albumsCount ?? '—'}</h4>
          <p style={{ fontSize: '11px', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Albums</p>
        </div>
        <div className="premium-card" style={{ flex: 1, textAlign: 'center', padding: '16px' }}>
          <h4 style={{ fontSize: '20px', color: 'var(--text-main)' }}>{formatYears(stats.daysTogether)}</h4>
          <p style={{ fontSize: '11px', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Together</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {menuItems.map((item, index) => (
          <motion.div
            key={item.label}
            whileTap={{ scale: 0.98 }}
            onClick={item.onClick}
            className="premium-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              cursor: item.onClick ? 'pointer' : 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: item.color === '#F4D3D3' ? 'var(--card-accent-pink)' : (item.color === '#EBE8F3' ? 'var(--card-accent-purple)' : 'var(--chat-bg)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <item.icon size={20} color="var(--text-main)" />
              </div>
              <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-main)' }}>{item.label}</span>
            </div>
            <ChevronRight size={18} color="var(--text-sub)" />
          </motion.div>
        ))}

        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={handleSignOut}
          className="premium-card"
          style={{
            marginTop: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 20px',
            backgroundColor: 'rgba(255, 77, 77, 0.1)',
            border: '1px solid rgba(255,77,77,0.2)',
            cursor: 'pointer'
          }}
        >
          <LogOut size={20} color="#FF4D4D" />
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#FF4D4D' }}>Sign Out</span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Profile;
