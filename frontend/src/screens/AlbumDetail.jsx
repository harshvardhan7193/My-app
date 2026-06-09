import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, MoreVertical, Share2, Loader2, Check, Play, Lock } from 'lucide-react';
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
                {album.title}
                {album.isPrivate && (
                  <Lock size={14} color="var(--blush-pink)" style={{ flexShrink: 0 }} />
                )}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{photos.length} items</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-sub)' }}>
            <Share2 size={20} />
            <MoreVertical size={20} />
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
            {photos.slice(0, visibleCount).map((photo) => (
              <motion.div
                key={photo._id || photo.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/album/${albumId}/photo/${photo._id || photo.id}`)}
                style={{ 
                  aspectRatio: '1/1', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  backgroundColor: 'var(--chat-bg)',
                  cursor: 'pointer'
                }}
              >
                {photo.mediaType === 'video' || photo.img.match(/\.(mp4|webm|mov|avi|ogg)/i) || photo.img.includes('/video/upload/') ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <video 
                      src={photo.img} 
                      muted 
                      playsInline 
                      preload="metadata"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
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
            ))}
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
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handlePlusClick}
        style={{
          position: 'fixed',
          bottom: '30px',
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
    </motion.div>
  );
};

export default AlbumDetail;
