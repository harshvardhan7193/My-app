import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Heart, MapPin, Edit2, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAdminData } from '../data/AdminDataContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const EVENT_TYPES = ['date', 'trip', 'milestone', 'birthday'];
const TYPE_COLORS = { date: '#FFB7C5', trip: '#9c27b0', milestone: '#D4AF37', birthday: '#FF5252' };

// ─── Defined at MODULE LEVEL to prevent re-mount on every keystroke ───────────
const EventModal = ({ title, form, setForm, onSave, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '480px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '22px' }}>{title}</h3>
        <X size={24} onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <input
          value={form.title || ''}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          placeholder="Event title..."
          style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Date</label>
            <input
              type="date"
              value={form.date || ''}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Time</label>
            <input
              type="time"
              value={form.time || ''}
              onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }}
            />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Event Type</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {EVENT_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setForm(p => ({ ...p, type: t }))}
                style={{ padding: '8px 16px', borderRadius: '100px', border: `2px solid ${form.type === t ? TYPE_COLORS[t] : 'var(--border-light)'}`, background: form.type === t ? `${TYPE_COLORS[t]}20` : 'transparent', color: form.type === t ? TYPE_COLORS[t] : 'var(--text-sub)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <input
          value={form.location || ''}
          onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
          placeholder="Location (optional)..."
          style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onSave} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Save</motion.button>
        </div>
      </div>
    </motion.div>
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────

const CalendarManager = () => {
  const { events, addEvent, updateEvent, deleteEvent } = useAdminData();
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', location: '', type: 'date' });
  const [editForm, setEditForm] = useState({});

  const now = new Date();
  const displayDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthLabel = displayDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const visibleEvents = events.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === displayDate.getMonth() && d.getFullYear() === displayDate.getFullYear();
  });

  const handleAdd = () => {
    if (!newEvent.title.trim() || !newEvent.date) { toast.error('Title and date are required'); return; }
    addEvent({ ...newEvent });
    toast.success('Event added to calendar! 📅');
    setShowAddModal(false);
    setNewEvent({ title: '', date: '', time: '', location: '', type: 'date' });
  };

  const openEdit = (event) => { setEditingEvent(event); setEditForm({ ...event }); };

  const saveEdit = () => {
    updateEvent(editingEvent.id, editForm);
    toast.success('Event updated!');
    setEditingEvent(null);
  };

  const confirmDelete = () => {
    deleteEvent(deletingId);
    toast.success('Event removed.');
    setDeletingId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div className="admin-section-title" style={{ marginBottom: 0 }}>
          <h2>Planner &amp; Schedule</h2>
          <p>Upcoming dates, trips, and milestones.</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAddModal(true)}
          style={{ padding: '0 20px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <Plus size={18} /> Add Event
        </motion.button>
      </div>

      <div className="admin-grid grid-3">
        <div className="admin-card" style={{ gridColumn: 'span 2', padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px' }}>{monthLabel}</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setMonthOffset(p => p - 1)} style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', cursor: 'pointer', color: 'var(--text-main)' }}><ChevronLeft size={16} /></button>
              <button onClick={() => setMonthOffset(0)} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Today</button>
              <button onClick={() => setMonthOffset(p => p + 1)} style={{ padding: '8px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', cursor: 'pointer', color: 'var(--text-main)' }}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Event</th><th>Type</th><th>Date &amp; Time</th><th>Location</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleEvents.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No events in {monthLabel}.</td></tr>
                )}
                {visibleEvents.map(event => (
                  <tr key={event.id}>
                    <td style={{ paddingLeft: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${TYPE_COLORS[event.type]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Heart size={16} color={TYPE_COLORS[event.type]} fill={event.type === 'date' ? TYPE_COLORS[event.type] : 'none'} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{event.title}</span>
                      </div>
                    </td>
                    <td><span className="admin-badge pink" style={{ backgroundColor: `${TYPE_COLORS[event.type]}20`, color: TYPE_COLORS[event.type] }}>{event.type}</span></td>
                    <td>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{event.date}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{event.time}</div>
                    </td>
                    <td>
                      {event.location && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-sub)', fontSize: '13px' }}><MapPin size={13} />{event.location}</div>}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                        <button onClick={() => openEdit(event)} style={{ padding: '7px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-sub)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                        <button onClick={() => setDeletingId(event.id)} style={{ padding: '7px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#FF5252', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>All Events</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '16px' }}>{events.length} total planned</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {EVENT_TYPES.map(t => {
              const count = events.filter(e => e.type === t).length;
              return (
                <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', background: 'var(--chat-bg)' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>{t}s</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: TYPE_COLORS[t] }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && <EventModal title="Schedule New Plan" form={newEvent} setForm={setNewEvent} onSave={handleAdd} onClose={() => setShowAddModal(false)} />}
        {editingEvent && <EventModal title="Edit Event" form={editForm} setForm={setEditForm} onSave={saveEdit} onClose={() => setEditingEvent(null)} />}
      </AnimatePresence>

      <ConfirmDialog isOpen={!!deletingId} title="Remove Event?" description="This event will be permanently removed from your calendar." onConfirm={confirmDelete} onCancel={() => setDeletingId(null)} />
    </div>
  );
};

export default CalendarManager;
