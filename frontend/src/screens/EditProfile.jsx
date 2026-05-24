import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Loader, Save } from 'lucide-react';
import api from '../utils/api';

const EditProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    mood: '',
    birthday: '',
    avatar: ''
  });

  useEffect(() => {
    let cancelled = false;
    api.getMe()
      .then(me => {
        if (!cancelled) {
          setFormData({
            name: me.name || '',
            bio: me.bio || '',
            location: me.location || '',
            mood: me.mood || '',
            birthday: me.birthday ? new Date(me.birthday).toISOString().split('T')[0] : '',
            avatar: me.avatar || ''
          });
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError('Failed to load profile.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      setError('');
      const uploaded = await api.uploadFile(file);
      setFormData(prev => ({ ...prev, avatar: uploaded.url }));
    } catch (err) {
      setError('Failed to upload image.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await api.updateMe({
        name: formData.name,
        bio: formData.bio,
        location: formData.location,
        mood: formData.mood,
        birthday: formData.birthday || null,
        avatar: formData.avatar
      });
      // Optionally update cached user
      const saved = localStorage.getItem('currentUser');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.name = formData.name;
          parsed.avatar = formData.avatar;
          localStorage.setItem('currentUser', JSON.stringify(parsed));
        } catch { /* ignore */ }
      }
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'Failed to save profile.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader className="spin" size={24} color="var(--text-sub)" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'var(--bg-main)',
        zIndex: 100,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px',
        backgroundColor: 'var(--card-bg)',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>Edit Profile</h2>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--blush-pink)',
            fontWeight: 600,
            fontSize: '16px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.5 : 1
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {error && (
          <div style={{ color: '#FF4D4D', backgroundColor: 'rgba(255,77,77,0.1)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Avatar Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div 
            onClick={handleAvatarClick}
            style={{ 
              position: 'relative', 
              width: '100px', 
              height: '100px', 
              borderRadius: '50px', 
              overflow: 'hidden',
              cursor: 'pointer',
              border: '2px solid var(--card-border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <img src={formData.avatar || 'https://via.placeholder.com/100'} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              padding: '4px 0'
            }}>
              <Camera size={16} color="white" />
            </div>
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>Tap to change photo</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px', fontWeight: 500 }}>Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange}
              className="premium-card"
              style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--card-border)', borderRadius: '12px', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '16px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px', fontWeight: 500 }}>Bio</label>
            <textarea 
              name="bio" 
              value={formData.bio} 
              onChange={handleChange}
              className="premium-card"
              rows={3}
              style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--card-border)', borderRadius: '12px', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '16px', outline: 'none', resize: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px', fontWeight: 500 }}>Mood</label>
            <input 
              type="text" 
              name="mood" 
              value={formData.mood} 
              onChange={handleChange}
              placeholder="e.g. Happy 😊"
              className="premium-card"
              style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--card-border)', borderRadius: '12px', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '16px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px', fontWeight: 500 }}>Location</label>
            <input 
              type="text" 
              name="location" 
              value={formData.location} 
              onChange={handleChange}
              className="premium-card"
              style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--card-border)', borderRadius: '12px', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '16px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-sub)', marginBottom: '8px', fontWeight: 500 }}>Birthday</label>
            <input 
              type="date" 
              name="birthday" 
              value={formData.birthday} 
              onChange={handleChange}
              className="premium-card"
              style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--card-border)', borderRadius: '12px', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '16px', outline: 'none' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EditProfile;
