import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, ChevronRight, X, FolderPlus, Image as ImageIcon, Lock } from 'lucide-react';
import { useAdminData } from '../data/AdminDataContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const creatorName = (album) => (
  typeof album.createdBy === 'object' ? album.createdBy?.name : album.createdBy
) || 'Unknown';

const formatAlbumDate = (date) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return '—';
  }
};

const AlbumsManager = () => {
  const navigate = useNavigate();
  const { albums, addAlbum, updateAlbum, deleteAlbum } = useAdminData();
  const toast = useToast();
  const fileRef = useRef(null);
  const editFileRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [newAlbum, setNewAlbum] = useState({ title: '', description: '', cover: '' });
  const [editForm, setEditForm] = useState({});
  const [newCoverPreview, setNewCoverPreview] = useState('');
  const [editCoverPreview, setEditCoverPreview] = useState('');

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (file) setter(URL.createObjectURL(file));
  };

  const handleCreate = () => {
    if (!newAlbum.title.trim()) { toast.error('Please enter an album title'); return; }
    addAlbum({ ...newAlbum, cover: newCoverPreview || `https://picsum.photos/seed/${Date.now()}/400/500`, date: new Date().toISOString().split('T')[0] });
    toast.success('Album created! 📸');
    setShowCreateModal(false);
    setNewAlbum({ title: '', description: '', cover: '' });
    setNewCoverPreview('');
  };

  const openEdit = (album) => {
    setEditingAlbum(album);
    setEditForm({ title: album.title, description: album.description });
    setEditCoverPreview(album.cover);
  };

  const saveEdit = () => {
    updateAlbum(editingAlbum._id, { ...editForm, cover: editCoverPreview });
    toast.success('Album updated!');
    setEditingAlbum(null);
  };

  const confirmDelete = () => {
    deleteAlbum(deletingId);
    toast.success('Album deleted.');
    setDeletingId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div className="admin-section-title" style={{ marginBottom: 0 }}>
          <h2>Albums Library</h2>
          <p>{albums.length} collections curated.</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setShowCreateModal(true)}
          style={{ padding: '0 20px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <FolderPlus size={18} /> Create Album
        </motion.button>
      </div>

      {albums.length === 0 && (
        <div className="admin-card" style={{ textAlign: 'center', padding: '80px' }}>
          <FolderPlus size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-sub)', marginBottom: '8px' }}>No albums yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Create your first collection to get started.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {albums.map((album, i) => (
          <motion.div key={album._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
            className={`admin-card${album.deletedAt ? ' admin-deleted-overlay' : ''}`} style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
            {album.deletedAt && <span className="admin-deleted-label">User deleted</span>}
            <div style={{ position: 'relative', height: '200px', background: 'var(--chat-bg)' }}>
              {album.cover ? (
                <img src={album.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <ImageIcon size={40} />
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ color: 'white' }}>
                  <p style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{album.count ?? album.photos?.length ?? 0} Photos</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '17px', margin: 0 }}>{album.title}</h3>
                    {album.isPrivate && <Lock size={14} />}
                  </div>
                  {album.isPrivate && album.pinPlain && (
                    <p style={{ fontSize: '11px', opacity: 0.85, marginTop: '4px' }}>PIN: {album.pinPlain}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => openEdit(album)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Edit2 size={14} />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setDeletingId(album._id)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,82,82,0.4)', backdropFilter: 'blur(8px)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </div>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatAlbumDate(album.date)} · by {creatorName(album)}</p>
              </div>
              <motion.button whileHover={{ x: 3 }} onClick={() => navigate(`/admin/albums/${album._id}`)}
                style={{ background: 'transparent', border: 'none', color: 'var(--blush-pink)', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                View <ChevronRight size={15} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '22px' }}>Create New Collection</h3>
                <X size={24} onClick={() => setShowCreateModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div onClick={() => fileRef.current?.click()} style={{ width: '100%', height: '160px', borderRadius: '16px', border: `2px dashed ${newCoverPreview ? 'var(--blush-pink)' : 'var(--border-light)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--chat-bg)', cursor: 'pointer', overflow: 'hidden' }}>
                  {newCoverPreview ? <img src={newCoverPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <><ImageIcon size={28} color="var(--text-muted)" /><p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '8px' }}>Pick a cover photo</p></>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e, setNewCoverPreview)} />
                <input value={newAlbum.title} onChange={e => setNewAlbum(p => ({ ...p, title: e.target.value }))} placeholder="Album title..." style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }} />
                <textarea value={newAlbum.description} onChange={e => setNewAlbum(p => ({ ...p, description: e.target.value }))} placeholder="Tell the story of this collection..." style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', minHeight: '80px', resize: 'none', fontFamily: 'inherit', outline: 'none' }} />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleCreate}
                    style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Create Album</motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingAlbum && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="admin-card" style={{ width: '100%', maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <h3 style={{ fontSize: '22px' }}>Edit Album</h3>
                <X size={24} onClick={() => setEditingAlbum(null)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div onClick={() => editFileRef.current?.click()} style={{ width: '100%', height: '140px', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', position: 'relative', background: 'var(--chat-bg)' }}>
                  {editCoverPreview ? (
                    <img src={editCoverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <ImageIcon size={32} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>Click to change cover</span>
                  </div>
                </div>
                <input ref={editFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e, setEditCoverPreview)} />
                <input value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Album title..." style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', outline: 'none' }} />
                <textarea value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Description..." style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', minHeight: '80px', resize: 'none', fontFamily: 'inherit', outline: 'none' }} />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setEditingAlbum(null)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={saveEdit}
                    style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Save Changes</motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog isOpen={!!deletingId} title="Soft-delete album?" description="Users will no longer see this album. As admin, you can still open it and view all photos including user-deleted ones." onConfirm={confirmDelete} onCancel={() => setDeletingId(null)} />
    </div>
  );
};

export default AlbumsManager;
