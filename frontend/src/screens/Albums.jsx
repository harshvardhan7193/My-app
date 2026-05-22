import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MoreHorizontal, Plus, X, Camera, Image as ImageIcon } from 'lucide-react';
import api from '../utils/api';

const Albums = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        setLoading(true);
        const data = await api.getAlbums();
        setAlbums(data || []);
      } catch (err) {
        console.error('Error fetching albums:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbums();
  }, []);

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) return;
    setSaving(true);
    try {
      const created = await api.createAlbum({
        title: newAlbumName.trim(),
        description: newAlbumDesc.trim() || 'A collection of our favorite moments.',
        cover: 'https://picsum.photos/seed/' + Math.floor(Math.random() * 1000) + '/400/500',
      });
      setAlbums(prev => [created, ...prev]);
      setNewAlbumName('');
      setNewAlbumDesc('');
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to create album.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
        Loading albums...
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '24px 20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <h2 onClick={() => navigate('/gallery')} style={{ fontSize: '28px', cursor: 'pointer', color: 'var(--text-sub)' }}>Memories</h2>
          <h2 onClick={() => navigate('/albums')} style={{ fontSize: '28px', cursor: 'pointer', color: 'var(--text-main)' }}>Albums</h2>
        </div>
        <motion.div 
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreateModal(true)}
          style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: 'var(--chat-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Plus size={24} color="var(--text-main)" />
        </motion.div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '24px' }}>
        <div style={{ width: '40px', height: '3px', backgroundColor: 'var(--blush-pink)', borderRadius: '2px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {albums.map((album, index) => {
          const photoCount = album.photos?.length || 0;
          return (
            <motion.div
              key={album._id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/album/${album._id}`)}
            >
              {/* Magazine Style Stacked Cover */}
              <div style={{ position: 'relative', height: '220px', marginBottom: '16px' }}>
                {/* Back Layer */}
                <div style={{ 
                  position: 'absolute', 
                  top: '-10px', 
                  left: '10px', 
                  right: '10px', 
                  bottom: '10px', 
                  backgroundColor: 'rgba(0,0,0,0.05)', 
                  borderRadius: '20px',
                  transform: 'rotate(-2deg)',
                  zIndex: 1
                }} />
                {/* Main Cover */}
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: '20px', 
                  overflow: 'hidden',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                  zIndex: 2
                }}>
                  <img src={album.cover || 'https://picsum.photos/seed/default/400/500'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0, 
                    right: 0, 
                    padding: '12px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>{photoCount} photos</span>
                  </div>
                </div>
              </div>
              
              <h3 style={{ fontSize: '18px', marginBottom: '4px', color: 'var(--text-main)' }}>{album.title}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Collaborative</p>
            </motion.div>
          );
        })}
      </div>

      {/* Create Album Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}
          >
            <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowCreateModal(false)} />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              style={{ width: '100%', background: 'var(--menu-bg)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '32px 24px 60px 24px', position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h3 style={{ fontSize: '22px', color: 'var(--text-main)' }}>Create New Album</h3>
                <X onClick={() => setShowCreateModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>Album Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Our First Trip, Wedding Dreams..." 
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--chat-bg)',
                      fontSize: '15px',
                      color: 'var(--text-main)',
                      outline: 'none',
                      fontFamily: 'var(--font-main)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>Description</label>
                  <input 
                    type="text" 
                    placeholder="Add a nice description..." 
                    value={newAlbumDesc}
                    onChange={(e) => setNewAlbumDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-light)',
                      background: 'var(--chat-bg)',
                      fontSize: '15px',
                      color: 'var(--text-main)',
                      outline: 'none',
                      fontFamily: 'var(--font-main)'
                    }}
                  />
                </div>

                <button 
                  onClick={handleCreateAlbum} 
                  disabled={!newAlbumName.trim() || saving}
                  className="btn-primary" 
                  style={{ width: '100%', marginTop: '8px', border: 'none' }}
                >
                  {saving ? 'Creating...' : 'Create Album'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Albums;
