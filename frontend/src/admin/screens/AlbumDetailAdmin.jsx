import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Trash2, Image as ImageIcon, Lock, X, Eye,
} from 'lucide-react';
import { useAdminData } from '../data/AdminDataContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import api from '../../utils/api';

const fmtDate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString();
  } catch {
    return null;
  }
};

const AlbumDetailAdmin = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const { albums, deletePhotoFromAlbum } = useAdminData();
  const toast = useToast();

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [viewIndex, setViewIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const cached = albums.find((a) => String(a._id) === String(albumId));
        const data = await api.getAlbumById(albumId);
        if (!cancelled) setAlbum({ ...cached, ...data });
      } catch (err) {
        console.error(err);
        if (!cancelled) setAlbum(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [albumId, albums]);

  const photos = album?.photos || [];
  const viewingPhoto = viewIndex != null ? photos[viewIndex] : null;

  const goPrev = useCallback(() => {
    setViewIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setViewIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
  }, [photos.length]);

  useEffect(() => {
    if (viewIndex == null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setViewIndex(null);
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewIndex, goPrev, goNext]);

  if (loading) {
    return (
      <div className="admin-card" style={{ textAlign: 'center', padding: '80px' }}>
        <p style={{ color: 'var(--text-sub)' }}>Loading album…</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="admin-card" style={{ textAlign: 'center', padding: '80px' }}>
        <h3 style={{ color: 'var(--text-sub)' }}>Album not found.</h3>
        <button type="button" onClick={() => navigate('/admin/albums')} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', cursor: 'pointer' }}>Back to Albums</button>
      </div>
    );
  }

  const createdByName = album.createdBy?.name || 'Unknown';

  const confirmDeletePhoto = async () => {
    await deletePhotoFromAlbum(album._id, deletingPhotoId);
    setAlbum((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (
        String(p._id) === String(deletingPhotoId)
          ? { ...p, deletedAt: p.deletedAt || new Date().toISOString() }
          : p
      )),
    }));
    if (viewingPhoto && String(viewingPhoto._id) === String(deletingPhotoId)) {
      setViewIndex(null);
    }
    toast.success('Photo marked deleted (still visible to admin).');
    setDeletingPhotoId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => navigate('/admin/albums')}
            style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
            <ChevronLeft size={20} />
          </motion.button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '24px', margin: 0 }}>{album.title}</h2>
              {album.isPrivate && <span className="admin-badge warn"><Lock size={12} style={{ marginRight: 4 }} />Private</span>}
              {album.deletedAt && <span className="admin-badge danger">User deleted</span>}
            </div>
            <p style={{ color: 'var(--text-sub)', fontSize: '14px', marginTop: '6px' }}>
              {photos.length} photos · {album.description || 'No description'}
              {album.isPrivate && album.pinPlain ? ` · PIN: ${album.pinPlain}` : ''}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>By {createdByName}</p>
          </div>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '80px' }}>
          <ImageIcon size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-sub)', marginBottom: '8px' }}>No photos in this album</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {photos.map((photo, index) => (
            <motion.div
              key={photo._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              layout
              role="button"
              tabIndex={0}
              onClick={() => setViewIndex(index)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setViewIndex(index); }}
              className={`admin-photo-tile${photo.deletedAt ? ' admin-deleted-overlay' : ''}`}
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                position: 'relative',
                aspectRatio: '1/1',
                cursor: 'pointer',
                border: '1px solid var(--border-light)',
              }}
            >
              {photo.deletedAt && <span className="admin-deleted-label">User deleted</span>}
              {photo.mediaType === 'video' ? (
                <video src={photo.img} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} muted playsInline />
              ) : (
                <img src={photo.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
              )}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0)',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '12px',
                  pointerEvents: 'none',
                }}
                className="admin-photo-tile-hover"
              >
                <span style={{
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '100px',
                  background: 'rgba(0,0,0,0.65)',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
                >
                  <Eye size={14} /> View
                </span>
              </div>
              {!photo.deletedAt && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDeletingPhotoId(photo._id); }}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255,82,82,0.85)',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                    zIndex: 3,
                  }}
                >
                  <Trash2 size={14} />
                </motion.button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Full-screen viewer — works for all photos including user-deleted */}
      <AnimatePresence>
        {viewingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewIndex(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.92)',
              backdropFilter: 'blur(12px)',
              zIndex: 4000,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <p style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>
                  {viewIndex + 1} / {photos.length}
                  {viewingPhoto.deletedAt && (
                    <span className="admin-badge danger" style={{ marginLeft: '10px', verticalAlign: 'middle' }}>User deleted</span>
                  )}
                </p>
                {viewingPhoto.deletedAt && (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '4px' }}>
                    Deleted {fmtDate(viewingPhoto.deletedAt) || 'by user'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setViewIndex(null)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                minHeight: 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={goPrev}
                  style={{
                    flexShrink: 0,
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(255,255,255,0.15)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Previous"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              <motion.div
                key={viewingPhoto._id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                style={{
                  flex: 1,
                  maxWidth: 'min(900px, 100%)',
                  maxHeight: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                {viewingPhoto.mediaType === 'video' ? (
                  <video
                    src={viewingPhoto.img}
                    controls
                    autoPlay
                    style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 140px)', objectFit: 'contain' }}
                  />
                ) : (
                  <img
                    src={viewingPhoto.img}
                    alt=""
                    style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 140px)', objectFit: 'contain' }}
                  />
                )}
              </motion.div>

              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={goNext}
                  style={{
                    flexShrink: 0,
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(255,255,255,0.15)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Next"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '12px', flexShrink: 0 }}>
              Arrow keys to navigate · Esc to close
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deletingPhotoId}
        title="Soft-delete photo?"
        description="Users will no longer see this photo. As admin, you will still see it marked as deleted."
        onConfirm={confirmDeletePhoto}
        onCancel={() => setDeletingPhotoId(null)}
      />
    </div>
  );
};

export default AlbumDetailAdmin;
