import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus, Bell, Settings as SettingsIcon, Play, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useOnlineStatus from '../hooks/useOnlineStatus';
import dashboardHero from '../assets/images/dashboard_hero.png';
import StoriesAndHighlights from '../components/StoriesAndHighlights';

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const readStoredPartner = () => {
  try {
    const raw = localStorage.getItem('partner');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [partnerUser, setPartnerUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [memories, setMemories] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Parallel requests
        const [me, partner, coupleSettings, memoriesData, unreadData] = await Promise.all([
          api.getMe(),
          api.getPartner().catch(() => null),
          api.getSettings(),
          api.getMemories(),
          api.getUnreadNotificationCount().catch(() => ({ count: 0 }))
        ]);

        setCurrentUser(me);
        setPartnerUser(partner);
        setSettings(coupleSettings);
        const fetchedMemories = memoriesData.memories || memoriesData || [];
        setMemories([...fetchedMemories].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setUnreadCount(unreadData?.count || 0);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (!online) {
          setCurrentUser((prev) => prev || readStoredUser());
          setPartnerUser((prev) => prev || readStoredPartner());
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [online]);

  const moods = [
    { emoji: '🥰', label: 'Loved' },
    { emoji: '😊', label: 'Happy' },
    { emoji: '🥺', label: 'Missing You' },
    { emoji: '😴', label: 'Sleepy' },
    { emoji: '🥳', label: 'Excited' },
    { emoji: '☕', label: 'Cozy' }
  ];

  const handleSelectMood = async (m) => {
    if (!online) return;
    const moodStr = `${m.label} ${m.emoji}`;
    try {
      const updated = await api.updateMe({ mood: moodStr });
      setCurrentUser(updated);
      setShowMoodPicker(false);
    } catch (err) {
      console.error('Error updating mood:', err);
    }
  };

  // Compute anniversary stats
  const getAnniversaryStats = () => {
    if (!settings || !settings.anniversaryDate) {
      return { daysTogether: 0, daysUntilNext: 0 };
    }

    const annivDate = new Date(settings.anniversaryDate);
    const today = new Date();

    // Days Together
    const diffMs = today - annivDate;
    const daysTogether = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    // Days Until Next
    const nextAnniv = new Date(today.getFullYear(), annivDate.getMonth(), annivDate.getDate());
    if (nextAnniv < today) {
      nextAnniv.setFullYear(today.getFullYear() + 1);
    }
    const diffNextMs = nextAnniv - today;
    const daysUntilNext = Math.max(0, Math.ceil(diffNextMs / (1000 * 60 * 60 * 24)));

    return { daysTogether, daysUntilNext };
  };

  const { daysTogether, daysUntilNext } = getAnniversaryStats();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
        Loading dashboard...
      </div>
    );
  }

  const heroMemory = memories.length > 0 ? memories[0] : null;
  const recentMemories = memories.slice(1, 6);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ padding: '24px 20px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Welcome back,</p>
          <h2 style={{ fontSize: '24px' }}>
            {currentUser?.name?.split(' ')[0]} & {partnerUser?.name?.split(' ')[0] || 'Partner'}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <motion.div
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/profile')}
            className="premium-card"
            style={{ padding: '10px', borderRadius: '14px', cursor: 'pointer' }}
          >
            <SettingsIcon size={20} color="var(--text-secondary)" />
          </motion.div>
        </div>
      </div>



      {/* Hero Memory Card */}
      {heroMemory ? (
        <motion.div
          variants={itemVariants}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/memory/${heroMemory._id}`)}
          className="premium-card"
          style={{
            padding: 0,
            height: '380px',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '32px',
            borderRadius: '32px',
            cursor: 'pointer'
          }}
        >
          <img src={heroMemory.img || dashboardHero} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '24px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
            color: 'white'
          }}>
            <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px' }}>
              {new Date(heroMemory.date).toLocaleDateString()}
            </p>
            <h3 style={{ fontSize: '24px', marginBottom: '4px' }}>{heroMemory.title}</h3>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>{heroMemory.description}</p>
          </div>
          {heroMemory.favorite && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              padding: '8px 16px',
              borderRadius: '100px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600
            }}>
              Favorite ❤️
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={itemVariants}
          onClick={() => navigate('/gallery')}
          className="premium-card"
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            marginBottom: '32px',
            borderRadius: '32px',
            cursor: 'pointer',
            border: '2px dashed var(--dusty-rose)'
          }}
        >
          <p style={{ fontSize: '16px', color: 'var(--text-sub)' }}>Capture your first memory together!</p>
          <span style={{ color: 'var(--blush-pink)', fontSize: '13px', fontWeight: 600 }}>+ Add Photo</span>
        </motion.div>
      )}

      {/* Anniversary Counter */}
      <motion.div variants={itemVariants} style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/timeline')}
          className="premium-card"
          style={{
            flex: 1,
            background: 'var(--card-accent-pink)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            cursor: 'pointer',
            border: 'none'
          }}
        >
          <Heart size={24} color="var(--blush-pink)" fill="var(--blush-pink)" style={{ marginBottom: '12px' }} />
          <h4 style={{ fontSize: '28px', color: 'var(--text-main)' }}>{daysTogether}</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days Together</p>
        </motion.div>
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/calendar')}
          className="premium-card" style={{
            flex: 1,
            background: 'var(--card-accent-purple)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            cursor: 'pointer',
            border: 'none'
          }}
        >
          <div style={{ fontSize: '28px', color: 'var(--text-main)', marginBottom: '4px' }}>{daysUntilNext}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Days until <br />Anniversary</p>
        </motion.div>
      </motion.div>

      {/* Stories and Highlights (Instagram Style) */}
      <motion.div variants={itemVariants}>
        <StoriesAndHighlights
          currentUser={currentUser}
          partnerUser={partnerUser}
        />
      </motion.div>

      {/* Mood Moments Section */}
      <motion.div variants={itemVariants} style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Mood Moments</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="premium-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', background: 'var(--chat-bg)', border: 'none' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '24px', overflow: 'hidden', marginBottom: '8px' }}>
              <img src={partnerUser?.avatar || 'https://i.pravatar.cc/200?u=Neha'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Partner Avatar" />
            </div>
            <p style={{ fontSize: '10px', color: 'var(--text-sub)', marginBottom: '4px' }}>{partnerUser?.name?.split(' ')[0] || 'Partner'} is</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              {partnerUser?.mood || 'Checking in...'}
            </p>
          </div>
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowMoodPicker(true)}
            className="premium-card"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px',
              background: 'var(--card-bg)',
              border: '2px dashed var(--dusty-rose)',
              cursor: 'pointer'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: 'var(--chat-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              <Plus size={24} color="var(--dusty-rose)" />
            </div>
            <p style={{ fontSize: '10px', color: 'var(--text-sub)', marginBottom: '4px' }}>You are</p>
            <p style={{ fontSize: '15px', fontWeight: 600, color: currentUser?.mood ? 'var(--text-main)' : 'var(--text-sub)' }}>
              {currentUser?.mood || 'Check in...'}
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Recent Memories Section */}
      {recentMemories.length > 0 && (
        <motion.div variants={itemVariants}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '20px' }}>Recent Memories</h3>
            <p onClick={() => navigate('/gallery')} style={{ color: 'var(--blush-pink)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>See all</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '10px' }} className="hide-scrollbar">
            {recentMemories.map((m) => (
              <motion.div
                key={m._id}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/memory/${m._id}`)}
                style={{ minWidth: '140px', cursor: 'pointer' }}
              >
                <div style={{ width: '140px', height: '180px', borderRadius: '24px', backgroundColor: '#eee', marginBottom: '12px', overflow: 'hidden' }}>
                  <img src={m.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <p style={{ fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(m.date).toLocaleDateString()}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}


      {/* Modals */}
      <AnimatePresence>
        {showMoodPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}
          >
            <div
              style={{ position: 'absolute', inset: 0 }}
              onClick={() => setShowMoodPicker(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              style={{ width: '100%', background: 'var(--menu-bg)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '32px 24px 60px 24px', position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', color: 'var(--text-main)' }}>How are you feeling?</h3>
                <X onClick={() => setShowMoodPicker(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {moods.map((m) => (
                  <motion.div
                    key={m.label}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSelectMood(m)}
                    style={{
                      padding: '16px',
                      borderRadius: '20px',
                      background: 'var(--chat-bg)',
                      textAlign: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{m.emoji}</span>
                    <p style={{ fontSize: '12px', marginTop: '8px', fontWeight: 500, color: 'var(--text-main)' }}>{m.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}
          >
            <div
              style={{ position: 'absolute', inset: 0 }}
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              style={{ width: '100%', background: 'var(--menu-bg)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '32px 24px 60px 24px', position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', color: 'var(--text-main)' }}>New Memory</h3>
                <X onClick={() => setShowAddModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={() => { setShowAddModal(false); navigate('/gallery'); }} className="btn-primary" style={{ width: '100%', backgroundColor: 'var(--chat-bg)', color: 'var(--text-main)', border: 'none' }}>Upload Photo</button>
                <button onClick={() => { setShowAddModal(false); navigate('/gallery'); }} className="btn-primary" style={{ width: '100%', border: 'none' }}>Write a Note</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;
