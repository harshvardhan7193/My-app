import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, MapPin, Calendar, Heart, MessageSquare, Bell, Shield, LogOut, ChevronRight, X, Smartphone, Mail, Lock, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PartnerProfile = () => {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null); // 'notifications', 'privacy', 'relationship'

  const closeModal = () => setActiveModal(null);

  const partnerData = React.useMemo(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user.role === 'female') {
          return {
            name: "Harsh Panchal",
            location: "London, UK",
            birthday: "May 15, 1996",
            anniversary: "Oct 14, 2021",
            profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop"
          };
        }
      } catch (e) {
        // ignore
      }
    }
    return {
      name: "Neha Panchal",
      location: "London, UK",
      birthday: "June 12, 1998",
      anniversary: "Oct 14, 2021",
      profileImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop"
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        backgroundColor: 'var(--app-bg)',
        minHeight: '100vh',
        height: '100dvh',
        overflowY: 'auto'
      }}
      className="hide-scrollbar"
    >
      {/* Header Image & Back Button */}
      <div style={{ position: 'relative', height: '380px' }}>
        <img
          src={partnerData.profileImage}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          alt="Partner Profile"
        />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 60%, rgba(0,0,0,0.4) 100%)'
        }} />

        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            top: '24px',
            left: '20px',
            width: '44px',
            height: '44px',
            borderRadius: '22px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20
          }}
        >
          <ChevronLeft size={24} color="white" />
        </motion.div>
      </div>

      {/* Profile Content Card */}
      <div style={{
        marginTop: '-50px',
        position: 'relative',
        backgroundColor: 'var(--app-bg)',
        borderTopLeftRadius: '40px',
        borderTopRightRadius: '40px',
        padding: '32px 24px',
        zIndex: 10,
        boxShadow: '0 -20px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '32px',
            marginBottom: '4px',
            color: 'var(--text-main)',
            fontFamily: 'var(--font-main)'
          }}>
            {partnerData.name}
          </h2>
          <p style={{
            color: 'var(--text-sub)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '16px'
          }}>
            <MapPin size={16} style={{ color: 'var(--text-sub)', opacity: 0.7 }} /> {partnerData.location}
          </p>
        </div>

        {/* Milestone Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '36px' }}>
          <MilestoneCard
            icon={Calendar}
            label="Birthday"
            value={partnerData.birthday}
          />
          <MilestoneCard
            icon={Heart}
            label="Anniversary"
            value={partnerData.anniversary}
          />
        </div>

        <h3 style={{
          fontSize: '20px',
          marginBottom: '20px',
          color: 'var(--text-main)',
          fontFamily: 'var(--font-main)',
          fontWeight: 600
        }}>
          Quick Actions
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
          <ActionItem
            icon={MessageSquare}
            label="View Chat Media"
            onClick={() => navigate('/chat-media')}
          />
          <ActionItem
            icon={Bell}
            label="Notification Settings"
            onClick={() => setActiveModal('notifications')}
          />
          <ActionItem
            icon={Shield}
            label="Privacy & Safety"
            onClick={() => setActiveModal('privacy')}
          />
          <ActionItem
            icon={LogOut}
            label="Relationship Status"
            color="#FF5252"
            onClick={() => setActiveModal('relationship')}
          />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'notifications' && (
          <SettingsModal
            title="Notification Settings"
            onClose={closeModal}
            icon={Bell}
          >
            <NotificationOptions />
          </SettingsModal>
        )}
        {activeModal === 'privacy' && (
          <SettingsModal
            title="Privacy & Safety"
            onClose={closeModal}
            icon={Shield}
          >
            <PrivacyOptions />
          </SettingsModal>
        )}
        {activeModal === 'relationship' && (
          <SettingsModal
            title="Relationship Status"
            onClose={closeModal}
            icon={LogOut}
            danger
          >
            <RelationshipOptions />
          </SettingsModal>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MilestoneCard = ({ icon: Icon, label, value }) => (
  <motion.div
    whileHover={{ y: -5 }}
    style={{
      padding: '24px 16px',
      textAlign: 'center',
      backgroundColor: 'var(--card-bg)',
      borderRadius: '24px',
      boxShadow: 'var(--shadow-soft)',
      border: '1px solid var(--border-light)'
    }}
  >
    <div style={{
      width: '44px',
      height: '44px',
      borderRadius: '14px',
      backgroundColor: 'var(--card-accent-pink)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 12px auto'
    }}>
      <Icon size={22} color="var(--blush-pink)" />
    </div>
    <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '4px' }}>{label}</p>
    <p style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '15px' }}>{value}</p>
  </motion.div>
);

const ActionItem = ({ icon: Icon, label, onClick, color = 'var(--text-main)' }) => (
  <motion.div
    whileHover={{ x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '16px',
      cursor: 'pointer',
      backgroundColor: 'var(--card-bg)',
      borderRadius: '20px',
      boxShadow: 'var(--shadow-soft)',
      border: '1px solid var(--border-light)'
    }}
  >
    <div style={{
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      backgroundColor: color === '#FF5252' ? 'rgba(255,82,82,0.08)' : 'var(--card-accent-pink)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Icon size={20} color={color === '#FF5252' ? '#FF5252' : 'var(--text-main)'} />
    </div>
    <span style={{ flex: 1, fontWeight: 500, color: color, fontSize: '16px' }}>{label}</span>
    <ChevronRight size={18} color="var(--text-sub)" opacity={0.5} />
  </motion.div>
);

const SettingsModal = ({ title, children, onClose, icon: Icon, danger }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(8px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'flex-end'
    }}
  >
    <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{
        width: '100%',
        backgroundColor: 'var(--app-bg)',
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
        padding: '32px 24px 48px 24px',
        position: 'relative',
        zIndex: 2001,
        maxHeight: '85vh',
        overflowY: 'auto'
      }}
    >
      <div style={{
        width: '40px',
        height: '4px',
        backgroundColor: 'var(--border-light)',
        borderRadius: '2px',
        margin: '-16px auto 24px auto'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: danger ? 'rgba(255,82,82,0.1)' : 'var(--card-accent-pink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={20} color={danger ? '#FF5252' : 'var(--blush-pink)'} />
          </div>
          <h3 style={{ fontSize: '22px', color: 'var(--text-main)', fontFamily: 'var(--font-main)' }}>{title}</h3>
        </div>
        <X size={24} onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
      </div>

      {children}
    </motion.div>
  </motion.div>
);

const NotificationOptions = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <ToggleItem icon={Smartphone} label="Push Notifications" active />
    <ToggleItem icon={Mail} label="Email Summaries" />
    <ToggleItem icon={MessageSquare} label="Direct Message Alerts" active />
    <ToggleItem icon={Calendar} label="Anniversary Reminders" active />
  </div>
);

const PrivacyOptions = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <ToggleItem icon={Lock} label="Require PIN to Open" />
    <ToggleItem icon={Eye} label="Show Content in Previews" active />
    <ToggleItem icon={MapPin} label="Share Live Location" />
    <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: 'var(--chat-bg)', marginTop: '8px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-sub)', lineHeight: 1.5 }}>
        Your data is encrypted and only accessible by you and your partner. We never share your personal memories with third parties.
      </p>
    </div>
  </div>
);

const RelationshipOptions = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: 'rgba(255,82,82,0.05)', border: '1px dashed #FF5252' }}>
      <p style={{ fontSize: '14px', color: '#FF5252', fontWeight: 500, marginBottom: '8px' }}>Warning</p>
      <p style={{ fontSize: '13px', color: '#FF5252', opacity: 0.8, lineHeight: 1.5 }}>
        Ending your relationship connection will archive all shared albums and disable the shared chat. This action can be undone by re-pairing.
      </p>
    </div>
    <button style={{
      padding: '16px',
      borderRadius: '16px',
      backgroundColor: '#FF5252',
      color: 'white',
      border: 'none',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginTop: '8px',
      cursor: 'pointer'
    }}>
      <Trash2 size={20} /> End Connection
    </button>
  </div>
);

const ToggleItem = ({ icon: Icon, label, active = false }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    backgroundColor: 'var(--chat-bg)',
    borderRadius: '20px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <Icon size={18} color="var(--text-sub)" />
      <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{label}</span>
    </div>
    <div style={{
      width: '48px',
      height: '26px',
      borderRadius: '13px',
      backgroundColor: active ? 'var(--blush-pink)' : 'var(--border-light)',
      position: 'relative',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        position: 'absolute',
        left: active ? '24px' : '4px',
        top: '3px',
        width: '20px',
        height: '20px',
        borderRadius: '10px',
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }} />
    </div>
  </div>
);

export default PartnerProfile;
