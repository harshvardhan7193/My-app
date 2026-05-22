import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Heart, Sparkles, MapPin, Star } from 'lucide-react';
import { useAdminData } from '../data/AdminDataContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const ICONS = ['Heart', 'Sparkles', 'MapPin', 'Star'];
const ICON_COLORS = ['#FFB7C5', '#EBE8F3', '#D4AF37', '#4CAF50', '#9c27b0', '#FF5252'];

const IconComp = ({ name, size = 22, color }) => {
  const map = { Heart, Sparkles, MapPin, Star };
  const C = map[name] || Heart;
  return <C size={size} color={color} />;
};

// ─── Defined at MODULE LEVEL to prevent re-mount on every keystroke ───────────
const MilestoneForm = ({ f, setF }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Date</label>
        <input
          value={f.date || ''}
          onChange={e => setF(p => ({ ...p, date: e.target.value }))}
          placeholder="e.g. May 12, 2023"
          style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Icon</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {ICONS.map(icon => (
            <button
              key={icon}
              onClick={() => setF(p => ({ ...p, icon }))}
              style={{ width: '40px', height: '40px', borderRadius: '10px', border: `2px solid ${f.icon === icon ? 'var(--blush-pink)' : 'var(--border-light)'}`, background: f.icon === icon ? 'var(--card-accent-pink)' : 'var(--chat-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconComp name={icon} size={16} color={f.icon === icon ? 'var(--blush-pink)' : 'var(--text-muted)'} />
            </button>
          ))}
        </div>
      </div>
    </div>
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Color</label>
      <div style={{ display: 'flex', gap: '8px' }}>
        {ICON_COLORS.map(color => (
          <button
            key={color}
            onClick={() => setF(p => ({ ...p, color }))}
            style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, border: `3px solid ${f.color === color ? 'var(--text-main)' : 'transparent'}`, cursor: 'pointer' }}
          />
        ))}
      </div>
    </div>
    <input
      value={f.title || ''}
      onChange={e => setF(p => ({ ...p, title: e.target.value }))}
      placeholder="Milestone title..."
      style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }}
    />
    <textarea
      value={f.desc || ''}
      onChange={e => setF(p => ({ ...p, desc: e.target.value }))}
      placeholder="Short description..."
      style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', minHeight: '80px', resize: 'none', fontFamily: 'inherit', outline: 'none' }}
    />
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────

const TimelineManager = () => {
  const { milestones, addMilestone, updateMilestone, deleteMilestone, reorderMilestones } = useAdminData();
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ date: '', title: '', desc: '', icon: 'Heart', color: '#FFB7C5' });
  const [editForm, setEditForm] = useState({});

  const handleAdd = () => {
    if (!form.title.trim() || !form.date.trim()) { toast.error('Title and date are required'); return; }
    addMilestone({ ...form });
    toast.success('Milestone added! ✨');
    setShowAddModal(false);
    setForm({ date: '', title: '', desc: '', icon: 'Heart', color: '#FFB7C5' });
  };

  const openEdit = (m) => { setEditingMilestone(m); setEditForm({ ...m }); };

  const saveEdit = () => {
    updateMilestone(editingMilestone.id, editForm);
    toast.success('Milestone updated!');
    setEditingMilestone(null);
  };

  const confirmDelete = () => {
    deleteMilestone(deletingId);
    toast.success('Milestone removed.');
    setDeletingId(null);
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    const arr = [...milestones];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    reorderMilestones(arr);
  };

  const moveDown = (idx) => {
    if (idx === milestones.length - 1) return;
    const arr = [...milestones];
    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    reorderMilestones(arr);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div className="admin-section-title" style={{ marginBottom: 0 }}>
          <h2>Relationship Timeline</h2>
          <p>Curate the milestones that define your journey.</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAddModal(true)}
          style={{ padding: '0 20px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <Plus size={18} /> Add Milestone
        </motion.button>
      </div>

      {milestones.length === 0 && (
        <div className="admin-card" style={{ textAlign: 'center', padding: '80px' }}>
          <Sparkles size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-sub)', marginBottom: '8px' }}>No milestones yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Add your first shared memory milestone.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {milestones.map((m, idx) => (
          <motion.div key={m.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button onClick={() => moveUp(idx)} disabled={idx === 0} style={{ padding: '2px', border: 'none', background: 'transparent', color: idx === 0 ? 'var(--border-light)' : 'var(--text-muted)', cursor: idx === 0 ? 'not-allowed' : 'pointer', lineHeight: 1 }}>▲</button>
              <button onClick={() => moveDown(idx)} disabled={idx === milestones.length - 1} style={{ padding: '2px', border: 'none', background: 'transparent', color: idx === milestones.length - 1 ? 'var(--border-light)' : 'var(--text-muted)', cursor: idx === milestones.length - 1 ? 'not-allowed' : 'pointer', lineHeight: 1 }}>▼</button>
            </div>

            <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: `${m.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconComp name={m.icon} size={22} color={m.color} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h4 style={{ fontSize: '17px' }}>{m.title}</h4>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--chat-bg)', padding: '3px 10px', borderRadius: '100px', whiteSpace: 'nowrap' }}>{m.date}</span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-sub)' }}>{m.desc}</p>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => openEdit(m)} style={{ padding: '9px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-sub)', cursor: 'pointer' }}><Edit2 size={16} /></button>
              <button onClick={() => setDeletingId(m.id)} style={{ padding: '9px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: '#FF5252', cursor: 'pointer' }}><Trash2 size={16} /></button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '22px' }}>Add Milestone</h3>
                <X size={24} onClick={() => setShowAddModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <MilestoneForm f={form} setF={setForm} />
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Create Milestone</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMilestone && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '22px' }}>Edit Milestone</h3>
                <X size={24} onClick={() => setEditingMilestone(null)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <MilestoneForm f={editForm} setF={setEditForm} />
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => setEditingMilestone(null)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={saveEdit} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Save Changes</motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog isOpen={!!deletingId} title="Remove Milestone?" description="This milestone will be permanently removed from your relationship timeline." onConfirm={confirmDelete} onCancel={() => setDeletingId(null)} />
    </div>
  );
};

export default TimelineManager;
