import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import SkeletonGallery from '../components/SkeletonGallery';
import api from '../utils/api';
import useOnlineStatus from '../hooks/useOnlineStatus';

const Gallery = () => {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [memories, setMemories] = useState([]);

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        setLoading(true);
        const data = await api.getMemories();
        setMemories(data.memories || data || []);
      } catch (err) {
        console.error('Error fetching memories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMemories();
  }, []);

  const filteredMemories = memories.filter(m => {
    const matchesCategory = activeCategory === 'All' || m.category === activeCategory;
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) return <SkeletonGallery />;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '24px 20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <h2 onClick={() => navigate('/albums')} style={{ fontSize: '28px', cursor: 'pointer', color: 'var(--text-sub)' }}>Albums</h2>
          <h2 onClick={() => navigate('/gallery')} style={{ fontSize: '28px', cursor: 'pointer', color: 'var(--text-main)' }}>Memories</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <motion.div whileTap={{ scale: 0.9 }} onClick={() => setShowSearch(!showSearch)} style={{ cursor: 'pointer' }}>
            <Search size={22} color={showSearch ? "var(--blush-pink)" : "var(--text-sub)"} />
          </motion.div>
          <motion.div whileTap={{ scale: 0.9 }} onClick={() => setShowFilters(true)} style={{ cursor: 'pointer' }}>
            <Filter size={22} color="var(--text-sub)" />
          </motion.div>
        </div>
      </div>
      <div style={{ width: '40px', height: '3px', backgroundColor: 'var(--blush-pink)', borderRadius: '2px', marginBottom: '24px' }} />

      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ marginBottom: '24px', overflow: 'hidden' }}
          >
            <input 
              type="text" 
              placeholder="Search memories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--card-bg)',
                fontSize: '15px',
                outline: 'none',
                fontFamily: 'var(--font-main)',
                color: 'var(--text-main)'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px' }} className="hide-scrollbar">
        {['All', 'Favorites', 'Trips', 'Dates', 'Milestones'].map((cat) => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '8px 20px',
              borderRadius: '100px',
              backgroundColor: activeCategory === cat ? 'var(--dusty-rose)' : 'var(--card-bg)',
              color: activeCategory === cat ? 'white' : 'var(--text-sub)',
              fontSize: '14px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-soft)',
              border: activeCategory === cat ? '1px solid var(--dusty-rose)' : '1px solid var(--border-light)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '16px',
        alignItems: 'start'
      }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMemories.filter((_, i) => i % 2 === 0).map(m => (
            <MemoryItem key={m._id} memory={m} />
          ))}
        </div>
        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
          {filteredMemories.filter((_, i) => i % 2 !== 0).map(m => (
            <MemoryItem key={m._id} memory={m} />
          ))}
        </div>
      </div>

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}
          >
            <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowFilters(false)} />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="popup-card"
              style={{ width: '100%', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '32px 24px 60px 24px', position: 'relative', zIndex: 2001 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h3 style={{ fontSize: '22px', color: 'var(--text-main)' }}>Filter by</h3>
                <X onClick={() => setShowFilters(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-sub)' }}>Time Period</p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {['Last 7 Days', 'This Month', '2024', 'Older'].map(t => (
                      <span key={t} style={{ padding: '8px 16px', borderRadius: '12px', background: 'var(--chat-bg)', fontSize: '13px', color: 'var(--text-main)' }}>{t}</span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'var(--chat-bg)', borderRadius: '20px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>Only Favorites</span>
                  <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: 'var(--blush-pink)', position: 'relative' }}>
                    <div style={{ position: 'absolute', right: '4px', top: '4px', width: '16px', height: '16px', borderRadius: '8px', background: 'white' }} />
                  </div>
                </div>

                <button onClick={() => setShowFilters(false)} className="btn-primary" style={{ width: '100%', marginTop: '8px', border: 'none' }}>Apply Filters</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Add Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { if (online) setShowAddModal(true); }}
        style={{
          opacity: online ? 1 : 0.45,
          pointerEvents: online ? 'auto' : 'none',
          position: 'fixed',
          bottom: '110px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          background: 'linear-gradient(135deg, var(--blush-pink), var(--dusty-rose))',
          color: 'white',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(255, 183, 197, 0.5)',
          zIndex: 1000,
          cursor: 'pointer'
        }}
      >
        <Plus size={28} />
      </motion.button>

      {/* Add Memory Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddMemoryModal 
            onClose={() => setShowAddModal(false)} 
            onAdd={(newMem) => {
              setMemories([newMem, ...memories]);
              setShowAddModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const AddMemoryModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Favorites',
    date: new Date().toISOString().split('T')[0],
    description: '',
    img: null,
    imgPreview: null
  });
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        img: file,
        imgPreview: URL.createObjectURL(file)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.img) return;
    
    setSaving(true);
    setUploadProgress(0);
    try {
      const uploadRes = await api.uploadFileWithProgress(formData.img, (percent) => {
        setUploadProgress(percent);
      });

      const created = await api.createMemory({
        title: formData.title,
        category: formData.category,
        description: formData.description,
        date: formData.date,
        img: uploadRes.url,
        imgPublicId: uploadRes.publicId,
      });
      onAdd(created);
    } catch (err) {
      console.error(err);
      alert('Failed to upload and save memory.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="popup-card"
        style={{ width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '32px', position: 'relative', zIndex: 3001 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '24px', color: 'var(--text-main)', fontFamily: 'var(--font-main)' }}>Create Memory</h3>
          <X size={24} onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Image Upload */}
          <div 
            onClick={() => document.getElementById('mem-img-input').click()}
            style={{ 
              width: '100%', 
              height: '180px', 
              borderRadius: '20px', 
              backgroundColor: 'var(--chat-bg)', 
              border: '2px dashed var(--border-light)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {formData.imgPreview ? (
              <img src={formData.imgPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                <Plus size={32} color="var(--text-sub)" style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '14px', color: 'var(--text-sub)' }}>Add a Photo</span>
              </>
            )}
            <input id="mem-img-input" type="file" hidden accept="image/*" onChange={handleFileChange} />
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px', display: 'block' }}>Memory Title</label>
            <input 
              required
              type="text" 
              placeholder="What happened today?"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)', backgroundColor: 'var(--card-bg)', outline: 'none', color: 'var(--text-main)', fontSize: '15px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px', display: 'block' }}>Description</label>
            <textarea 
              placeholder="Tell the story behind this memory..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)', backgroundColor: 'var(--card-bg)', outline: 'none', color: 'var(--text-main)', fontSize: '15px', minHeight: '100px', resize: 'none', fontFamily: 'var(--font-body)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px', display: 'block' }}>Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-light)', backgroundColor: 'var(--card-bg)', outline: 'none', color: 'var(--text-main)', fontSize: '14px' }}
              >
                {['Favorites', 'Trips', 'Dates', 'Milestones'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '8px', display: 'block' }}>Date</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-light)', backgroundColor: 'var(--card-bg)', outline: 'none', color: 'var(--text-main)', fontSize: '14px' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', border: 'none', marginTop: '12px' }}
            disabled={!formData.title || !formData.imgPreview || saving}
          >
            {saving ? `Saving (${uploadProgress}%)...` : 'Save Memory'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const MemoryItem = ({ memory }) => {
  const navigate = useNavigate();
  const formattedDate = new Date(memory.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      onClick={() => navigate(`/memory/${memory._id}`)}
      style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
      }}
    >
      <img src={memory.img} style={{ width: '100%', display: 'block' }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)',
        color: 'white'
      }}>
        <p style={{ fontSize: '14px', fontWeight: 600 }}>{memory.title}</p>
        <p style={{ fontSize: '10px', opacity: 0.8 }}>{formattedDate}</p>
      </div>
    </motion.div>
  );
};

export default Gallery;
