import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Settings, Trash2, Edit2, X, Eye } from 'lucide-react';
import { useAdminData } from '../data/AdminDataContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

// ─── Defined at MODULE LEVEL to prevent re-mount on every keystroke ───────────
const Toggle = ({ value, onChange }) => (
  <div onClick={onChange} style={{ width: '44px', height: '24px', borderRadius: '20px', backgroundColor: value ? 'var(--blush-pink)' : 'var(--border-light)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
    <motion.div animate={{ x: value ? 22 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ position: 'absolute', top: '2px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
  </div>
);

const SlideForm = ({ f, setF }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
    <input
      value={f.title || ''}
      onChange={e => setF(p => ({ ...p, title: e.target.value }))}
      placeholder="Slide title..."
      style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }}
    />
    <input
      value={f.subtitle || ''}
      onChange={e => setF(p => ({ ...p, subtitle: e.target.value }))}
      placeholder="Subtitle or caption..."
      style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }}
    />
    <input
      value={f.img || ''}
      onChange={e => setF(p => ({ ...p, img: e.target.value }))}
      placeholder="Image URL (or leave blank for auto)..."
      style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }}
    />
    {f.img && (
      <div style={{ borderRadius: '12px', overflow: 'hidden', height: '120px' }}>
        <img src={f.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )}
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────

const MomentsManager = () => {
  const { recapSlides, addSlide, updateSlide, deleteSlide, reorderSlides, settings, updateSettings } = useAdminData();
  const toast = useToast();
  const [showAddSlide, setShowAddSlide] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [deletingSlideId, setDeletingSlideId] = useState(null);
  const [slideForm, setSlideForm] = useState({ title: '', subtitle: '', img: '' });
  const [editSlideForm, setEditSlideForm] = useState({});

  const getDaysTogether = () => {
    const start = new Date(settings.anniversaryDate);
    const now = new Date();
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const remDays = days % 30;
    return `${years} Years, ${months} Months, ${remDays} Days`;
  };

  const daysToAnniversary = () => {
    const now = new Date();
    const ann = new Date(settings.anniversaryDate);
    const next = new Date(now.getFullYear(), ann.getMonth(), ann.getDate());
    if (next < now) next.setFullYear(now.getFullYear() + 1);
    return Math.ceil((next - now) / (1000 * 60 * 60 * 24));
  };

  const handleAddSlide = () => {
    if (!slideForm.title.trim()) { toast.error('Slide title is required'); return; }
    addSlide({ ...slideForm, img: slideForm.img || `https://picsum.photos/seed/${Date.now()}/400/600` });
    toast.success('Recap slide added!');
    setShowAddSlide(false);
    setSlideForm({ title: '', subtitle: '', img: '' });
  };

  const openEditSlide = (slide) => { setEditingSlide(slide); setEditSlideForm({ ...slide }); };
  const saveEditSlide = () => {
    updateSlide(editingSlide.id, editSlideForm);
    toast.success('Slide updated!');
    setEditingSlide(null);
  };

  const confirmDeleteSlide = () => {
    deleteSlide(deletingSlideId);
    toast.success('Slide removed.');
    setDeletingSlideId(null);
  };

  const moveSlide = (idx, dir) => {
    const arr = [...recapSlides];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    reorderSlides(arr);
  };



  return (
    <div>
      <div className="admin-section-title">
        <h2>Celebration & Recaps</h2>
        <p>Configure how you celebrate milestones together.</p>
      </div>

      <div className="admin-grid grid-2" style={{ marginBottom: '32px' }}>
        {/* Anniversary Config */}
        <div className="admin-card">
          <h3 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} color="var(--blush-pink)" /> Anniversary Config
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Relationship Start Date</label>
              <input type="date" value={settings.anniversaryDate}
                onChange={e => { updateSettings({ anniversaryDate: e.target.value }); toast.success('Anniversary date saved!'); }}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }} />
            </div>

            <div style={{ padding: '20px', backgroundColor: 'var(--chat-bg)', borderRadius: '16px', textAlign: 'center' }}>
              <Heart size={28} color="var(--blush-pink)" fill="var(--blush-pink)" style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '4px' }}>Time Together</p>
              <h3 style={{ fontSize: '20px' }}>{getDaysTogether()}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>🎉 Anniversary in {daysToAnniversary()} days</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Auto-show celebration screen on anniversary', key: 'autoCelebrate' },
                { label: 'Confetti effect on anniversary day', key: 'confetti' },
              ].map(({ label, key }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', lineHeight: 1.4 }}>{label}</span>
                  <Toggle value={settings[key]} onChange={() => { updateSettings({ [key]: !settings[key] }); toast.info(`${label.split(' ')[0]} ${!settings[key] ? 'enabled' : 'disabled'}`); }} />
                </div>
              ))}
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => window.open('/recap', '_blank')}
              style={{ width: '100%', padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Eye size={18} /> Preview Recap Story
            </motion.button>
          </div>
        </div>

        {/* Recap Slides */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={20} color="#D4AF37" /> Story Slides
            </h3>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddSlide(true)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'var(--blush-pink)', color: 'white', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              + Add Slide
            </motion.button>
          </div>

          {recapSlides.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>No slides yet.</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recapSlides.map((slide, idx) => (
              <div key={slide.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid var(--border-light)', borderRadius: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button onClick={() => moveSlide(idx, -1)} disabled={idx === 0} style={{ border: 'none', background: 'transparent', color: idx === 0 ? 'var(--border-light)' : 'var(--text-muted)', cursor: idx === 0 ? 'not-allowed' : 'pointer', lineHeight: 1, padding: '2px' }}>▲</button>
                  <button onClick={() => moveSlide(idx, 1)} disabled={idx === recapSlides.length - 1} style={{ border: 'none', background: 'transparent', color: idx === recapSlides.length - 1 ? 'var(--border-light)' : 'var(--text-muted)', cursor: idx === recapSlides.length - 1 ? 'not-allowed' : 'pointer', lineHeight: 1, padding: '2px' }}>▼</button>
                </div>
                <div style={{ width: '48px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={slide.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slide.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slide.subtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => openEditSlide(slide)} style={{ padding: '7px', border: 'none', background: 'transparent', color: 'var(--text-sub)', cursor: 'pointer' }}><Edit2 size={15} /></button>
                  <button onClick={() => setDeletingSlideId(slide.id)} style={{ padding: '7px', border: 'none', background: 'transparent', color: '#FF5252', cursor: 'pointer' }}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Slide Modal */}
      <AnimatePresence>
        {showAddSlide && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px' }}>Add Recap Slide</h3>
                <X size={24} onClick={() => setShowAddSlide(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <SlideForm f={slideForm} setF={setSlideForm} />
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => setShowAddSlide(false)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleAddSlide} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Add Slide</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Slide Modal */}
      <AnimatePresence>
        {editingSlide && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '460px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px' }}>Edit Slide</h3>
                <X size={24} onClick={() => setEditingSlide(null)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <SlideForm f={editSlideForm} setF={setEditSlideForm} />
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => setEditingSlide(null)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={saveEditSlide} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Save Changes</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog isOpen={!!deletingSlideId} title="Remove Slide?" description="This story slide will be permanently removed from your memory recap." onConfirm={confirmDeleteSlide} onCancel={() => setDeletingSlideId(null)} />
    </div>
  );
};

export default MomentsManager;
