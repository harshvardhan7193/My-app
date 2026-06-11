import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Image as ImageIcon, Video, FileText, Download, MoreVertical, Search, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import { subscribeMessages } from '../config/firebase';

const ChatMedia = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Photos');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = null;
    let cancelled = false;

    (async () => {
      try {
        const me = await api.getMe();
        if (!me?.coupleId || cancelled) {
          if (!cancelled) setLoading(false);
          return;
        }
        unsub = subscribeMessages(
          me.coupleId,
          (msgs) => {
            if (!cancelled) {
              setMessages(msgs);
              setLoading(false);
            }
          },
          1000
        );
      } catch (err) {
        console.error('Failed loading chat media:', err);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, []);

  const mediaData = useMemo(() => {
    const formatDate = (createdAt) => {
      if (!createdAt) return '';
      return new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

    const photos = messages
      .filter((m) => m.type === 'image' && !!m.mediaUrl)
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        url: m.mediaUrl,
        date: formatDate(m.createdAt),
        createdAt: m.createdAt,
        sender: m.sender,
      }));

    const videos = messages
      .filter((m) => m.type === 'video' && !!m.mediaUrl)
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        url: m.mediaUrl,
        date: formatDate(m.createdAt),
        createdAt: m.createdAt,
        sender: m.sender,
      }));

    const files = messages
      .filter((m) => (m.type === 'file' || m.type === 'audio') && !!m.mediaUrl)
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        url: m.mediaUrl,
        date: formatDate(m.createdAt),
        name: m.mediaName || (m.type === 'audio' ? 'Audio file' : 'File attachment'),
        size: formatBytes(m.mediaSize),
        mimeType: m.mediaMimeType || m.type,
      }));

    return {
      Photos: photos,
      Videos: videos,
      Files: files,
    };
  }, [messages]);

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
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        backgroundColor: 'var(--app-bg)', 
        minHeight: '100vh',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: 'var(--header-bg)', 
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <motion.div 
            whileTap={{ scale: 0.9 }} 
            onClick={() => navigate('/chat')} 
            style={{ cursor: 'pointer', color: 'var(--text-main)' }}
          >
            <ChevronLeft size={24} />
          </motion.div>
          <h2 style={{ fontSize: '18px', color: 'var(--text-main)', fontWeight: 600 }}>Chat Media</h2>
        </div>
        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-sub)' }}>
          <Search size={20} />
          <MoreVertical size={20} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        padding: '12px 20px', 
        gap: '8px',
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-light)'
      }}>
        {['Photos', 'Videos', 'Files'].map((tab) => (
          <motion.button
            key={tab}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: activeTab === tab ? 'var(--blush-pink)' : 'transparent',
              color: activeTab === tab ? 'white' : 'var(--text-sub)',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {tab === 'Photos' && <ImageIcon size={16} />}
            {tab === 'Videos' && <Video size={16} />}
            {tab === 'Files' && <FileText size={16} />}
            {tab}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} className="hide-scrollbar">
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-sub)' }}>
            Loading shared media...
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'Photos' && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '8px' 
              }}>
                {mediaData.Photos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/chat-media/photo/${photo.id}`, {
                      state: {
                        mediaUrl: photo.url,
                        createdAt: photo.createdAt,
                        sender: photo.sender,
                        mediaType: 'image',
                      },
                    })}
                    style={{ 
                      aspectRatio: '1/1', 
                      borderRadius: '12px', 
                      overflow: 'hidden',
                      backgroundColor: 'var(--chat-bg)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    <img src={photo.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '4px', 
                      right: '6px', 
                      fontSize: '10px', 
                      color: 'white', 
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      fontWeight: 500
                    }}>
                      {photo.date}
                    </div>
                  </motion.div>
                ))}
                {!loading && mediaData.Photos.length === 0 && (
                  <p style={{ color: 'var(--text-sub)', gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0' }}>
                    No shared photos yet.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'Videos' && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '12px' 
              }}>
                {mediaData.Videos.map((video) => (
                  <motion.div
                    key={video.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/chat-media/photo/${video.id}`, {
                      state: {
                        mediaUrl: video.url,
                        createdAt: video.createdAt,
                        sender: video.sender,
                        mediaType: 'video',
                      },
                    })}
                    style={{ 
                      borderRadius: '16px', 
                      overflow: 'hidden',
                      backgroundColor: 'var(--chat-bg)',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    <video src={video.url} muted playsInline preload="metadata" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
                    <div style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.2)'
                    }}>
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '18px', 
                        backgroundColor: 'rgba(255,255,255,0.4)', 
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Video size={18} color="white" fill="white" />
                      </div>
                    </div>
                    <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{video.date}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: 600 }}>Video</span>
                    </div>
                  </motion.div>
                ))}
                {!loading && mediaData.Videos.length === 0 && (
                  <p style={{ color: 'var(--text-sub)', gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0' }}>
                    No shared videos yet.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'Files' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mediaData.Files.map((file) => (
                  <motion.div
                    key={file.id}
                    whileTap={{ scale: 0.98 }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '16px', 
                      padding: '16px', 
                      backgroundColor: 'var(--card-bg)', 
                      borderRadius: '16px',
                      boxShadow: 'var(--shadow-soft)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '12px', 
                      backgroundColor: 'var(--card-accent-pink)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <FileText size={20} color="var(--blush-pink)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '14px' }}>{file.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{[file.mimeType, file.size, file.date].filter(Boolean).join(' • ')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => downloadAttachment(file.url, file.name)}
                        style={{ color: 'var(--text-sub)', display: 'inline-flex', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        <Download size={18} />
                      </button>
                      <a href={file.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-sub)', display: 'inline-flex' }}>
                        <ExternalLink size={18} />
                      </a>
                    </div>
                  </motion.div>
                ))}
                {!loading && mediaData.Files.length === 0 && (
                  <p style={{ color: 'var(--text-sub)', textAlign: 'center', padding: '20px 0' }}>
                    No shared files yet.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ChatMedia;
