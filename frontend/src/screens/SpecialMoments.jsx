import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, Sparkles, X } from 'lucide-react';

const SpecialMoments = () => {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--dusty-rose), var(--blush-pink))',
        color: 'white',
        position: 'relative',
        padding: '32px',
        textAlign: 'center',
        zIndex: 3000
      }}
    >
      {/* Close Button */}
      <motion.div 
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate(-1)}
        style={{ 
          position: 'absolute', 
          top: '40px', 
          right: '30px', 
          cursor: 'pointer' 
        }}
      >
        <X size={28} />
      </motion.div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.2
        }}
        style={{ marginBottom: '40px' }}
      >
        <div style={{ 
          width: '120px', 
          height: '120px', 
          borderRadius: '60px', 
          backgroundColor: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <Heart size={64} fill="white" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            style={{ position: 'absolute', inset: -10 }}
          >
            <Sparkles size={24} style={{ position: 'absolute', top: 0, left: '50%' }} />
          </motion.div>
        </div>
      </motion.div>

      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ fontSize: '40px', marginBottom: '16px', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
      >
        Happy 3rd <br /> Anniversary!
      </motion.h1>

      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{ fontSize: '18px', opacity: 0.9, marginBottom: '48px', maxWidth: '280px' }}
      >
        1,095 days of love, laughter, and beautiful memories together.
      </motion.p>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/')}
        style={{
          padding: '16px 48px',
          borderRadius: '100px',
          backgroundColor: 'white',
          color: 'var(--blush-pink)',
          border: 'none',
          fontSize: '18px',
          fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          cursor: 'pointer'
        }}
      >
        To many more
      </motion.button>

      {/* Subtle Confetti/Particles (Animated) */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 400 - 200, 
            y: 500, 
            opacity: 0,
            rotate: 0 
          }}
          animate={{ 
            y: -500, 
            opacity: [0, 1, 0],
            rotate: 360 
          }}
          transition={{ 
            duration: 4 + Math.random() * 2, 
            repeat: Infinity, 
            delay: Math.random() * 2 
          }}
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            borderRadius: '2px',
            backgroundColor: 'rgba(255,255,255,0.4)',
            zIndex: -1
          }}
        />
      ))}
    </motion.div>
  );
};

export default SpecialMoments;
