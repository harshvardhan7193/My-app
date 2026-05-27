import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Send, Zap, Heart, Calendar, Image as ImageIcon, MessageCircle, Gift, Star, Clock, CheckCircle, XCircle, Smartphone, Users, Paperclip, Link, Upload, X as XIcon } from 'lucide-react';
import { useToast } from '../components/Toast';
import api from '../../utils/api';

// ─── Static data (module level) ───────────────────────────────────────────────
const TEMPLATES = [
  { id: 1, label: 'Good Morning', icon: '☀️', title: 'Good morning, love! ☀️', body: 'Just wanted to say I\'m thinking of you. Have a wonderful day!' },
  { id: 2, label: 'Miss You',     icon: '💭', title: 'Missing you...',          body: 'The distance feels real today. Can\'t wait to see you soon 💕' },
  { id: 3, label: 'Date Night',   icon: '🌹', title: 'Date night reminder! 🌹', body: 'Don\'t forget — tonight is ours. See you soon ✨' },
  { id: 4, label: 'I Love You',   icon: '❤️', title: 'Just because... ❤️',     body: 'I love you more than you know. Always.' },
  { id: 5, label: 'Check In',     icon: '👋', title: 'Hey, you okay? 👋',      body: 'Checking in on you. Hope your day is going great!' },
  { id: 6, label: 'Anniversary',  icon: '🎉', title: 'Happy Anniversary! 🎉',   body: 'Another year of us. Here\'s to forever 🥂' },
];

const CATEGORIES = [
  { value: 'love',      label: 'Love Note',    icon: Heart,         color: '#FFB7C5' },
  { value: 'reminder',  label: 'Reminder',     icon: Calendar,      color: '#D4AF37' },
  { value: 'media',     label: 'New Memory',   icon: ImageIcon,     color: '#9c27b0' },
  { value: 'message',   label: 'Message',      icon: MessageCircle, color: '#4CAF50' },
  { value: 'surprise',  label: 'Surprise',     icon: Gift,          color: '#FF5252' },
  { value: 'milestone', label: 'Milestone',    icon: Star,          color: '#FF9800' },
];

// `value` must match the backend Notification.target enum ('both' | 'male' | 'female')
const TARGETS = [
  { value: 'both',   label: 'Both of Us', icon: Users },
  { value: 'male',   label: 'Him only',   icon: Smartphone },
  { value: 'female', label: 'Her only',   icon: Smartphone },
];
// ─────────────────────────────────────────────────────────────────────────────

// Phone preview (module level)
const PhonePreview = ({ title, body, category, imageUrl }) => {
  const cat = CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  return (
    <div style={{ background: 'linear-gradient(160deg, #1a1a2e, #16213e)', borderRadius: '28px', padding: '28px 20px', border: '6px solid #333', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', maxWidth: '260px', margin: '0 auto' }}>
      <div style={{ width: '80px', height: '6px', background: '#444', borderRadius: '4px', margin: '0 auto 20px' }} />
      <p style={{ fontSize: '11px', color: '#888', textAlign: 'center', marginBottom: '20px' }}>9:41 AM</p>
      <AnimatePresence mode="wait">
        <motion.div key={title + body + imageUrl}
          initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Notification image banner */}
          <AnimatePresence>
            {imageUrl && (
              <motion.div initial={{ height: 0 }} animate={{ height: 110 }} exit={{ height: 0 }}
                style={{ overflow: 'hidden', background: '#111' }}>
                <img src={imageUrl} alt="notification"
                  style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.style.display = 'none'; }} />
              </motion.div>
            )}
          </AnimatePresence>
          <div style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${cat.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <cat.icon size={14} color={cat.color} />
              </div>
              <p style={{ fontSize: '10px', color: '#aaa', fontWeight: 600 }}>LOVE APP · NOW</p>
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px', lineHeight: 1.3 }}>{title || 'Notification Title'}</p>
            <p style={{ fontSize: '11px', color: '#ccc', lineHeight: 1.4 }}>{body || 'Your message will appear here...'}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const STATUS_STYLE = {
  delivered: { color: '#4CAF50', bg: 'rgba(76,175,80,0.1)', icon: CheckCircle, label: 'Delivered' },
  failed:    { color: '#FF5252', bg: 'rgba(255,82,82,0.1)',  icon: XCircle,     label: 'Failed'    },
  pending:   { color: '#D4AF37', bg: 'rgba(212,175,55,0.1)', icon: Clock,       label: 'Pending'   },
};

const NotificationsManager = () => {
  const toast = useToast();
  const fileRef = useRef(null);
  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState('');
  const [category, setCategory] = useState('love');
  const [target, setTarget]     = useState('both');
  const [scheduled, setScheduled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [sending, setSending]   = useState(false);
  const [history, setHistory]   = useState([]);
  const [activeTab, setActiveTab] = useState('compose');
  // Image attachment state
  const [imageUrl, setImageUrl]   = useState('');
  const [imgMode, setImgMode]     = useState('upload'); // 'upload' | 'url'
  const [urlInput, setUrlInput]   = useState('');

  // Load real notification history from the backend
  useEffect(() => {
    let cancelled = false;
    api.getNotificationHistory()
      .then((data) => { if (!cancelled) setHistory(data || []); })
      .catch((err) => { console.error('Failed to load notification history:', err); });
    return () => { cancelled = true; };
  }, []);

  // Display label for a stored target enum value
  const targetLabel = (t) => TARGETS.find((x) => x.value === t)?.label || t;

  const applyTemplate = (tpl) => { setTitle(tpl.title); setBody(tpl.body); };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    setImageUrl(URL.createObjectURL(file));
  };

  const clearImage = () => { setImageUrl(''); setUrlInput(''); if (fileRef.current) fileRef.current.value = ''; };

  const handleSend = async () => {
    if (!title.trim()) { toast.error('Notification title is required'); return; }
    if (!body.trim())  { toast.error('Message body is required'); return; }
    setSending(true);
    try {
      let finalImageUrl = imageUrl || undefined;
      if (imgMode === 'upload' && imageUrl && imageUrl.startsWith('blob:') && fileRef.current?.files?.[0]) {
        const uploadResult = await api.uploadFile(fileRef.current.files[0]);
        finalImageUrl = uploadResult.url;
      }

      const saved = await api.sendNotification({
        title: title.trim(),
        body: body.trim(),
        target,
        category,
        imageUrl: finalImageUrl,
      });
      setHistory(prev => [saved, ...prev]);
      toast.success('🔔 Notification sent successfully!');
      setTitle(''); setBody(''); setCategory('love'); setTarget('both');
      clearImage();
      setActiveTab('history');
    } catch (err) {
      console.error('Failed to send notification:', err);
      toast.error(err.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (n) => {
    try {
      const saved = await api.sendNotification({
        title: n.title,
        body: n.body,
        target: n.target,
        category: n.category,
        imageUrl: n.imageUrl || undefined,
      });
      setHistory(prev => [saved, ...prev]);
      toast.success('🔔 Notification resent successfully!');
    } catch (err) {
      console.error('Failed to resend notification:', err);
      toast.error(err.message || 'Failed to resend notification');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div className="admin-section-title" style={{ marginBottom: 0 }}>
          <h2>Push Notifications</h2>
          <p>Broadcast Firebase notifications directly to both devices.</p>
        </div>
        <div style={{ display: 'flex', background: 'var(--chat-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          {['compose', 'history'].map(tab => (
            <motion.button key={tab} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab(tab)}
              style={{ padding: '9px 20px', borderRadius: '9px', border: 'none', background: activeTab === tab ? 'var(--card-bg)' : 'transparent', color: activeTab === tab ? 'var(--blush-pink)' : 'var(--text-sub)', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', textTransform: 'capitalize' }}>
              {tab === 'compose' ? '✏️ Compose' : `📋 History (${history.length})`}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── COMPOSE TAB ── */}
        {activeTab === 'compose' && (
          <motion.div key="compose" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start' }}>

              {/* Left: form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Quick Templates */}
                <div className="admin-card">
                  <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={18} color="#D4AF37" /> Quick Templates
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {TEMPLATES.map(tpl => (
                      <motion.button key={tpl.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                        onClick={() => applyTemplate(tpl)}
                        style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: '20px', display: 'block', marginBottom: '6px' }}>{tpl.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{tpl.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Composer */}
                <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={18} color="var(--blush-pink)" /> Notification Content
                  </h3>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} maxLength={65} placeholder="Enter notification title..."
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none', fontSize: '15px' }} />
                    <p style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{title.length}/65</p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Message Body</label>
                    <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={240} placeholder="Write your message here..."
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px', lineHeight: 1.6 }} />
                    <p style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{body.length}/240</p>
                  </div>

                  {/* ── Image Attachment (optional) ── */}
                  <div style={{ padding: '16px', background: 'var(--chat-bg)', borderRadius: '14px', border: `1px solid ${imageUrl ? 'var(--blush-pink)' : 'var(--border-light)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <Paperclip size={17} color={imageUrl ? 'var(--blush-pink)' : 'var(--text-sub)'} />
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600 }}>Attach Image <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shown as a rich banner inside the notification</p>
                        </div>
                      </div>
                      {/* Mode switcher */}
                      <div style={{ display: 'flex', background: 'var(--card-bg)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-light)' }}>
                        {[['upload', Upload, 'Upload'], ['url', Link, 'URL']].map(([mode, Icon, lbl]) => (
                          <button key={mode} onClick={() => { setImgMode(mode); clearImage(); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', border: 'none', background: imgMode === mode ? 'var(--blush-pink)' : 'transparent', color: imgMode === mode ? 'white' : 'var(--text-muted)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                            <Icon size={13} />{lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Upload mode */}
                    <AnimatePresence mode="wait">
                      {imgMode === 'upload' && (
                        <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          {!imageUrl ? (
                            <div onClick={() => fileRef.current?.click()}
                              style={{ border: '2px dashed var(--border-light)', borderRadius: '12px', padding: '28px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blush-pink)'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                            >
                              <Upload size={28} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                              <p style={{ fontSize: '13px', color: 'var(--text-sub)', fontWeight: 600 }}>Click to upload an image</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>JPG, PNG, GIF, WebP</p>
                            </div>
                          ) : (
                            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                              <img src={imageUrl} alt="attachment preview" style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                              <button onClick={clearImage}
                                style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <XIcon size={14} />
                              </button>
                              <div style={{ position: 'absolute', bottom: '8px', left: '10px', fontSize: '11px', color: 'white', background: 'rgba(0,0,0,0.55)', padding: '3px 8px', borderRadius: '100px', fontWeight: 600 }}>Image ready ✓</div>
                            </div>
                          )}
                          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                        </motion.div>
                      )}

                      {/* URL mode */}
                      {imgMode === 'url' && (
                        <motion.div key="url" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://example.com/image.jpg"
                              style={{ flex: 1, padding: '11px 14px', borderRadius: '11px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-main)', outline: 'none', fontSize: '13px' }} />
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { if (urlInput.trim()) setImageUrl(urlInput.trim()); else toast.error('Enter a valid URL'); }}
                              style={{ padding: '11px 16px', borderRadius: '11px', border: 'none', background: 'var(--blush-pink)', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Apply</motion.button>
                          </div>
                          {imageUrl && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                              <img src={imageUrl} alt="url preview" style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                                onError={() => { toast.error('Image URL could not be loaded'); clearImage(); }} />
                              <button onClick={clearImage}
                                style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <XIcon size={14} />
                              </button>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Category</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {CATEGORIES.map(cat => {
                        const active = category === cat.value;
                        return (
                          <motion.button key={cat.value} whileTap={{ scale: 0.93 }} onClick={() => setCategory(cat.value)}
                            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', borderRadius: '100px', border: `2px solid ${active ? cat.color : 'var(--border-light)'}`, background: active ? `${cat.color}18` : 'transparent', color: active ? cat.color : 'var(--text-sub)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                            <cat.icon size={14} /> {cat.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Send To</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {TARGETS.map(t => {
                        const active = target === t.value;
                        return (
                          <motion.button key={t.value} whileTap={{ scale: 0.95 }} onClick={() => setTarget(t.value)}
                            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `2px solid ${active ? 'var(--blush-pink)' : 'var(--border-light)'}`, background: active ? 'var(--card-accent-pink)' : 'var(--chat-bg)', color: active ? 'var(--blush-pink)' : 'var(--text-sub)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                            <t.icon size={15} /> {t.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Schedule Toggle */}
                  <div style={{ padding: '16px', background: 'var(--chat-bg)', borderRadius: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={18} color="var(--text-sub)" />
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600 }}>Schedule for later</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Set a specific date & time to deliver</p>
                        </div>
                      </div>
                      <div onClick={() => setScheduled(s => !s)}
                        style={{ width: '44px', height: '24px', borderRadius: '20px', backgroundColor: scheduled ? 'var(--blush-pink)' : 'var(--border-light)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                        <motion.div animate={{ x: scheduled ? 22 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          style={{ position: 'absolute', top: '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                      </div>
                    </div>
                    <AnimatePresence>
                      {scheduled && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                          <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                            style={{ marginTop: '14px', width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-main)', outline: 'none' }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Send Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleSend}
                    disabled={sending}
                    style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: sending ? 'var(--border-light)' : 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: sending ? 'var(--text-muted)' : 'white', fontWeight: 700, fontSize: '16px', cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    {sending ? (
                      <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Bell size={20} /></motion.div> Sending...</>
                    ) : (
                      <><Send size={20} /> {scheduled ? 'Schedule Notification' : 'Send Now'}</>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Right: Phone Preview */}
              <div style={{ position: 'sticky', top: '24px' }}>
                <div className="admin-card" style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '20px' }}>Live Preview</h3>
                  <PhonePreview title={title} body={body} category={category} imageUrl={imageUrl} />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>How it looks on the recipient's device</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

            {/* Stats row */}
            <div className="admin-stat-grid" style={{ marginBottom: '24px' }}>
              {[
                { label: 'Total Sent',  value: history.length,                                           color: 'var(--blush-pink)' },
                { label: 'Delivered',   value: history.filter(h => h.status === 'delivered').length,     color: '#4CAF50' },
                { label: 'Failed',      value: history.filter(h => h.status === 'failed').length,        color: '#FF5252' },
                { label: 'Total Opens', value: history.reduce((acc, h) => acc + (h.opens || 0), 0),      color: '#D4AF37' },
              ].map(s => (
                <div key={s.label} className="admin-card" style={{ textAlign: 'center', padding: '20px' }}>
                  <h3 style={{ fontSize: '28px', marginBottom: '4px', color: s.color }}>{s.value}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-sub)', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="admin-card" style={{ padding: 0 }}>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '24px' }}>Notification</th>
                      <th>Image</th>
                      <th>Category</th><th>Sent To</th><th>Status</th><th>Opens</th>
                      <th>Time</th>
                      <th style={{ paddingRight: '24px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No notifications sent yet.</td></tr>
                    )}
                    {history.map(n => {
                      const cat = CATEGORIES.find(c => c.value === n.category) || CATEGORIES[0];
                      const st  = STATUS_STYLE[n.status] || STATUS_STYLE.pending;
                      const when = n.sentAt || n.createdAt || n.time;
                      const whenLabel = when ? new Date(when).toLocaleString() : '—';
                      return (
                        <tr key={n._id || n.id}>
                          <td style={{ paddingLeft: '24px' }}>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '14px' }}>{n.title}</p>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>
                            </div>
                          </td>
                          <td>
                            {n.imageUrl
                              ? <div style={{ width: '48px', height: '36px', borderRadius: '8px', overflow: 'hidden' }}><img src={n.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /></div>
                              : <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: cat.color, fontWeight: 600 }}>
                              <cat.icon size={14} />{cat.label}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{targetLabel(n.target)}</td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '100px', background: st.bg, color: st.color, fontSize: '12px', fontWeight: 700 }}>
                              <st.icon size={12} />{st.label}
                            </span>
                          </td>
                          <td style={{ fontSize: '14px', fontWeight: 600 }}>{n.opens || 0}</td>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{whenLabel}</td>
                          <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleResend(n)}
                              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Send size={12} /> Resend
                            </motion.button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsManager;
