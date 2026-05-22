import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Calendar, Share2, Trash2 } from 'lucide-react';
import api from '../utils/api';

const MemoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMemory = async () => {
      try {
        setLoading(true);
        const data = await api.getMemory(id);
        setMemory(data);
      } catch (err) {
        console.error('Error fetching memory details:', err);
        setError(err.message || 'Failed to load memory');
      } finally {
        setLoading(false);
      }
    };
    fetchMemory();
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!memory) return;
    try {
      const updated = await api.toggleFavorite(memory._id);
      setMemory(prev => ({ ...prev, favorite: updated.favorite }));
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleDeleteMemory = async () => {
    if (!window.confirm('Are you sure you want to delete this memory?')) return;
    try {
      await api.deleteMemory(id);
      navigate('/gallery', { replace: true });
    } catch (err) {
      console.error('Error deleting memory:', err);
      alert('Failed to delete memory');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: memory?.title,
        text: memory?.description,
        url: window.location.href,
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--app-bg)', color: 'var(--text-sub)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-light)', borderTopColor: 'var(--blush-pink)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
          <p style={{ fontFamily: 'var(--font-main)', fontSize: '15px' }}>Loading memory...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !memory) {
    return (
      <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--app-bg)', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-sub)', marginBottom: '24px', fontFamily: 'var(--font-main)' }}>{error || 'Memory not found'}</p>
        <button onClick={() => navigate('/gallery')} className="btn-primary" style={{ padding: '10px 24px', borderRadius: '100px', border: 'none', cursor: 'pointer' }}>
          Back to Gallery
        </button>
      </div>
    );
  }

  const formattedDate = new Date(memory.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'var(--app-bg)',
        zIndex: 2000,
        overflowY: 'auto'
      }}
      className="hide-scrollbar"
    >
      {/* Top Header Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)'
      }}>
        <motion.div 
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '20px', 
            backgroundColor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          <ChevronLeft size={24} />
        </motion.div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <motion.div 
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '20px', 
              backgroundColor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.9)',
              cursor: 'pointer'
            }}
          >
            <Share2 size={18} />
          </motion.div>
          
          <motion.div 
            whileTap={{ scale: 0.9 }}
            onClick={handleDeleteMemory}
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '20px', 
              backgroundColor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.9)',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={18} />
          </motion.div>
        </div>
      </div>

      {/* Hero Image */}
      <div style={{ height: '60vh', width: '100%', position: 'relative' }}>
        <motion.img 
          layoutId={`memory-image-${id}`}
          src={memory.img} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100px',
          background: 'linear-gradient(to top, var(--app-bg) 0%, transparent 100%)'
        }} />
      </div>

      {/* Content */}
      <div style={{ padding: '32px 24px', position: 'relative', marginTop: '-40px' }}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)', fontFamily: 'var(--font-main)' }}>{memory.title}</h1>
              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-sub)', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} /> {formattedDate}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'capitalize' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '3px', backgroundColor: 'var(--blush-pink)' }} /> {memory.category}
                </span>
              </div>
            </div>
            <motion.div 
              whileTap={{ scale: 0.8 }}
              onClick={handleToggleFavorite}
              style={{ 
                width: '50px', 
                height: '50px', 
                borderRadius: '25px', 
                backgroundColor: memory.favorite ? 'var(--blush-pink)' : 'var(--chat-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: memory.favorite ? 'white' : 'var(--text-sub)',
                boxShadow: memory.favorite ? '0 6px 20px rgba(255, 183, 197, 0.4)' : 'none',
                cursor: 'pointer',
                border: memory.favorite ? 'none' : '1px solid var(--border-light)',
                transition: 'all 0.3s ease'
              }}
            >
              <Heart size={24} fill={memory.favorite ? "white" : "none"} color={memory.favorite ? "white" : "var(--text-sub)"} />
            </motion.div>
          </div>

          {/* Uploaded By User Section */}
          {memory.uploadedBy && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '10px 14px', borderRadius: '16px', backgroundColor: 'var(--chat-bg)' }}>
              <img 
                src={memory.uploadedBy.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=placeholder'} 
                alt={memory.uploadedBy.name} 
                style={{ width: '32px', height: '32px', borderRadius: '16px', objectFit: 'cover', border: '1px solid var(--border-light)' }} 
              />
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-sub)' }}>Captured by</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{memory.uploadedBy.name}</p>
              </div>
            </div>
          )}

          <p style={{ fontSize: '16px', lineHeight: 1.6, color: 'var(--text-main)', marginBottom: '32px', fontFamily: 'var(--font-main)' }}>
            {memory.description || 'No story added to this memory yet.'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MemoryDetail;
