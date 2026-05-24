import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Edit2, Trash2, Eye, ChevronDown, LayoutGrid, List as ListIcon, Image as ImageIcon, Heart, X, Check } from 'lucide-react';
import { useAdminData } from '../data/AdminDataContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const CATEGORIES = ['All', 'Dates', 'Trips', 'Milestones', 'Favorites'];
const PAGE_SIZE = 6;

const MemoriesManager = () => {
  const { memories, addMemory, updateMemory, deleteMemory, toggleFavorite } = useAdminData();
  const toast = useToast();
  const fileRef = useRef(null);

  const [viewMode, setViewMode] = useState('table');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingMemory, setViewingMemory] = useState(null);
  const [editingMemory, setEditingMemory] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [newMemory, setNewMemory] = useState({ title: '', category: 'Dates', date: '', img: '' });
  const [editForm, setEditForm] = useState({});
  const [previewImg, setPreviewImg] = useState('');

  const filtered = memories.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || m.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setter(url);
    }
  };

  const handleAddMemory = () => {
    if (!newMemory.title.trim()) { toast.error('Please enter a title'); return; }
    addMemory({ ...newMemory, img: previewImg || `https://picsum.photos/seed/${Date.now()}/400/400`, uploadedBy: 'Harsh', favorite: false });
    toast.success('Memory created! 🌟');
    setShowAddModal(false);
    setNewMemory({ title: '', category: 'Dates', date: '', img: '' });
    setPreviewImg('');
  };

  const openEdit = (memory) => {
    setEditingMemory(memory);
    setEditForm({ ...memory });
  };

  const saveEdit = () => {
    updateMemory(editingMemory.id, editForm);
    toast.success('Memory updated!');
    setEditingMemory(null);
  };

  const confirmDelete = () => {
    deleteMemory(deletingId);
    toast.success('Memory deleted.');
    setDeletingId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div className="admin-section-title" style={{ marginBottom: 0 }}>
          <h2>Memory Repository</h2>
          <p>{memories.length} memories captured.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--chat-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            {['table', 'grid'].map(mode => (
              <motion.button key={mode} whileTap={{ scale: 0.93 }} onClick={() => setViewMode(mode)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: viewMode === mode ? 'var(--card-bg)' : 'transparent', color: viewMode === mode ? 'var(--blush-pink)' : 'var(--text-sub)', cursor: 'pointer', boxShadow: viewMode === mode ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}>
                {mode === 'table' ? <ListIcon size={17} /> : <LayoutGrid size={17} />}
              </motion.button>
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAddModal(true)}
            style={{ padding: '0 20px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <Plus size={18} /> Add Memory
          </motion.button>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '360px', background: 'var(--chat-bg)', padding: '10px 14px', borderRadius: '12px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input placeholder="Search memories..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '14px', color: 'var(--text-main)' }} />
            {search && <X size={14} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => { setSearch(''); setPage(1); }} />}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <motion.button key={cat} whileTap={{ scale: 0.95 }} onClick={() => { setCategoryFilter(cat); setPage(1); }}
                style={{ padding: '7px 14px', borderRadius: '100px', border: '1px solid var(--border-light)', background: categoryFilter === cat ? 'var(--blush-pink)' : 'var(--card-bg)', color: categoryFilter === cat ? 'white' : 'var(--text-sub)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                {cat}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Memory</th>
                  <th>Category</th><th>Date</th><th>By</th><th>Fav</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No memories found.</td></tr>
                )}
                {paginated.map(m => (
                  <tr key={m.id}>
                    <td style={{ paddingLeft: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden' }}>
                          <img src={m.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{m.title}</span>
                      </div>
                    </td>
                    <td><span className={`admin-badge ${m.category === 'Trips' ? 'purple' : 'pink'}`}>{m.category}</span></td>
                    <td style={{ color: 'var(--text-sub)', fontSize: '13px' }}>{m.date}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: m.uploadedBy === 'Neha' ? 'var(--card-accent-pink)' : 'var(--card-accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>{m.uploadedBy[0]}</div>
                        {m.uploadedBy}
                      </div>
                    </td>
                    <td>
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => { toggleFavorite(m.id); toast.info(m.favorite ? 'Removed from favorites' : 'Added to favorites! ❤️'); }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Heart size={18} color={m.favorite ? 'var(--blush-pink)' : 'var(--text-muted)'} fill={m.favorite ? 'var(--blush-pink)' : 'none'} />
                      </motion.button>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                        <button onClick={() => setViewingMemory(m)} style={{ padding: '7px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-sub)', cursor: 'pointer' }}><Eye size={17} /></button>
                        <button onClick={() => openEdit(m)} style={{ padding: '7px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-sub)', cursor: 'pointer' }}><Edit2 size={17} /></button>
                        <button onClick={() => setDeletingId(m.id)} style={{ padding: '7px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#FF5252', cursor: 'pointer' }}><Trash2 size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {paginated.map(m => (
              <motion.div key={m.id} whileHover={{ scale: 1.02 }} style={{ borderRadius: '16px', overflow: 'hidden', position: 'relative', aspectRatio: '1/1', cursor: 'pointer' }} onClick={() => setViewingMemory(m)}>
                <img src={m.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '12px' }}>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: '13px' }}>{m.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>{m.category}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-main)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontWeight: 600 }}>Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
              style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-main)', cursor: (page === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', opacity: (page === totalPages || totalPages === 0) ? 0.4 : 1, fontWeight: 600 }}>Next</button>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '22px' }}>Add New Memory</h3>
                <X size={24} onClick={() => setShowAddModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div onClick={() => fileRef.current?.click()} style={{ width: '100%', height: '140px', borderRadius: '16px', border: `2px dashed ${previewImg ? 'var(--blush-pink)' : 'var(--border-light)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--chat-bg)', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                  {previewImg ? <img src={previewImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <><ImageIcon size={28} color="var(--text-muted)" /><p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '8px' }}>Click to upload photo</p></>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e, setPreviewImg)} />
                <input value={newMemory.title} onChange={e => setNewMemory(p => ({ ...p, title: e.target.value }))} placeholder="Memory title..." style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontSize: '15px', outline: 'none' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Category</label>
                    <select value={newMemory.category} onChange={e => setNewMemory(p => ({ ...p, category: e.target.value }))}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }}>
                      {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Date</label>
                    <input type="date" value={newMemory.date} onChange={e => setNewMemory(p => ({ ...p, date: e.target.value }))}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleAddMemory}
                    style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Create Memory</motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {viewingMemory && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px' }}>{viewingMemory.title}</h3>
                <X size={24} onClick={() => setViewingMemory(null)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', aspectRatio: '4/3' }}>
                <img src={viewingMemory.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {[['Category', viewingMemory.category], ['Date', viewingMemory.date], ['By', viewingMemory.uploadedBy]].map(([k, v]) => (
                  <div key={k} style={{ padding: '12px', background: 'var(--chat-bg)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>{k}</p>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>{v}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMemory && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '22px' }}>Edit Memory</h3>
                <X size={24} onClick={() => setEditingMemory(null)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <input value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Title" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <select value={editForm.category || 'Dates'} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                    style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }}>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input type="date" value={editForm.date || ''} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))}
                    style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setEditingMemory(null)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={saveEdit}
                    style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Save Changes</motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Memory?"
        description="This moment will be permanently removed from your collection. This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};

export default MemoriesManager;
