import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, MoreVertical, Share2, Loader2, Check, Play, Lock, Trash2, FolderOutput, X } from 'lucide-react';
import api from '../utils/api';
import {
  getAlbumUnlockToken,
  setAlbumUnlockToken,
  clearAlbumUnlockToken,
} from '../utils/vaultStore';

const AlbumDetail = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();

  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [totalUploadCount, setTotalUploadCount] = useState(0);
  const fileInputRef = useRef(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [availableAlbums, setAvailableAlbums] = useState([]);
  const longPressTimer = useRef(null);
  const justEnteredSelectionMode = useRef(false);

  // Chunked rendering: only mount the first N tiles, then load more in
  // batches as the user scrolls. Because un-mounted tiles never instantiate
  // their <img>/<video>, the network only fetches the chunks the user has
  // actually scrolled to.
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

  // Loads the album, transparently using the unlock token from the vault
  // store if there is one. If the album turns out to be private and we
  // don't (yet) have a valid token, the backend returns ALBUM_LOCKED and
  // we surface a PIN gate instead of the photo grid.
  const loadAlbum = async () => {
    setLoading(true);
    try {
      const unlockToken = getAlbumUnlockToken(albumId);
      const found = await api.getAlbumById(albumId, { unlockToken });
      setAlbum(found);
      setPhotos(found.photos || []);
      setVisibleCount(PAGE_SIZE);
      setLocked(false);
    } catch (err) {
      if (err.code === 'ALBUM_LOCKED' || err.code === 'ALBUM_UNLOCK_EXPIRED' || err.code === 'ALBUM_UNLOCK_INVALID') {
        // Stale or missing token — drop it and prompt for the PIN inline.
        clearAlbumUnlockToken(albumId);
        setAlbum(null);
        setPhotos([]);
        setLocked(true);
      } else {
        console.error('Error fetching album details:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId]);

  // Auto-load the next chunk when the bottom sentinel scrolls into view.
  useEffect(() => {
    if (loading) return undefined;
    if (visibleCount >= photos.length) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((n) => Math.min(n + PAGE_SIZE, photos.length));
        }
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, visibleCount, photos.length]);

  const handlePlusClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setIsUploading(true);
      setTotalUploadCount(files.length);
      setCurrentUploadIndex(0);
      setUploadProgress(0);
      try {
        // Upload each photo/video to Cloudinary and insert to album in MongoDB
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setCurrentUploadIndex(i + 1);
          setUploadProgress(0);
          const isVideo = file.type.startsWith('video');
          const mediaType = isVideo ? 'video' : 'image';

          const uploadRes = await api.uploadFileWithProgress(file, (percent) => {
            setUploadProgress(percent);
          });
          const secureUrl = uploadRes.url;
          const publicId = uploadRes.publicId;

          // Append photo/video to album in MongoDB
          const updatedAlbum = await api.addPhotoToAlbum(
            albumId,
            { img: secureUrl, publicId: publicId, mediaType: mediaType },
            { unlockToken: getAlbumUnlockToken(albumId) },
          );
          setAlbum(updatedAlbum);
          const nextPhotos = updatedAlbum.photos || [];
          setPhotos(nextPhotos);
          // Make sure newly uploaded items are visible (they're appended at
          // the end, which would otherwise be past the current chunk window).
          setVisibleCount((n) => Math.max(n, nextPhotos.length));
        }

        setUploadComplete(true);
        setTimeout(() => setUploadComplete(false), 2000);
      } catch (err) {
        console.error('Error uploading files:', err);
        alert('Failed to upload some files.');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setTotalUploadCount(0);
        setCurrentUploadIndex(0);
      }
    }
    e.target.value = '';
  };

  const handleTouchStart = (photoId) => {
    if (selectionMode) return;
    justEnteredSelectionMode.current = false;
    longPressTimer.current = setTimeout(() => {
      setSelectionMode(true);
      setSelectedPhotos(new Set([photoId]));
      justEnteredSelectionMode.current = true;
      longPressTimer.current = null;
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePhotoClick = (photoId, e) => {
    if (justEnteredSelectionMode.current) {
      justEnteredSelectionMode.current = false;
      return;
    }
    if (selectionMode) {
      if (e) e.preventDefault();
      setSelectedPhotos(prev => {
        const next = new Set(prev);
        if (next.has(photoId)) next.delete(photoId);
        else next.add(photoId);
        if (next.size === 0) setSelectionMode(false);
        return next;
      });
    } else {
      navigate(`/album/${albumId}/photo/${photoId}`);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedPhotos.size > 0) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDeleteSelected = async () => {
    setShowDeleteConfirm(false);
    try {
      const ids = Array.from(selectedPhotos);
      await api.deletePhotos(albumId, ids, { unlockToken: getAlbumUnlockToken(albumId) });
      setPhotos(photos.filter(p => !selectedPhotos.has(p._id || p.id)));
      setSelectionMode(false);
      setSelectedPhotos(new Set());
    } catch (err) {
      console.error('Failed to delete photos:', err);
      alert('Failed to delete selected items.');
    }
  };

  const openMoveModal = async () => {
    try {
      const allAlbums = await api.getAlbums();
      setAvailableAlbums(allAlbums.filter(a => (a._id || a.id) !== albumId));
      setShowMoveModal(true);
    } catch (err) {
      console.error('Failed to load albums:', err);
    }
  };

  const confirmMove = async (targetAlbumId) => {
    try {
      const ids = Array.from(selectedPhotos);
      await api.movePhotos(albumId, targetAlbumId, ids, { unlockToken: getAlbumUnlockToken(albumId) });
      setPhotos(photos.filter(p => !selectedPhotos.has(p._id || p.id)));
      setSelectionMode(false);
      setSelectedPhotos(new Set());
      setShowMoveModal(false);
    } catch (err) {
      console.error('Failed to move photos:', err);
      alert('Failed to move selected items.');
    }
  };

  const submitPin = async () => {
    if (!/^\d{4,6}$/.test(pinInput)) {
      setPinError('PIN must be 4–6 digits');
      return;
    }
    setPinBusy(true);
    setPinError('');
    try {
      const { unlockToken } = await api.unlockPrivateAlbum(albumId, pinInput);
      setAlbumUnlockToken(albumId, unlockToken);
      setPinInput('');
      await loadAlbum();
    } catch (err) {
      setPinError(err.message || 'Incorrect PIN');
    } finally {
      setPinBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
        Loading album details...
      </div>
    );
  }

  // Inline PIN gate. Reached when a private album is opened directly
  // (e.g. the user navigated via URL) without a fresh unlock token.
  if (locked) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          padding: '32px',
          height: '100vh',
          height: '100dvh',
          background: 'var(--app-bg)',
          color: 'var(--text-main)',
        }}
      >
        <div style={{ width: '72px', height: '72px', borderRadius: '36px', background: 'var(--chat-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={28} color="var(--blush-pink)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>This album is private</div>
          <div style={{ fontSize: '13px', color: 'var(--text-sub)' }}>Enter the PIN to unlock</div>
        </div>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          pattern="\d*"
          maxLength={6}
          placeholder="••••"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') submitPin(); }}
          style={{ width: '100%', maxWidth: '280px', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', fontSize: '24px', letterSpacing: '0.5em', color: 'var(--text-main)', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-main)' }}
        />
        {pinError && (
          <p style={{ fontSize: '13px', color: '#E45A6F', margin: 0 }}>{pinError}</p>
        )}
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '280px' }}>
          <button
            onClick={() => navigate('/albums')}
            style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-sub)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={submitPin}
            disabled={!pinInput || pinBusy}
            className="btn-primary"
            style={{ flex: 1, border: 'none' }}
          >
            {pinBusy ? 'Unlocking…' : 'Unlock'}
          </button>
        </div>
      </motion.div>
    );
  }

  if (!album) {
    return (
      <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)', gap: '16px' }}>
        <span>Album not found.</span>
        <button onClick={() => navigate('/albums')} className="btn-primary" style={{ border: 'none' }}>Go Back</button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        backgroundColor: 'var(--app-bg)', 
        height: '100vh',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
        {/* Header */}
        <div style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 100, 
          backgroundColor: 'var(--header-bg)', 
          backdropFilter: 'blur(10px)',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <motion.div whileTap={{ scale: 0.9 }} onClick={() => navigate('/albums')} style={{ cursor: 'pointer', color: 'var(--text-main)' }}>
              <ChevronLeft size={24} />
            </motion.div>
            <div>
              <h2 style={{ fontSize: '18px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {selectionMode ? `${selectedPhotos.size} selected` : album.title}
                {!selectionMode && album.isPrivate && (
                  <Lock size={14} color="var(--blush-pink)" style={{ flexShrink: 0 }} />
                )}
              </h2>
              {!selectionMode && (
                <p style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{photos.length} items</p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-sub)' }}>
            {selectionMode && (
              <motion.div whileTap={{ scale: 0.9 }} onClick={() => { setSelectionMode(false); setSelectedPhotos(new Set()); }} style={{ cursor: 'pointer' }}>
                <X size={24} />
              </motion.div>
            )}
          </div>
        </div>

        <div style={{ padding: '24px 20px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-sub)', marginBottom: '32px', lineHeight: 1.6 }}>
            {album.description}
          </p>

          {/* Masonry Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '8px' 
          }}>
            {photos.slice(0, visibleCount).map((photo) => {
              const photoId = photo._id || photo.id;
              const isSelected = selectedPhotos.has(photoId);
              return (
                <motion.div
                  key={photoId}
                  whileHover={{ scale: selectionMode ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => handlePhotoClick(photoId, e)}
                  onMouseDown={() => handleTouchStart(photoId)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onTouchStart={() => handleTouchStart(photoId)}
                  onTouchEnd={handleTouchEnd}
                  style={{ 
                    aspectRatio: '1/1', 
                    borderRadius: '12px', 
                    overflow: 'hidden',
                    backgroundColor: 'var(--chat-bg)',
                    cursor: 'pointer',
                    position: 'relative',
                    transform: isSelected ? 'scale(0.95)' : 'scale(1)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '16px',
                        backgroundColor: 'var(--blush-pink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Check size={20} color="white" />
                      </div>
                    </div>
                  )}
                  {photo.mediaType === 'video' || photo.img.match(/\.(mp4|webm|mov|avi|ogg)/i) || photo.img.includes('/video/upload/') ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    {photo.img.includes('/video/upload/') ? (
                      <img 
                        src={photo.img.replace(/\.[^/.]+$/, '.jpg').replace('/video/upload/', '/video/upload/w_350,h_350,c_limit,so_0/')} 
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        alt=""
                      />
                    ) : (
                      <video 
                        src={photo.img.includes('#t=') ? photo.img : `${photo.img}#t=0.1`} 
                        muted 
                        playsInline 
                        preload="metadata"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    )}
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: '10px',
                      padding: '4px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <Play size={10} fill="white" />
                    </div>
                  </div>
                ) : (
                  <img 
                    src={photo.img} 
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    alt=""
                  />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Bottom sentinel — when this scrolls into view, the next chunk loads. */}
          {visibleCount < photos.length && (
            <div
              ref={sentinelRef}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '24px 0 8px',
                color: 'var(--text-sub)',
                fontSize: '12px',
                fontFamily: 'var(--font-main)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              <Loader2 size={14} className="animate-spin" />
              Loading more
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        multiple 
        accept="image/*,video/*" 
        style={{ display: 'none' }} 
      />

      {/* Upload Status Overlay */}
      <AnimatePresence>
        {(isUploading || uploadComplete) && (
          <div style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000
          }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                backgroundColor: 'var(--card-bg)',
                padding: '12px 24px',
                borderRadius: '20px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid var(--border-light)',
                color: 'var(--text-main)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              {isUploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--dusty-rose)', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      Uploading {totalUploadCount > 1 ? `${currentUploadIndex} of ${totalUploadCount}` : 'memory'}...
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dusty-rose)', marginLeft: 'auto', fontFamily: 'monospace' }}>
                      {uploadProgress}%
                    </span>
                  </div>
                  
                  {/* Sleek Gradient Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'rgba(0,0,0,0.06)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${uploadProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--blush-pink), var(--dusty-rose))',
                      backgroundColor: 'var(--dusty-rose)',
                      borderRadius: '3px',
                      transition: 'width 0.2s ease-out'
                    }} />
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ backgroundColor: '#4CAF50', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                    <Check size={14} color="white" strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Media added to album!</span>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Add Button */}
      {!selectionMode && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePlusClick}
          style={{
            position: 'fixed',
            bottom: '60px',
            right: '30px',
            width: '56px',
            height: '56px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, var(--blush-pink), var(--dusty-rose))',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(255, 183, 197, 0.4)',
            zIndex: 1000,
            cursor: 'pointer'
          }}
        >
          <Plus size={24} />
        </motion.button>
      )}

      {/* Selection Action Bar */}
      <AnimatePresence>
        {selectionMode && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'var(--header-bg)',
              borderTop: '1px solid var(--border-light)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              backdropFilter: 'blur(10px)',
              zIndex: 1100,
              paddingBottom: 'env(safe-area-inset-bottom, 16px)'
            }}
          >
            <button
              onClick={handleDeleteSelected}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: '#E45A6F',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Trash2 size={24} />
              Delete
            </button>
            <button
              onClick={openMoveModal}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <FolderOutput size={24} />
              Move
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Modal */}
      <AnimatePresence>
        {showMoveModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
          }}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                width: '100%',
                backgroundColor: 'var(--card-bg)',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px 20px',
                maxHeight: '70vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)' }}>Move to Album</h3>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowMoveModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}
                >
                  <X size={24} />
                </motion.button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }} className="hide-scrollbar">
                {availableAlbums.length === 0 ? (
                  <p style={{ color: 'var(--text-sub)', textAlign: 'center', padding: '20px' }}>No other albums available.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {availableAlbums.map(a => (
                      <div
                        key={a._id || a.id}
                        onClick={() => confirmMove(a._id || a.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '12px',
                          borderRadius: '16px',
                          backgroundColor: 'var(--app-bg)',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--chat-bg)' }}>
                          {a.coverUrl || (a.photos && a.photos[0]) ? (
                            <img src={a.coverUrl || a.photos[0].img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          ) : null}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-main)' }}>{a.title}</p>
                          <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{a.count || (a.photos ? a.photos.length : 0)} items</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            padding: '20px'
          }}>
            <div 
              style={{ position: 'absolute', inset: 0 }} 
              onClick={() => setShowDeleteConfirm(false)} 
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '340px',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                border: '1px solid var(--border-light)',
                zIndex: 3001
              }}
            >
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 700, 
                color: 'var(--text-main)', 
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                Delete Items?
              </h3>
              <p style={{ 
                fontSize: '15px', 
                color: 'var(--text-sub)', 
                lineHeight: '1.5',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                Are you sure you want to delete {selectedPhotos.size} selected item{selectedPhotos.size > 1 ? 's' : ''}? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-light)',
                    background: 'var(--chat-bg)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={confirmDeleteSelected}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ff4d4d, #ff3333)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(255, 77, 77, 0.2)'
                  }}
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AlbumDetail;
