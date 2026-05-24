import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Heart, Paperclip, MoreVertical, Search, Phone, Video, ChevronLeft, X, ChevronUp, ChevronDown, Camera, Image as ImageIcon, Play, FileText, Music2, Download, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { subscribeMessages, pushMessage } from '../config/firebase';
import chatBgLight from '../assets/images/chat background/theme1 light.jpg';
import chatBgDark from '../assets/images/chat background/theme1 dark.png';

const Chat = () => {
  const navigate = useNavigate();

  // Identity / partner — loaded from the backend, with a localStorage fallback for display while loading
  const [me, setMe] = useState(null);
  const [partner, setPartner] = useState(null);
  const user = React.useMemo(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return {
      role: 'male',
      name: 'Harsh Panchal',
      partnerName: 'Neha Panchal',
      avatar: 'https://i.pravatar.cc/200?u=Harsh',
      partnerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop',
    };
  }, []);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadingLabel, setUploadingLabel] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    typeof document !== 'undefined' && document.body.classList.contains('dark-mode')
  );
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const didInitialScrollRef = useRef(false);

  const scrollToBottom = (behavior = 'smooth') => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    if (!messages.length) return;

    if (!didInitialScrollRef.current) {
      // On first open, jump directly to the latest message.
      scrollToBottom('auto');

      // One extra settle pass for media/animation layout shifts.
      setTimeout(() => scrollToBottom('auto'), 120);
      didInitialScrollRef.current = true;
      return;
    }

    // After initial open, keep normal smooth scrolling behavior.
    scrollToBottom('smooth');
  }, [messages]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const updateTheme = () => {
      setIsDarkMode(document.body.classList.contains('dark-mode'));
    };

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
    updateTheme();

    return () => observer.disconnect();
  }, []);

  // Bootstrap: resolve current user + partner, then subscribe to the couple's live message stream
  useEffect(() => {
    let unsub = null;
    let cancelled = false;
    (async () => {
      try {
        const [meData, partnerData] = await Promise.all([
          api.getMe(),
          api.getPartner().catch(() => null),
        ]);
        if (cancelled) return;
        setMe(meData);
        setPartner(partnerData);

        if (meData?.coupleId) {
          unsub = subscribeMessages(meData.coupleId, (msgs) => {
            if (!cancelled) setMessages(msgs);
          });
        }
      } catch (err) {
        console.error('Chat bootstrap failed:', err);
      }
    })();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !me?.coupleId) return;
    setInputText('');
    try {
      await pushMessage(me.coupleId, {
        text,
        sender: String(me._id),
        type: 'text',
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputText(text);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const sendHeart = async () => {
    if (!me?.coupleId) return;
    try {
      await pushMessage(me.coupleId, {
        text: '❤️',
        sender: String(me._id),
        type: 'text',
      });
    } catch (err) {
      console.error('Failed to send heart:', err);
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const matches = messages
        .filter(m => (m.text || '').toLowerCase().includes(searchQuery.toLowerCase()))
        .map(m => m.id);

      if (matches.length > 0) {
        setSearchResults(matches);
        const lastIndex = matches.length - 1;
        setCurrentResultIndex(lastIndex);
        scrollToMessage(matches[lastIndex]);
      } else {
        setSearchResults([]);
        setCurrentResultIndex(-1);
        triggerToast('No matches found');
      }
    }
  };

  const scrollToMessage = (id) => {
    const element = document.getElementById(`msg-${id}`);
    const container = scrollContainerRef.current;
    if (element && container) {
      const topPos = element.offsetTop;
      container.scrollTo({
        top: topPos - (container.offsetHeight / 2) + (element.offsetHeight / 2),
        behavior: 'smooth'
      });
      setHighlightedId(id);
      setTimeout(() => setHighlightedId(null), 2000);
    }
  };

  const navigateResults = (direction) => {
    if (searchResults.length === 0) return;
    let newIndex = currentResultIndex + direction;
    if (newIndex < 0) newIndex = searchResults.length - 1;
    if (newIndex >= searchResults.length) newIndex = 0;

    setCurrentResultIndex(newIndex);
    scrollToMessage(searchResults[newIndex]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !me?.coupleId) return;
    setShowAttachmentMenu(false);
    const mimeType = file.type || '';
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    const isAudio = mimeType.startsWith('audio/');
    const messageType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';
    const mediaKindLabel = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';

    setUploadingLabel(`Uploading ${mediaKindLabel}...`);
    setUploadProgress(5);
    triggerToast(`Uploading ${mediaKindLabel}...`);
    try {
      const uploadRes = await api.uploadFileWithProgress(file, (percentage) => {
        // Network upload progress can jump straight to 100% on fast links.
        // Keep this phase capped so 100% means the full send flow is complete.
        setUploadProgress((prev) => {
          const floor = typeof prev === 'number' ? prev : 5;
          return Math.max(floor, Math.min(95, percentage));
        });
      });
      setUploadingLabel('Sending message...');
      setUploadProgress(97);
      await pushMessage(me.coupleId, {
        type: messageType,
        mediaUrl: uploadRes.url,
        mediaPublicId: uploadRes.publicId,
        mediaMimeType: uploadRes.mimeType || mimeType,
        mediaName: uploadRes.originalFilename || file.name,
        mediaSize: uploadRes.size || file.size,
        mediaFormat: uploadRes.format,
        mediaResourceType: uploadRes.resourceType,
        sender: String(me._id),
      });
      setUploadProgress(100);
      setTimeout(() => {
        setUploadProgress(null);
        setUploadingLabel('');
      }, 250);
    } catch (err) {
      console.error('Failed to upload media:', err);
      setUploadProgress(null);
      setUploadingLabel('');
      triggerToast('Upload failed');
    }
  };

  // Local helpers for date grouping — derive a YYYY-MM-DD string from a RTDB createdAt (ms epoch)
  const dateKey = (createdAt) => {
    const d = createdAt ? new Date(createdAt) : new Date();
    return d.toISOString().split('T')[0];
  };
  const timeLabel = (createdAt) => {
    const d = createdAt ? new Date(createdAt) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatBytes = (bytes) => {
    if (!bytes || Number.isNaN(bytes)) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  };

  const openMediaViewer = (msg) => {
    navigate(`/chat-media/photo/${msg.id}`, {
      state: {
        mediaUrl: msg.mediaUrl,
        createdAt: msg.createdAt,
        sender: msg.sender,
        mediaType: msg.type,
      },
    });
  };

  const downloadAttachment = async (url, fileName) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback to opening in a new tab if blob download fails.
      window.open(url, '_blank', 'noopener,noreferrer');
      triggerToast('Unable to force download. Opened file in new tab.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--chat-bg)',
        backgroundImage: `linear-gradient(${isDarkMode ? 'rgba(0,0,0,0.45), rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.25), rgba(255,255,255,0.25)'}), url("${isDarkMode ? chatBgDark : chatBgLight}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Chat Header */}
      <div style={{
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-light)',
        zIndex: 10,
        position: 'sticky',
        top: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.div whileTap={{ scale: 0.9 }} onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer', padding: '4px' }}>
            <ChevronLeft size={24} color="var(--text-main)" />
          </motion.div>
          <div
            onClick={() => navigate('/partner-profile')}
            style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: 'var(--blush-pink)', overflow: 'hidden', cursor: 'pointer' }}
          >
            <img src={partner?.avatar || user.partnerAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
          </div>
          <div onClick={() => navigate('/partner-profile')} style={{ cursor: 'pointer' }}>
            <h4 style={{ fontSize: '16px' }}>{(partner?.name || user.partnerName || 'Partner').split(' ')[0]}</h4>
            <p style={{ fontSize: '12px', color: isMuted ? 'var(--text-muted)' : '#4CAF50' }}>
              {isMuted ? 'Notifications Muted' : (partner?.isOnline ? 'Online now' : 'Offline')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div onClick={() => setShowMenu(!showMenu)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <MoreVertical size={20} color="var(--text-secondary)" />
          </div>
        </div>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 60, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--menu-bg)',
                padding: '10px 20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                zIndex: 5
              }}
            >
              <Search size={18} color="var(--text-sub)" />
              <input
                autoFocus
                placeholder="Search in conversation..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchResults([]);
                  setCurrentResultIndex(-1);
                }}
                onKeyPress={handleSearch}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', background: 'transparent', color: 'var(--text-main)' }}
              />

              {searchResults.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sub)', fontSize: '12px' }}>
                  <span>{currentResultIndex + 1} of {searchResults.length}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <ChevronUp size={18} style={{ cursor: 'pointer' }} onClick={() => navigateResults(-1)} />
                    <ChevronDown size={18} style={{ cursor: 'pointer' }} onClick={() => navigateResults(1)} />
                  </div>
                </div>
              )}

              <X size={18} color="var(--text-sub)" onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} style={{ cursor: 'pointer' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        style={{ flex: 1, padding: '20px', overflowY: 'auto', position: 'relative' }}
        className="hide-scrollbar"
      >
        <AnimatePresence>
          {messages.map((msg, index) => {
            const msgDate = dateKey(msg.createdAt);
            const prevDate = index > 0 ? dateKey(messages[index - 1].createdAt) : null;
            const showDate = index === 0 || prevDate !== msgDate;
            const isMine = me && msg.sender === String(me._id);
            const msgTime = timeLabel(msg.createdAt);
            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div style={{ textAlign: 'center', margin: '16px 0 24px' }}>
                    <span style={{
                      padding: '4px 16px',
                      backgroundColor: 'var(--date-tag-bg)',
                      borderRadius: '100px',
                      fontSize: '11px',
                      color: 'var(--date-tag-text)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {formatDateLabel(msgDate)}
                    </span>
                  </div>
                )}
                <motion.div
                  id={`msg-${msg.id}`}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    display: 'flex',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                    marginBottom: '16px'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '75%',
                      padding: (msg.type === 'image' || msg.type === 'video') ? '4px' : '12px 18px',
                      borderRadius: isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      backgroundColor: highlightedId === msg.id
                        ? 'rgba(255, 183, 197, 0.4)'
                        : (isMine ? 'var(--bubble-me)' : 'var(--bubble-them)'),
                      color: isMine ? 'var(--msg-me-text)' : 'var(--msg-them-text)',
                      boxShadow: highlightedId === msg.id
                        ? '0 0 20px var(--blush-pink)'
                        : '0 4px 12px rgba(0,0,0,0.03)',
                      position: 'relative',
                      transition: 'all 0.3s ease',
                      border: highlightedId === msg.id ? '1px solid var(--blush-pink)' : 'none',
                      overflow: 'hidden'
                    }}
                  >
                    {msg.type === 'image' || msg.type === 'video' ? (
                      <div
                        style={{ position: 'relative', cursor: 'pointer' }}
                        onClick={() => openMediaViewer(msg)}
                      >
                        {msg.type === 'video' ? (
                          <video
                            src={msg.mediaUrl}
                            preload="metadata"
                            muted
                            playsInline
                            style={{ width: '100%', borderRadius: '16px', display: 'block', backgroundColor: '#000' }}
                          />
                        ) : (
                          <img
                            src={msg.mediaUrl}
                            style={{ width: '100%', borderRadius: '16px', display: 'block' }}
                            alt="Attachment"
                          />
                        )}
                        {msg.type === 'video' && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                          }}>
                            <div style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '26px',
                              backgroundColor: 'rgba(0,0,0,0.5)',
                              backdropFilter: 'blur(6px)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            }}>
                              <Play size={22} color="white" fill="white" style={{ marginLeft: '3px' }} />
                            </div>
                          </div>
                        )}
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.3)',
                          backdropFilter: 'blur(4px)',
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          <p style={{ fontSize: '10px', color: 'white' }}>{msgTime}</p>
                        </div>
                      </div>
                    ) : msg.type === 'audio' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Music2 size={16} />
                          <p style={{ fontSize: '13px', opacity: 0.85, fontWeight: 600, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {msg.mediaName || 'Audio file'}
                          </p>
                        </div>
                        <audio src={msg.mediaUrl} controls style={{ width: '100%' }} preload="metadata" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ fontSize: '10px', opacity: 0.65 }}>{formatBytes(msg.mediaSize)}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', display: 'inline-flex' }}>
                              <ExternalLink size={14} />
                            </a>
                            <button
                              type="button"
                              onClick={() => downloadAttachment(msg.mediaUrl, msg.mediaName)}
                              style={{ color: 'inherit', display: 'inline-flex', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              <Download size={14} />
                            </button>
                            <p style={{ fontSize: '10px', opacity: 0.65 }}>{msgTime}</p>
                          </div>
                        </div>
                      </div>
                    ) : msg.type === 'file' ? (
                      <div style={{ minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={18} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {msg.mediaName || 'File attachment'}
                            </p>
                            <p style={{ fontSize: '10px', opacity: 0.65 }}>
                              {[msg.mediaMimeType || 'file', formatBytes(msg.mediaSize)].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', display: 'inline-flex' }}>
                              <ExternalLink size={14} />
                            </a>
                            <button
                              type="button"
                              onClick={() => downloadAttachment(msg.mediaUrl, msg.mediaName)}
                              style={{ color: 'inherit', display: 'inline-flex', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              <Download size={14} />
                            </button>
                          </div>
                          <p style={{ fontSize: '10px', opacity: 0.65 }}>{msgTime}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p style={{ fontSize: '15px' }}>{msg.text}</p>
                        <p style={{
                          fontSize: '10px',
                          opacity: 0.6,
                          marginTop: '4px',
                          textAlign: 'right'
                        }}>{msgTime}</p>
                      </>
                    )}
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '0px 20px 24px 20px', position: 'relative' }}>
        {uploadProgress !== null && (
          <div
            style={{
              marginBottom: '10px',
              padding: '10px 12px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-light)',
              borderRadius: '14px',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{uploadingLabel}</span>
              <span style={{ color: 'var(--text-sub)' }}>{uploadProgress}%</span>
            </div>
            <div style={{ width: '100%', height: '7px', borderRadius: '999px', background: 'var(--border-light)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: 'var(--blush-pink)',
                  borderRadius: '999px',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}
        {/* Attachment Menu */}
        <AnimatePresence>
          {showAttachmentMenu && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                onClick={() => setShowAttachmentMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                style={{
                  position: 'absolute',
                  bottom: '80px',
                  left: '20px',
                  background: 'var(--menu-bg)',
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  padding: '8px',
                  width: '150px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div
                  onClick={() => cameraInputRef.current?.click()}
                  style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '10px' }}
                  className="hover-bg-soft"
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={18} color="#2196f3" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Camera</span>
                </div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '10px' }}
                  className="hover-bg-soft"
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f3e5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={18} color="#9c27b0" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Gallery</span>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="premium-card" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px 8px 16px',
          borderRadius: '100px',
          backgroundColor: 'var(--card-bg)'
        }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="*/*"
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileUpload}
            accept="*/*"
            capture="environment"
            style={{ display: 'none' }}
          />
          <Paperclip
            size={20}
            color="var(--text-muted)"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
          />
          <input
            type="text"
            placeholder="Type a love note..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              fontFamily: 'var(--font-body)',
              background: 'transparent',
              color: 'var(--text-main)'
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.div
              whileTap={{ scale: 0.9 }}
              onClick={sendHeart}
              style={{ padding: '8px', color: 'var(--blush-pink)', cursor: 'pointer' }}
            >
              <Heart size={20} fill="var(--blush-pink)" />
            </motion.div>
            <motion.div
              whileTap={{ scale: 0.9 }}
              onClick={handleSendMessage}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '20px',
                backgroundColor: 'var(--blush-pink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <Send size={18} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Global Menus & Overlays */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              style={{
                position: 'fixed',
                top: '70px',
                right: '20px',
                background: 'var(--menu-bg)',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                padding: '8px',
                width: '180px',
                zIndex: 100
              }}
            >
              {['View Profile', 'Search Messages', isMuted ? 'Unmute Notifications' : 'Mute Notifications'].map((item) => (
                <div
                  key={item}
                  onClick={() => {
                    if (item === 'View Profile') navigate('/partner-profile');
                    if (item === 'Search Messages') setShowSearch(true);
                    if (item.includes('Mute')) {
                      setIsMuted(!isMuted);
                      triggerToast(isMuted ? 'Notifications unmuted' : 'Notifications muted');
                    }
                    setShowMenu(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: 'var(--text-main)'
                  }}
                  className="hover-bg-soft"
                >
                  {item}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAttachmentMenu && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
              onClick={() => setShowAttachmentMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              style={{
                position: 'fixed',
                bottom: '80px',
                left: '20px',
                background: 'var(--menu-bg)',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                padding: '8px',
                width: '150px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div
                onClick={() => cameraInputRef.current?.click()}
                style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '10px' }}
                className="hover-bg-soft"
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={18} color="#2196f3" />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Camera</span>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '10px' }}
                className="hover-bg-soft"
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f3e5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={18} color="#9c27b0" />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Gallery</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed',
              bottom: '100px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '100px',
              fontSize: '14px',
              zIndex: 3000,
              pointerEvents: 'none'
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Chat;
