import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Palette, LogOut, ChevronRight, Heart, Edit2, Send, Lock, X } from 'lucide-react';
import api from '../utils/api';
import useFetchMe from '../hooks/useFetchMe';

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

  const { me, setMe } = useFetchMe();
  const [partner, setPartner] = useState(null);
  const [stats, setStats] = useState({ memoriesCount: null, albumsCount: null, daysTogether: null });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (!me?.preferredTheme) return;
    const shouldBeDark =
      me.preferredTheme === 'dark'
      || (me.preferredTheme === 'system'
        && window.matchMedia
        && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.classList.toggle('dark-mode', !!shouldBeDark);
    setIsDark(!!shouldBeDark);
  }, [me?.preferredTheme]);

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
    try {
      await api.logout();
    } catch { /* ignore */ }
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

  const handleSendNotification = async () => {
    try {
      await api.sendNudge();
    } catch (err) {
      console.error('Failed to send nudge:', err);
    }
  };

  const openPasswordModal = () => {
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordError('');
    setPasswordSuccess('');
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordError('Please fill in all fields.');
      return;
    }
    if (passwordForm.next.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.current === passwordForm.next) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    try {
      setPasswordSaving(true);
      await api.changePassword(passwordForm.current, passwordForm.next);
      setPasswordSuccess('Password updated successfully.');
      setPasswordForm({ current: '', next: '', confirm: '' });
      setTimeout(closePasswordModal, 1200);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const menuItems = [
    { icon: Edit2, label: 'Edit Profile', color: '#D3E4F4', onClick: () => navigate('/edit-profile') },
    { icon: Lock, label: 'Change Password', color: '#EBE8F3', onClick: openPasswordModal },
    { icon: Palette, label: 'Theme Personalization', color: '#F4D3D3', onClick: toggleTheme },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '24px 20px', position: 'relative' }}
    >
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleSendNotification}
        style={{
          position: 'absolute',
          top: '24px',
          right: '20px',
          width: '44px',
          height: '44px',
          borderRadius: '22px',
          backgroundColor: 'var(--blush-pink)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: 'var(--shadow-small)',
          cursor: 'pointer',
          zIndex: 10
        }}
        aria-label="Send push notification"
      >
        <Send size={20} />
      </motion.button>

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

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePasswordModal}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              zIndex: 3000,
              display: 'flex',
              alignItems: 'flex-end',
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="premium-card"
              style={{
                width: '100%',
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                padding: '28px 24px calc(28px + env(safe-area-inset-bottom))',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '20px', color: 'var(--text-main)' }}>Change Password</h3>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', padding: '4px' }}
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
              </div>
              <p style={{ color: 'var(--text-sub)', fontSize: '14px', marginBottom: '20px' }}>
                Enter your current password, then choose a new one (at least 6 characters).
              </p>

              {[
                { key: 'current', label: 'Current password', autoComplete: 'current-password' },
                { key: 'next', label: 'New password', autoComplete: 'new-password' },
                { key: 'confirm', label: 'Confirm new password', autoComplete: 'new-password' },
              ].map((field) => (
                <div key={field.key} style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>
                    {field.label}
                  </label>
                  <input
                    type="password"
                    autoComplete={field.autoComplete}
                    value={passwordForm[field.key]}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--chat-bg)',
                      fontSize: '15px',
                      color: 'var(--text-main)',
                      outline: 'none',
                      fontFamily: 'var(--font-main)',
                    }}
                  />
                </div>
              ))}

              {passwordError && (
                <p style={{ color: '#FF4D4D', fontSize: '13px', marginBottom: '12px' }}>{passwordError}</p>
              )}
              {passwordSuccess && (
                <p style={{ color: '#4CAF50', fontSize: '13px', marginBottom: '12px' }}>{passwordSuccess}</p>
              )}

              <button
                type="button"
                onClick={handleChangePassword}
                disabled={passwordSaving}
                className="btn-primary"
                style={{ width: '100%', border: 'none', marginTop: '4px' }}
              >
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Profile;
