import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Database, Settings, ChevronRight, X, LogOut, Trash2, Sun, Moon, Monitor } from 'lucide-react';
import api from '../../utils/api';
import { useAdminData } from '../data/AdminDataContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const Toggle = ({ value, onChange }) => (
  <div onClick={onChange} style={{ width: '44px', height: '24px', borderRadius: '20px', backgroundColor: value ? 'var(--blush-pink)' : 'var(--border-light)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
    <motion.div animate={{ x: value ? 22 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ position: 'absolute', top: '2px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
  </div>
);

const AdminSettings = () => {
  const navigate = useNavigate();
  const { memories, albums, messages, events, milestones, recapSlides, settings, updateSettings } = useAdminData();
  const toast = useToast();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });

  const handleExportData = () => {
    const data = { memories, albums, messages, events, milestones, recapSlides, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `love_admin_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('All data exported successfully!');
  };

  const handleClearCache = () => {
    localStorage.clear();
    toast.success('Cache cleared!');
  };

  const handleSavePassword = () => {
    if (!pwForm.current) { toast.error('Enter your current password'); return; }
    if (pwForm.next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    toast.success('Password updated!');
    setShowPasswordModal(false);
    setPwForm({ current: '', next: '', confirm: '' });
  };

  const handleSignOut = () => {
    toast.info('Signing out...');
    setTimeout(() => navigate('/login'), 800);
  };

  const storageData = [
    { label: 'Memories', count: memories.length, max: 500, color: 'var(--blush-pink)' },
    { label: 'Albums', count: albums.length, max: 100, color: '#9c27b0' },
    { label: 'Messages', count: messages.length, max: 10000, color: '#4CAF50' },
    { label: 'Events', count: events.length, max: 365, color: '#D4AF37' },
  ];

  const sections = [
    {
      title: 'Security & Privacy', icon: Shield,
      items: [
        { label: 'Admin Access Password', desc: 'Change the password to enter this panel', onClick: () => setShowPasswordModal(true), chevron: true },
        { label: 'Two-Factor Authentication', desc: 'Add an extra layer of security', toggle: 'twoFactor' },
        { label: 'Login Sessions', desc: '1 active session — this device', onClick: () => setShowSessionModal(true), chevron: true },
      ]
    },
    {
      title: 'Data Management', icon: Database,
      items: [
        { label: 'Export All Data', desc: 'Download a complete JSON backup', onClick: handleExportData, chevron: true },
        { label: 'Media Storage Usage', desc: `${memories.length + albums.length} items tracked`, onClick: () => setShowStorageModal(true), chevron: true },
        { label: 'Clear Cache', desc: 'Reset application localStorage state', onClick: handleClearCache, chevron: true },
      ]
    },
    {
      title: 'System Preferences', icon: Settings,
      items: [
        { label: 'Default Theme', desc: settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1), onClick: () => setShowThemeModal(true), chevron: true },
        { label: 'Language', desc: 'English (US)', onClick: () => toast.info('Only English is supported right now.'), chevron: true },
        { label: 'Debug Mode', desc: 'Logs state to browser console', toggle: 'debugMode' },
      ]
    },
  ];

  return (
    <div>
      <div className="admin-section-title">
        <h2>Admin Settings</h2>
        <p>Control the foundation and security of your private space.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {sections.map((section) => (
          <div key={section.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--text-sub)' }}>
              <section.icon size={18} />
              <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{section.title}</h3>
            </div>
            <div className="admin-card" style={{ padding: 0 }}>
              {section.items.map((item, i) => (
                <div key={item.label} onClick={item.onClick && !item.toggle ? item.onClick : undefined}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: i < section.items.length - 1 ? '1px solid var(--border-light)' : 'none', cursor: item.onClick && !item.toggle ? 'pointer' : 'default' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '3px' }}>{item.label}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{item.desc}</p>
                  </div>
                  {item.toggle ? (
                    <Toggle value={settings[item.toggle]} onChange={() => { updateSettings({ [item.toggle]: !settings[item.toggle] }); toast.info(`${item.label} ${!settings[item.toggle] ? 'enabled' : 'disabled'}`); }} />
                  ) : (
                    <ChevronRight size={20} color="var(--text-muted)" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Danger Zone */}
        <div className="admin-card" style={{ border: '1px solid rgba(255,82,82,0.3)', background: 'rgba(255,82,82,0.03)' }}>
          <h3 style={{ fontSize: '18px', color: '#FF5252', marginBottom: '8px' }}>Danger Zone</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '24px' }}>These actions are irreversible. Please proceed with absolute certainty.</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowResetDialog(true)}
              style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #FF5252', background: 'transparent', color: '#FF5252', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <Trash2 size={16} /> Reset Application
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowSignOutDialog(true)}
              style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: '#FF5252', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <LogOut size={16} /> Sign Out
            </motion.button>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '420px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '20px' }}>Change Password</h3>
                <X size={24} onClick={() => setShowPasswordModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[['current', 'Current Password'], ['next', 'New Password'], ['confirm', 'Confirm New Password']].map(([key, label]) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>{label}</label>
                    <input type="password" value={pwForm[key]} onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleSavePassword} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Update Password</motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Session Modal */}
      <AnimatePresence>
        {showSessionModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px' }}>Active Sessions</h3>
                <X size={24} onClick={() => setShowSessionModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <div style={{ padding: '16px', background: 'var(--chat-bg)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '15px' }}>This Device</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Active now · Chrome / Windows</p>
                </div>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4CAF50' }} />
              </div>
              <button onClick={() => setShowSessionModal(false)} style={{ width: '100%', marginTop: '20px', padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Theme Modal */}
      <AnimatePresence>
        {showThemeModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '380px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px' }}>Default Theme</h3>
                <X size={24} onClick={() => setShowThemeModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[['light', 'Light Mode', Sun], ['dark', 'Dark Mode', Moon], ['system', 'System Default', Monitor]].map(([val, label, Icon]) => (
                  <div key={val} onClick={() => {
                    updateSettings({ theme: val });
                    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    const shouldUseDark = val === 'dark' || (val === 'system' && prefersDark);
                    document.body.classList.toggle('dark-mode', shouldUseDark);
                    api.setPreferredTheme(val).catch((err) => console.error('Failed to persist theme preference:', err));
                    toast.success(`Theme set to ${label}`);
                  }}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderRadius: '14px', border: `2px solid ${settings.theme === val ? 'var(--blush-pink)' : 'var(--border-light)'}`, background: settings.theme === val ? 'var(--card-accent-pink)' : 'var(--chat-bg)', cursor: 'pointer' }}>
                    <Icon size={20} color={settings.theme === val ? 'var(--blush-pink)' : 'var(--text-sub)'} />
                    <span style={{ fontWeight: 600, color: settings.theme === val ? 'var(--blush-pink)' : 'var(--text-main)' }}>{label}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowThemeModal(false)} style={{ width: '100%', marginTop: '20px', padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Done</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Storage Modal */}
      <AnimatePresence>
        {showStorageModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '420px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px' }}>Storage Usage</h3>
                <X size={24} onClick={() => setShowStorageModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {storageData.map(s => (
                  <div key={s.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                      <span>{s.label}</span><span>{s.count} / {s.max}</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '100px', background: 'var(--border-light)', overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((s.count / s.max) * 100, 100)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: '100px', background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowStorageModal(false)} style={{ width: '100%', marginTop: '24px', padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Done</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog isOpen={showResetDialog} title="Reset Application?" description="This will permanently erase all memories, albums, messages, and settings. This action cannot be undone." confirmLabel="Yes, Reset Everything" onConfirm={() => { toast.error('Reset triggered — data cleared.'); setShowResetDialog(false); }} onCancel={() => setShowResetDialog(false)} />
      <ConfirmDialog isOpen={showSignOutDialog} title="Sign Out?" description="You will be redirected to the login page." confirmLabel="Sign Out" confirmColor="#FF5252" onConfirm={handleSignOut} onCancel={() => setShowSignOutDialog(false)} />
    </div>
  );
};

export default AdminSettings;
