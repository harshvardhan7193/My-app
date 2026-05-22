import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { useAdminData } from '../data/AdminDataContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const AlbumDetailAdmin = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const { albums, addPhotoToAlbum, deletePhotoFromAlbum } = useAdminData();
  const toast = useToast();
  const fileRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);

  const album = albums.find(a => a.id === parseInt(albumId));

  if (!album) return (
    <div className="admin-card" style={{ textAlign: 'center', padding: '80px' }}>
      <h3 style={{ color: 'var(--text-sub)' }}>Album not found.</h3>
      <button onClick={() => navigate('/admin/albums')} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', cursor: 'pointer' }}>Back to Albums</button>
    </div>
  );

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploading(true);
    setTimeout(() => {
      files.forEach((file, idx) => {
        const url = URL.createObjectURL(file);
        addPhotoToAlbum(album.id, { id: Date.now() + idx, img: url });
      });
      setIsUploading(false);
      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} added!`);
    }, 1200);
    e.target.value = '';
  };

  const confirmDeletePhoto = () => {
    deletePhotoFromAlbum(album.id, deletingPhotoId);
    toast.success('Photo removed from album.');
    setDeletingPhotoId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/admin/albums')}
            style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
            <ChevronLeft size={20} />
          </motion.button>
          <div>
            <h2 style={{ fontSize: '24px' }}>{album.title}</h2>
            <p style={{ color: 'var(--text-sub)', fontSize: '14px' }}>{album.count} photos · {album.description}</p>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
          style={{ padding: '0 20px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))', color: 'white', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {isUploading ? 'Uploading...' : 'Add Photos'}
        </motion.button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />

      {album.photos.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '80px', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
          <ImageIcon size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-sub)', marginBottom: '8px' }}>No photos yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Click here or use the button above to upload photos.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {album.photos.map((photo) => (
            <motion.div key={photo.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} layout
              style={{ borderRadius: '16px', overflow: 'hidden', position: 'relative', aspectRatio: '1/1', group: 'photo' }}>
              <img src={photo.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setDeletingPhotoId(photo.id)}
                  style={{ position: 'absolute', top: '10px', right: '10px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,82,82,0.85)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                  <Trash2 size={14} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDialog isOpen={!!deletingPhotoId} title="Remove Photo?" description="This photo will be removed from the album permanently." onConfirm={confirmDeletePhoto} onCancel={() => setDeletingPhotoId(null)} />
    </div>
  );
};

export default AlbumDetailAdmin;
