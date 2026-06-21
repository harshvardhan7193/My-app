import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { X, Download, Share2, Heart, Info, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import api from '../utils/api';
import { getAlbumUnlockToken } from '../utils/vaultStore';

const PhotoView = () => {
  const { id, albumId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Chat-media mode: image source comes from the chat (RTDB) and is passed via
  // navigation state, since chat photos aren't fetchable by id from a REST API.
  const isChatMedia = location.pathname.startsWith('/chat-media/photo/');
  const [isLiked, setIsLiked] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [meta, setMeta] = useState(null);
  const [photosList, setPhotosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState(0); // 1 = swipe next (slide left), -1 = swipe prev (slide right)
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const videoRef = useRef(null);
  const swipeTouchStart = useRef({ x: 0, y: 0 });

  const canSwipe = photosList.length > 1 && !isChatMedia;

  useEffect(() => {
    if (!showControls) return;
    const timer = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [showControls, isPlaying]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlayPause = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.error(err));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!videoRef.current) return;
    const newMuteState = !isMuted;
    videoRef.current.muted = newMuteState;
    setIsMuted(newMuteState);
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const [isScrubbingActive, setIsScrubbingActive] = useState(false);
  const progressTrackRef = useRef(null);
  const isScrubbing = useRef(false);

  const handleScrub = (clientX) => {
    if (!progressTrackRef.current || duration === 0) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    let percentage = (clientX - rect.left) / rect.width;
    percentage = Math.max(0, Math.min(1, percentage)); // Clamp between 0 and 1
    const newTime = percentage * duration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handleGlobalMouseMove = (e) => {
    if (!isScrubbing.current) return;
    handleScrub(e.clientX);
  };

  const handleGlobalMouseUp = () => {
    isScrubbing.current = false;
    setIsScrubbingActive(false);
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleTouchStart = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    isScrubbing.current = true;
    setIsScrubbingActive(true);
    handleScrub(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!isScrubbing.current) return;
    handleScrub(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    isScrubbing.current = false;
    setIsScrubbingActive(false);
  };

  const handleMouseDown = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    isScrubbing.current = true;
    setIsScrubbingActive(true);
    handleScrub(e.clientX);
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
  };

  // Clear global event listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleContainerTap = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!showControls) {
      setShowControls(true);
    } else {
      togglePlayPause();
    }
  };

  // Butter-smooth slide transitions using spring physics
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? '100%' : dir < 0 ? '-100%' : 0,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.25 }
      }
    },
    exit: (dir) => ({
      x: dir > 0 ? '-100%' : dir < 0 ? '100%' : 0,
      opacity: 0,
      scale: 0.95,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.25 }
      }
    })
  };

  // Return to chat, specific album, or gallery depending on entry route
  const returnPath = isChatMedia ? '/chat' : (albumId ? `/album/${albumId}` : '/gallery');

  useEffect(() => {
    setIsZoomed(false);
  }, [id]);

  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        // Only set full loading spinner on initial mount (when list is empty)
        setIsPlaying(true);
        const isInitialLoad = photosList.length === 0;
        if (isInitialLoad) {
          setLoading(true);
        }

        if (isChatMedia) {
          // Chat media is passed in via navigation state from Chat.jsx —
          // there's no REST endpoint to refetch by id, so a hard refresh
          // here will simply show a "No image found" state.
          const stateData = location.state || {};
          if (stateData.mediaUrl) {
            setImageUrl(stateData.mediaUrl);
            const isVideo = stateData.mediaType === 'video'
              || /\.(mp4|webm|mov|avi|ogg)/i.test(stateData.mediaUrl)
              || stateData.mediaUrl.includes('/video/upload/');
            setMeta({
              name: isVideo ? 'Chat Video' : 'Chat Photo',
              date: stateData.createdAt
                ? new Date(stateData.createdAt).toLocaleDateString()
                : '',
              format: isVideo ? 'MP4' : 'JPEG',
              resolution: 'Original',
              size: 'Cloud',
              mediaType: isVideo ? 'video' : 'image',
            });
          }
          return;
        }

        if (albumId) {
          let currentPhotos = photosList;
          if (isInitialLoad) {
            // Use the by-id endpoint so private albums (which are excluded
            // from the generic /albums list) can also resolve their photos
            // — the unlock token, if any, comes from the vault store
            // populated when the user entered the album.
            try {
              const foundAlbum = await api.getAlbumById(albumId, {
                unlockToken: getAlbumUnlockToken(albumId),
              });
              if (foundAlbum) {
                currentPhotos = foundAlbum.photos || [];
                setPhotosList(currentPhotos);
              }
            } catch (err) {
              if (err.code === 'ALBUM_LOCKED' || err.code === 'ALBUM_UNLOCK_EXPIRED' || err.code === 'ALBUM_UNLOCK_INVALID') {
                // Token expired between AlbumDetail and PhotoView — bounce
                // back so the user can re-enter the PIN cleanly.
                navigate(`/album/${albumId}`, { replace: true });
                return;
              }
              throw err;
            }
          }
          const foundPhoto = currentPhotos.find(p => p._id === id);
          if (foundPhoto) {
            setImageUrl(foundPhoto.img);
            setMeta({
              name: 'Album Photo',
              date: new Date(foundPhoto.createdAt || Date.now()).toLocaleDateString(),
              format: foundPhoto.mediaType === 'video' ? 'MP4' : 'JPEG',
              resolution: 'Original',
              size: 'Cloud',
              mediaType: foundPhoto.mediaType || 'image'
            });
          }
        } else {
          let currentPhotos = photosList;
          if (isInitialLoad) {
            const memoriesData = await api.getMemories();
            currentPhotos = memoriesData.memories || memoriesData || [];
            setPhotosList(currentPhotos);
          }
          const foundMemory = currentPhotos.find(m => m._id === id);
          if (foundMemory) {
            setImageUrl(foundMemory.img);
            setMeta({
              name: foundMemory.title,
              date: new Date(foundMemory.date).toLocaleDateString(),
              category: foundMemory.category,
              description: foundMemory.description,
              format: 'JPEG',
              size: 'Cloud'
            });
            setIsLiked(foundMemory.favorite || false);
          }
        }
      } catch (err) {
        console.error('Error fetching photo:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPhoto();
  }, [id, albumId, photosList.length]);

  // Preload adjacent photos (3 previous and 3 next) to avoid buffering on swipe
  useEffect(() => {
    if (photosList.length === 0 || !id) return;

    const currentIndex = photosList.findIndex(p => p._id === id);
    if (currentIndex === -1) return;

    const preloadUrls = [];
    
    // Check up to 3 indices back and 3 indices forward
    for (let i = 1; i <= 3; i++) {
      const prevIdx = currentIndex - i;
      if (prevIdx >= 0) {
        const prevPhoto = photosList[prevIdx];
        if (prevPhoto && prevPhoto.img) {
          preloadUrls.push(prevPhoto.img);
        }
      }
      
      const nextIdx = currentIndex + i;
      if (nextIdx < photosList.length) {
        const nextPhoto = photosList[nextIdx];
        if (nextPhoto && nextPhoto.img) {
          preloadUrls.push(nextPhoto.img);
        }
      }
    }

    // Load images asynchronously in browser background cache
    preloadUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, [id, photosList]);

  const handleSwipe = (direction) => {
    // Find index of current item in list
    const currentIndex = photosList.findIndex(p => p._id === id);
    if (currentIndex !== -1) {
      const nextIndex = currentIndex + direction;
      if (nextIndex >= 0 && nextIndex < photosList.length) {
        setSwipeDirection(direction); // Track swipe direction for slide transitions
        const nextItem = photosList[nextIndex];
        const nextUrl = albumId
          ? `/album/${albumId}/photo/${nextItem._id}`
          : `/gallery/photo/${nextItem._id}`;
        navigate(nextUrl, { replace: true });
        setIsLiked(false);
      }
    }
  };

  const handleDragEnd = (event, info) => {
    if (isZoomed || !canSwipe) return;
    const swipeThreshold = 50;
    const velocityThreshold = 350;
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -swipeThreshold || velocity < -velocityThreshold) {
      handleSwipe(1);
    } else if (offset > swipeThreshold || velocity > velocityThreshold) {
      handleSwipe(-1);
    }
  };

  const handleSwipeTouchStart = (e) => {
    if (isZoomed || !canSwipe) return;
    const t = e.touches[0];
    swipeTouchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleSwipeTouchEnd = (e) => {
    if (isZoomed || !canSwipe) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeTouchStart.current.x;
    const dy = t.clientY - swipeTouchStart.current.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    handleSwipe(dx < 0 ? 1 : -1);
  };

  const swipeShellProps = {
    custom: swipeDirection,
    variants: slideVariants,
    initial: 'enter',
    animate: 'center',
    exit: 'exit',
    drag: canSwipe && !isZoomed ? 'x' : false,
    dragConstraints: { left: 0, right: 0 },
    dragElastic: 0.55,
    dragMomentum: false,
    onDragEnd: handleDragEnd,
    onTouchStart: handleSwipeTouchStart,
    onTouchEnd: handleSwipeTouchEnd,
    style: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      touchAction: isZoomed ? 'none' : 'pan-x pan-y',
    },
  };

  const zoomWrapperProps = {
    onTransformed: (ref) => setIsZoomed(ref.state.scale > 1.05),
    panning: { disabled: !isZoomed },
    pinch: { disabled: false },
    wheel: { disabled: true },
    doubleClick: { disabled: false },
  };

  const handleToggleLike = async () => {
    // Chat photos and album photos don't have a backend "favorite" toggle —
    // only gallery memories do. Fall back to a local UI-only toggle otherwise.
    if (!albumId && !isChatMedia) {
      try {
        const updated = await api.toggleFavorite(id);
        setIsLiked(updated.favorite);
      } catch (err) {
        console.error(err);
      }
    } else {
      setIsLiked(!isLiked);
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!imageUrl) return;

    let downloadUrl = imageUrl;
    
    // Convert Cloudinary URL to get the original master in highest quality (no auto-compression)
    if (imageUrl.includes('cloudinary.com')) {
      const uploadIndex = imageUrl.indexOf('/upload/');
      if (uploadIndex !== -1) {
        const prefix = imageUrl.substring(0, uploadIndex + 8);
        const suffix = imageUrl.substring(uploadIndex + 8);
        const parts = suffix.split('/');
        
        // Remove active transformation segment (e.g. q_auto:good,f_auto) to download the absolute original master file
        if (parts.length > 0 && !parts[0].startsWith('v') && !/^\d+$/.test(parts[0])) {
          parts.shift();
        }
        
        // Append fl_attachment to force direct saving, and q_100 for max original quality
        downloadUrl = `${prefix}fl_attachment,q_100/${parts.join('/')}`;
      }
    }

    try {
      // Direct download using fetch blob to preserve filename and force disk download
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Determine correct file extension
      const extension = imageUrl.split('.').pop().split('?')[0] || 'jpg';
      const fileName = meta?.name 
        ? `${meta.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`
        : `memory_photo.${extension}`;
        
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Error downloading image as blob:', err);
      // Fallback: Open transformed high quality link directly in a new tab (fl_attachment will still trigger download)
      window.open(downloadUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'black', color: 'white' }}>
        Loading photo...
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'black', 
        zIndex: 5000, 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}
    >
      {/* Top Bar */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        padding: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 12px) 24px 24px 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
        zIndex: 300
      }}>
        <motion.div 
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(returnPath)}
          style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
        >
          <X size={24} />
        </motion.div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <motion.div 
            whileTap={{ scale: 0.9 }}
            onClick={handleDownload}
            style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
          >
            <Download size={20} />
          </motion.div>
        </div>
      </div>

      {/* Main Image Container — pan-y was blocking horizontal swipes in WebView */}
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', overflow: 'hidden' }}>
        <AnimatePresence initial={false} custom={swipeDirection}>
          {imageUrl ? (
             meta?.mediaType === 'video' || imageUrl.match(/\.(mp4|webm|mov|avi|ogg)/i) || imageUrl.includes('/video/upload/') ? (
               <motion.div key={id} {...swipeShellProps} onTap={handleContainerTap}>
              <TransformWrapper {...zoomWrapperProps}>
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%', zIndex: 2 }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <motion.video 
                   ref={videoRef}
                   src={imageUrl}
                   autoPlay
                   loop
                   playsInline
                   onTimeUpdate={handleTimeUpdate}
                   onLoadedMetadata={handleLoadedMetadata}
                   style={{ 
                     maxWidth: '100%', 
                     maxHeight: '80vh', 
                     objectFit: 'contain',
                     boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                     outline: 'none',
                     cursor: isZoomed ? 'grab' : 'pointer',
                     touchAction: 'none',
                   }} 
                 />
                </TransformComponent>
              </TransformWrapper>

                 {/* Premium Glass Center Play Overlay */}
                 <AnimatePresence>
                   {!isPlaying && (
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.8 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.8 }}
                       onTap={togglePlayPause}
                       style={{
                         position: 'absolute',
                         zIndex: 10,
                         width: '72px',
                         height: '72px',
                         borderRadius: '36px',
                         backgroundColor: 'rgba(0,0,0,0.55)',
                         backdropFilter: 'blur(10px)',
                         WebkitBackdropFilter: 'blur(10px)',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         color: 'white',
                         border: '1px solid rgba(255,255,255,0.25)',
                         boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                         cursor: 'pointer'
                       }}
                     >
                       <Play size={32} fill="white" style={{ marginLeft: '4px' }} />
                     </motion.div>
                   )}
                 </AnimatePresence>

                 {/* Floating Glass Video Controls Dock */}
                 <AnimatePresence>
                   {showControls && (
                     <motion.div
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: 20 }}
                       style={{
                         position: 'absolute',
                         bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 24px) + 125px)', 
                         left: '20px',
                         right: '20px',
                         backgroundColor: 'rgba(0, 0, 0, 0.45)',
                         backdropFilter: 'blur(20px)',
                         WebkitBackdropFilter: 'blur(20px)',
                         borderRadius: '20px',
                         padding: '16px 20px',
                         border: '1px solid rgba(255, 255, 255, 0.12)',
                         boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
                         zIndex: 500,
                         display: 'flex',
                         flexDirection: 'column',
                         gap: '12px'
                       }}
                       onPointerDown={(e) => e.stopPropagation()} // Prevent gesture conflicts on touch drag
                       onClick={(e) => e.stopPropagation()} // Prevent click through to pause
                     >
                        {/* Timeline Progress Bar */}
                        <div 
                          ref={progressTrackRef}
                          onMouseDown={handleMouseDown}
                          onTouchStart={handleTouchStart}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          style={{
                            width: '100%',
                            height: '24px', // Increased touch target height for perfect mobile grab
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            touchAction: 'none',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{
                            width: '100%',
                            height: '6px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: '3px',
                            position: 'relative'
                          }}>
                            <div style={{
                              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--blush-pink), var(--dusty-rose))',
                              borderRadius: '3px'
                            }} />
                            
                            {/* Small White thumb */}
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: `${duration ? (currentTime / duration) * 100 : 0}%`,
                              transform: `translate(-50%, -50%) scale(${isScrubbingActive ? 1.3 : 1})`,
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: 'white',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                              transition: 'transform 0.1s ease-out'
                            }} />
                          </div>
                        </div>

                       {/* Controls Row: Buttons and Time */}
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           {/* Play/Pause Button */}
                           <motion.button 
                             whileTap={{ scale: 0.9 }}
                             onClick={togglePlayPause}
                             style={{
                               background: 'none',
                               border: 'none',
                               color: 'white',
                               cursor: 'pointer',
                               display: 'flex',
                               alignItems: 'center',
                               padding: 0
                             }}
                           >
                             {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
                           </motion.button>

                           {/* Time Display */}
                           <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontFamily: 'monospace', fontWeight: 500 }}>
                             {formatTime(currentTime)} / {formatTime(duration)}
                           </span>
                         </div>

                         {/* Volume Mute/Unmute Button */}
                         <motion.button 
                           whileTap={{ scale: 0.9 }}
                           onClick={toggleMute}
                           style={{
                             background: 'none',
                             border: 'none',
                             color: 'white',
                             cursor: 'pointer',
                             display: 'flex',
                             alignItems: 'center',
                             padding: 0
                           }}
                         >
                           {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                         </motion.button>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </motion.div>
            ) : (
              <motion.div key={id} {...swipeShellProps} onDoubleClick={handleToggleLike}>
              <TransformWrapper {...zoomWrapperProps}>
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%', zIndex: 2 }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <motion.img 
                    src={imageUrl}
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '80vh', 
                      objectFit: 'contain',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                      cursor: isZoomed ? 'grab' : 'grab',
                      touchAction: 'none',
                    }} 
                  />
                </TransformComponent>
              </TransformWrapper>
              </motion.div>
            )
          ) : (
            <span style={{ color: 'white' }}>No image found</span>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Bar */}
      <div style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: '24px 24px calc(max(env(safe-area-inset-bottom, 0px), 24px) + 32px) 24px', 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '40px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
        zIndex: 300, pointerEvents: 'none'
      }}>
        <motion.div 
          whileTap={{ scale: 0.8 }} 
          onClick={handleToggleLike}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'white', cursor: 'pointer', pointerEvents: 'auto' }}
        >
          <motion.div 
            animate={isLiked ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 0.3 }}
            style={{ width: '56px', height: '56px', borderRadius: '28px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Heart size={24} fill={isLiked ? "#FF4D4D" : "none"} color={isLiked ? "#FF4D4D" : "white"} />
          </motion.div>
          <span style={{ fontSize: '12px' }}>Like</span>
        </motion.div>

        <motion.div 
          whileTap={{ scale: 0.8 }} 
          onClick={() => setShowInfo(true)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'white', cursor: 'pointer', pointerEvents: 'auto' }}
        >
          <div style={{ width: '56px', height: '56px', borderRadius: '28px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Info size={24} />
          </div>
          <span style={{ fontSize: '12px' }}>Details</span>
        </motion.div>
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && meta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          >
            <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowInfo(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ 
                width: '290px', 
                background: 'rgba(255, 255, 255, 0.08)', 
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                borderRadius: '24px', 
                padding: '20px', 
                position: 'relative',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>Image Info</h3>
                <X onClick={() => setShowInfo(false)} size={18} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                {[
                  { label: 'Title', value: meta.name || 'Untitled' },
                  { label: 'Date', value: meta.date },
                  { label: 'Category', value: meta.category || 'General' },
                  { label: 'Resolution', value: meta.resolution || 'Original' },
                  { label: 'Format', value: meta.format || 'JPEG' }
                ].map((info, idx, arr) => (
                  <div 
                    key={info.label} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '10px 0', 
                      fontSize: '13px',
                      borderBottom: idx === arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{info.label}</span>
                    <span style={{ color: 'white', fontWeight: 500, maxWidth: '65%', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.value}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowInfo(false)}
                style={{ 
                  width: '100%', 
                  marginTop: '20px', 
                  padding: '10px', 
                  borderRadius: '12px', 
                  background: 'rgba(255, 255, 255, 0.14)', 
                  color: 'white', 
                  border: '1px solid rgba(255, 255, 255, 0.18)', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PhotoView;
