import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import onboardingHero from '../assets/images/onboarding_hero.png';

const Onboarding = () => {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: 'var(--warm-white)'
      }}
    >
      {/* Background Image with Cinematic Fade */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: "linear" }}
          src={onboardingHero} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }} 
        />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60%',
          background: 'linear-gradient(to top, var(--warm-white) 20%, transparent 100%)'
        }} />
      </div>

      {/* Content Area */}
      <div style={{
        padding: '0 32px 64px 32px',
        textAlign: 'center',
        zIndex: 1
      }}>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{ 
            fontSize: '42px', 
            marginBottom: '16px',
            color: 'var(--text-primary)',
            lineHeight: 1.1
          }}
        >
          Your private <br /> <span className="serif" style={{ fontStyle: 'italic' }}>love space</span>
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          style={{ 
            fontSize: '16px', 
            color: 'var(--text-secondary)',
            marginBottom: '48px',
            maxWidth: '280px',
            margin: '0 auto 48px auto'
          }}
        >
          A beautiful home for your shared memories, moments, and milestones.
        </motion.p>

        <motion.button 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/login')}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          Enter Our Space
        </motion.button>
      </div>

      {/* Subtle Floating Particles/Glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '10%',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(244, 211, 211, 0.3) 0%, transparent 70%)',
        filter: 'blur(40px)',
        zIndex: 0
      }} />
    </motion.div>
  );
};

export default Onboarding;
