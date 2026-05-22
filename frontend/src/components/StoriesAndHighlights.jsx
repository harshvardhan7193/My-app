import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Play, Eye, Heart, Film, Image as ImageIcon, Check, Trash2, FolderPlus, ArrowLeft } from 'lucide-react';
import api from '../utils/api';

const StoriesAndHighlights = ({ currentUser, partnerUser }) => {
  const [activeStories, setActiveStories] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [archivedStories, setArchivedStories] = useState([]);
  
  // Modals / Player state
  const [storyPlayer, setStoryPlayer] = useState({ isOpen: false, stories: [], startIndex: 0, title: '' });
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showCreateHighlight, setShowCreateHighlight] = useState(false);
  
  // Create Story Form State
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Create Highlight Form State
  const [highlightTitle, setHighlightTitle] = useState('');
  const [selectedStoriesForHighlight, setSelectedStoriesForHighlight] = useState([]);
  const [savingHighlight, setSavingHighlight] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchStoriesAndHighlights();
  }, []);

  const fetchStoriesAndHighlights = async () => {
    try {
      const [storiesData, highlightsData] = await Promise.all([
        api.getStories(),
        api.getHighlights()
      ]);
      setActiveStories(storiesData || []);
      setHighlights(highlightsData || []);
    } catch (err) {
      console.error('Error fetching stories/highlights:', err);
    }
  };

  const fetchArchive = async () => {
    try {
      const archive = await api.getArchivedStories();
      setArchivedStories(archive || []);
    } catch (err) {
      console.error('Error fetching story archive:', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostStory = async () => {
    if (!mediaFile) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      // 1. Upload to Cloudinary
      const uploadRes = await api.uploadFileWithProgress(mediaFile, (percent) => {
        setUploadProgress(percent);
      });
      const mediaUrl = uploadRes.url;
      const mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';

      // 2. Create story in DB
      const newStory = await api.createStory({
        mediaUrl,
        mediaType,
        caption
      });

      // Update local state
      setActiveStories(prev => [...prev, newStory]);
      
      // Reset form
      setMediaFile(null);
      setMediaPreview('');
      setCaption('');
      setShowCreateStory(false);
    } catch (err) {
      console.error('Error posting story:', err);
      alert('Failed to post story. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateHighlight = async () => {
    if (!highlightTitle.trim() || selectedStoriesForHighlight.length === 0) return;
    try {
      setSavingHighlight(true);
      // Use the media of the first story as the cover
      const coverUrl = selectedStoriesForHighlight[0].mediaUrl;
      const newHighlight = await api.createHighlight({
        title: highlightTitle,
        coverUrl,
        stories: selectedStoriesForHighlight.map(s => s._id)
      });

      setHighlights(prev => [newHighlight, ...prev]);
      
      // Reset
      setHighlightTitle('');
      setSelectedStoriesForHighlight([]);
      setShowCreateHighlight(false);
    } catch (err) {
      console.error('Error saving highlight:', err);
      alert('Failed to create highlight.');
    } finally {
      setSavingHighlight(false);
    }
  };

  const toggleSelectStoryForHighlight = (story) => {
    if (selectedStoriesForHighlight.some(s => s._id === story._id)) {
      setSelectedStoriesForHighlight(prev => prev.filter(s => s._id !== story._id));
    } else {
      setSelectedStoriesForHighlight(prev => [...prev, story]);
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('Are you sure you want to delete this story?')) return;
    try {
      await api.deleteStory(storyId);
      setActiveStories(prev => prev.filter(s => s._id !== storyId));
      
      // If playing, close or move to next
      if (storyPlayer.isOpen) {
        const remaining = storyPlayer.stories.filter(s => s._id !== storyId);
        if (remaining.length === 0) {
          setStoryPlayer({ isOpen: false, stories: [], startIndex: 0, title: '' });
        } else {
          setStoryPlayer(prev => ({
            ...prev,
            stories: remaining,
            startIndex: Math.min(prev.startIndex, remaining.length - 1)
          }));
        }
      }
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  const handleDeleteHighlight = async (highlightId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this highlight permanently?')) return;
    try {
      await api.deleteHighlight(highlightId);
      setHighlights(prev => prev.filter(h => h._id !== highlightId));
    } catch (err) {
      console.error('Failed to delete highlight:', err);
    }
  };

  const openCreateHighlightModal = () => {
    fetchArchive();
    setShowCreateHighlight(true);
  };

  // Group active stories by User
  const myStories = activeStories.filter(s => s.user?._id === currentUser?._id);
  const partnerStories = activeStories.filter(s => s.user?._id === partnerUser?._id);

  const hasMyStories = myStories.length > 0;
  const hasPartnerStories = partnerStories.length > 0;

  // Determine ring border styling
  const getRingStyle = (hasStories, isPartner) => {
    if (!hasStories) return { border: '2px dashed var(--text-muted)' };
    return {
      background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      padding: '3px'
    };
  };

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600 }}>Highlights & Stories</h3>
        <button 
          onClick={() => setShowCreateStory(true)}
          style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: 'var(--blush-pink)', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Plus size={14} /> Add Story
        </button>
      </div>

      {/* Stories/Highlights Horizontal Tray */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '16px', 
          overflowX: 'auto', 
          paddingBottom: '8px', 
          alignItems: 'center' 
        }} 
        className="hide-scrollbar"
      >
        {/* 1. Current User Story Circle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <div 
            onClick={() => {
              if (hasMyStories) {
                setStoryPlayer({ isOpen: true, stories: myStories, startIndex: 0, title: 'Your Story' });
              } else {
                setShowCreateStory(true);
              }
            }}
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              ...getRingStyle(hasMyStories, false)
            }}
          >
            <div style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%', 
              overflow: 'hidden', 
              border: hasMyStories ? '2px solid var(--card-bg)' : 'none',
              backgroundColor: 'var(--chat-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="You" />
              ) : (
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{currentUser?.name?.[0]}</span>
              )}
            </div>
          </div>
          <span style={{ fontSize: '12px', marginTop: '6px', fontWeight: 500, opacity: 0.9 }}>You</span>
          {!hasMyStories && (
            <div 
              onClick={() => setShowCreateStory(true)}
              style={{
                position: 'absolute',
                bottom: '22px',
                right: '0px',
                backgroundColor: 'var(--blush-pink)',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--card-bg)',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
              }}
            >
              <Plus size={12} color="white" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* 2. Partner Story Circle */}
        {partnerUser && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div 
              onClick={() => {
                if (hasPartnerStories) {
                  setStoryPlayer({ 
                    isOpen: true, 
                    stories: partnerStories, 
                    startIndex: 0, 
                    title: `${partnerUser.name.split(' ')[0]}'s Story` 
                  });
                }
              }}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: hasPartnerStories ? 'pointer' : 'default',
                ...getRingStyle(hasPartnerStories, true)
              }}
            >
              <div style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                overflow: 'hidden', 
                border: hasPartnerStories ? '2px solid var(--card-bg)' : 'none',
                backgroundColor: 'var(--chat-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: hasPartnerStories ? 1 : 0.6
              }}>
                {partnerUser.avatar ? (
                  <img src={partnerUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Partner" />
                ) : (
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{partnerUser.name?.[0]}</span>
                )}
              </div>
            </div>
            <span style={{ fontSize: '12px', marginTop: '6px', fontWeight: 500, opacity: 0.9 }}>
              {partnerUser.name.split(' ')[0]}
            </span>
          </div>
        )}

        {/* Divider */}
        <div style={{ width: '1px', height: '50px', backgroundColor: 'var(--border-light)', flexShrink: 0 }} />

        {/* 3. Instagram Highlights Circles */}
        {highlights.map((hl) => (
          <div key={hl._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div 
              onClick={() => setStoryPlayer({ isOpen: true, stories: hl.stories, startIndex: 0, title: hl.title })}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                border: '1.5px solid var(--border-light)',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: 'var(--card-bg)'
              }}
            >
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                <img src={hl.coverUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={hl.title} />
              </div>
            </div>
            <span style={{ fontSize: '12px', marginTop: '6px', fontWeight: 500, maxWidth: '75px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.9 }}>
              {hl.title}
            </span>
            {/* Owner delete button */}
            {hl.createdBy === currentUser?._id && (
              <button 
                onClick={(e) => handleDeleteHighlight(hl._id, e)}
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '9px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}

        {/* 4. "+ New Highlight" Circle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div 
            onClick={openCreateHighlightModal}
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              border: '2px dashed var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: 'var(--card-bg)'
            }}
          >
            <FolderPlus size={22} color="var(--text-sub)" />
          </div>
          <span style={{ fontSize: '12px', marginTop: '6px', fontWeight: 500, color: 'var(--text-sub)' }}>New Highlight</span>
        </div>
      </div>

      {/* FULLSCREEN STORY PLAYER */}
      <AnimatePresence>
        {storyPlayer.isOpen && (
          <StoryPlayerPortal 
            player={storyPlayer}
            currentUser={currentUser}
            onClose={() => setStoryPlayer({ isOpen: false, stories: [], startIndex: 0, title: '' })}
            onDelete={handleDeleteStory}
          />
        )}
      </AnimatePresence>

      {/* MODAL: CREATE STORY */}
      <AnimatePresence>
        {showCreateStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', 
              inset: 0, 
              backgroundColor: 'rgba(0,0,0,0.85)', 
              zIndex: 3000, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ 
                width: '100%', 
                maxWidth: '400px', 
                backgroundColor: 'var(--menu-bg)', 
                borderRadius: '28px', 
                padding: '24px', 
                position: 'relative',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                color: 'var(--text-main)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Create New Story</h3>
                <X onClick={() => setShowCreateStory(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>

              {/* Upload Drop Zone / Preview */}
              <div 
                onClick={() => fileInputRef.current.click()}
                style={{ 
                  width: '100%', 
                  height: '240px', 
                  borderRadius: '20px', 
                  border: '2px dashed var(--border-light)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  overflow: 'hidden',
                  cursor: 'pointer',
                  backgroundColor: 'var(--chat-bg)',
                  position: 'relative',
                  marginBottom: '16px'
                }}
              >
                {mediaPreview ? (
                  <>
                    <img src={mediaPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)' }} />
                    <span style={{ position: 'absolute', bottom: '12px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 12px', borderRadius: '100px', fontSize: '11px' }}>Change photo</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={40} color="var(--blush-pink)" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>Upload Media</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Tap to select an image</p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />

              {/* Caption Input */}
              <input 
                type="text" 
                placeholder="Write a caption..." 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--chat-bg)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '14px',
                  marginBottom: '20px'
                }}
              />

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowCreateStory(false)}
                  className="btn-primary" 
                  style={{ 
                    flex: 1, 
                    backgroundColor: 'rgba(0,0,0,0.05)', 
                    color: 'var(--text-main)', 
                    boxShadow: 'none',
                    padding: '12px 20px',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePostStory}
                  disabled={uploading || !mediaFile}
                  className="btn-primary" 
                  style={{ 
                    flex: 2, 
                    padding: '12px 20px', 
                    fontSize: '14px',
                    opacity: (!mediaFile || uploading) ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {uploading ? `Posting (${uploadProgress}%)...` : 'Share Story'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE HIGHLIGHT */}
      <AnimatePresence>
        {showCreateHighlight && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', 
              inset: 0, 
              backgroundColor: 'rgba(0,0,0,0.85)', 
              zIndex: 3000, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ 
                width: '100%', 
                maxWidth: '420px', 
                backgroundColor: 'var(--menu-bg)', 
                borderRadius: '28px', 
                padding: '24px', 
                position: 'relative',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                color: 'var(--text-main)',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>New Highlight</h3>
                <X onClick={() => setShowCreateHighlight(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>

              {/* Title Input */}
              <input 
                type="text" 
                placeholder="Highlight Name (e.g. Summer Vacation)" 
                value={highlightTitle}
                onChange={(e) => setHighlightTitle(e.target.value)}
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--chat-bg)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '14px',
                  marginBottom: '16px'
                }}
              />

              <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '10px', fontWeight: 600 }}>Select Stories:</p>

              {/* Grid of Archived Stories */}
              <div 
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '8px',
                  marginBottom: '20px',
                  minHeight: '180px',
                  paddingRight: '4px'
                }}
                className="hide-scrollbar"
              >
                {archivedStories.length === 0 ? (
                  <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                    No stories found in your archive to highlight.
                  </div>
                ) : (
                  archivedStories.map((story) => {
                    const isSelected = selectedStoriesForHighlight.some(s => s._id === story._id);
                    return (
                      <div 
                        key={story._id}
                        onClick={() => toggleSelectStoryForHighlight(story)}
                        style={{
                          aspectRatio: '3/4',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          position: 'relative',
                          cursor: 'pointer',
                          border: isSelected ? '3px solid var(--blush-pink)' : '1px solid var(--border-light)'
                        }}
                      >
                        <img src={story.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Archive Story" />
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            backgroundColor: 'var(--blush-pink)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '4px 6px',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          fontSize: '8px'
                        }}>
                          {new Date(story.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowCreateHighlight(false)}
                  className="btn-primary" 
                  style={{ 
                    flex: 1, 
                    backgroundColor: 'rgba(0,0,0,0.05)', 
                    color: 'var(--text-main)', 
                    boxShadow: 'none',
                    padding: '12px 20px',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateHighlight}
                  disabled={savingHighlight || !highlightTitle.trim() || selectedStoriesForHighlight.length === 0}
                  className="btn-primary" 
                  style={{ 
                    flex: 2, 
                    padding: '12px 20px', 
                    fontSize: '14px',
                    opacity: (savingHighlight || !highlightTitle.trim() || selectedStoriesForHighlight.length === 0) ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {savingHighlight ? 'Creating...' : 'Create Highlight'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// PORTAL-STYLE INNER PLAYER COMPONENT FOR FULLSCREEN DISPLAY
const StoryPlayerPortal = ({ player, currentUser, onClose, onDelete }) => {
  const [currentIndex, setCurrentIndex] = useState(player.startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeStory = player.stories[currentIndex];

  const duration = 5000; // 5 seconds per story
  const timerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Restart progress when story changes
  useEffect(() => {
    setProgress(0);
    setPaused(false);
    
    // Register standard viewer API call if it's someone else's story
    if (activeStory && activeStory.user?._id !== currentUser?._id) {
      api.viewStory(activeStory._id).catch(console.error);
    }
  }, [currentIndex]);

  // Main story progression timer
  useEffect(() => {
    if (paused) {
      clearInterval(progressIntervalRef.current);
      return;
    }

    const intervalStep = 100; // Update every 100ms
    const totalSteps = duration / intervalStep;
    let stepCount = (progress / 100) * totalSteps;

    progressIntervalRef.current = setInterval(() => {
      stepCount += 1;
      const newProgress = (stepCount / totalSteps) * 100;

      if (newProgress >= 100) {
        setProgress(100);
        clearInterval(progressIntervalRef.current);
        handleNext();
      } else {
        setProgress(newProgress);
      }
    }, intervalStep);

    return () => clearInterval(progressIntervalRef.current);
  }, [currentIndex, paused, progress]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < player.stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose(); // End of stories
    }
  };

  const handleTap = (e) => {
    const tapWidth = window.innerWidth;
    const clickX = e.clientX;

    if (clickX < tapWidth * 0.3) {
      // Tap Left -> Previous
      handlePrev();
    } else {
      // Tap Right -> Next
      handleNext();
    }
  };

  if (!activeStory) return null;

  const timeString = () => {
    const hours = Math.floor((new Date() - new Date(activeStory.createdAt)) / (1000 * 60 * 60));
    if (hours === 0) return 'Just now';
    return `${hours}h ago`;
  };

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
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
    >
      {/* Player Container capped at 430px wide like standard app */}
      <div 
        style={{
          width: '100%',
          maxWidth: '430px',
          height: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0a0a',
          overflow: 'hidden'
        }}
      >
        {/* Click zones */}
        <div 
          onClick={handleTap}
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10
          }}
        />

        {/* Stories Top Progress Indicators */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '12px',
          right: '12px',
          display: 'flex',
          gap: '4px',
          zIndex: 20
        }}>
          {player.stories.map((s, idx) => {
            let width = '0%';
            if (idx < currentIndex) width = '100%';
            if (idx === currentIndex) width = `${progress}%`;
            return (
              <div 
                key={s._id} 
                style={{ 
                  flex: 1, 
                  height: '3px', 
                  backgroundColor: 'rgba(255,255,255,0.3)', 
                  borderRadius: '2px', 
                  overflow: 'hidden' 
                }}
              >
                <div 
                  style={{ 
                    height: '100%', 
                    backgroundColor: 'white', 
                    width: width,
                    transition: idx === currentIndex ? 'none' : 'width 0.1s linear'
                  }} 
                />
              </div>
            );
          })}
        </div>

        {/* Story Header (Poster Avatar, Info & Controls) */}
        <div style={{
          position: 'absolute',
          top: '36px',
          left: '16px',
          right: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 20,
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid white' }}>
              <img src={activeStory.user?.avatar || 'https://i.pravatar.cc/200'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="User" />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600 }}>
                {activeStory.user?.name || player.title}
              </p>
              <p style={{ fontSize: '10px', opacity: 0.6, marginTop: '-2px' }}>
                {timeString()}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 30 }}>
            {/* Delete button (only for current user's active story) */}
            {activeStory.user?._id === currentUser?._id && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(activeStory._id);
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'var(--blush-pink)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Media Viewer */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
          {activeStory.mediaType === 'video' ? (
            <video 
              src={activeStory.mediaUrl} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', maxHeight: '80%', objectFit: 'contain' }} 
            />
          ) : (
            <img 
              src={activeStory.mediaUrl} 
              style={{ width: '100%', maxHeight: '80%', objectFit: 'contain' }} 
              alt="Story Content" 
            />
          )}
        </div>

        {/* Story Bottom Caption Overlay */}
        {activeStory.caption && (
          <div style={{
            position: 'absolute',
            bottom: activeStory.user?._id === currentUser?._id ? '64px' : '32px',
            left: '16px',
            right: '16px',
            padding: '16px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            color: 'white',
            textAlign: 'center',
            fontSize: '14px',
            zIndex: 15,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {activeStory.caption}
          </div>
        )}

        {/* Story Views Counter (Only if owner) */}
        {activeStory.user?._id === currentUser?._id && (
          <div style={{
            height: '48px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'white',
            zIndex: 15,
            fontSize: '12px'
          }}>
            <Eye size={16} />
            <span>{activeStory.views?.length || 0} views</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StoriesAndHighlights;
