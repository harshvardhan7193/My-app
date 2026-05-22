import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Play, Pause, ChevronRight } from 'lucide-react';

const MemoryRecap = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  const slides = [
    {
      title: "It started with a hello",
      subtitle: "January 2024",
      image: "https://picsum.photos/seed/recap1/800/1200",
      quote: "The day our world changed forever."
    },
    {
      title: "Our first sunset",
      subtitle: "March 2024",
      image: "https://picsum.photos/seed/recap2/800/1200",
      quote: "Watching the sky turn pink, just like your smile."
    },
    {
      title: "Summer adventures",
      subtitle: "July 2024",
      image: "https://picsum.photos/seed/recap3/800/1200",
      quote: "Lost in the streets of Rome, but found in each other."
    },
    {
      title: "Building our home",
      subtitle: "October 2024",
      image: "https://picsum.photos/seed/recap4/800/1200",
      quote: "Every corner filled with laughter and love."
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
            return 0;
          } else {
            clearInterval(timer);
            return 100;
          }
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [currentSlide, slides.length]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: '#000', 
        zIndex: 5000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Progress Bars */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '16px', 
        right: '16px', 
        display: 'flex', 
        gap: '4px',
        zIndex: 10 
      }}>
        {slides.map((_, i) => (
          <div key={i} style={{ 
            flex: 1, 
            height: '3px', 
            backgroundColor: 'rgba(255,255,255,0.2)', 
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <motion.div 
              style={{ 
                height: '100%', 
                backgroundColor: 'white',
                width: i < currentSlide ? '100%' : i === currentSlide ? `${progress}%` : '0%'
              }} 
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ 
        position: 'absolute', 
        top: '40px', 
        left: '20px', 
        right: '20px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10 
      }}>
        <div style={{ color: 'white' }}>
          <p style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>2024 Recap</p>
          <h3 style={{ fontSize: '18px' }}>Our Journey</h3>
        </div>
        <motion.div 
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
        >
          <X size={24} />
        </motion.div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 1 }}
          style={{ width: '100%', height: '100%', position: 'relative' }}
        >
          <img 
            src={slides[currentSlide].image} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '60px 32px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
            color: 'white'
          }}>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ fontSize: '36px', marginBottom: '8px', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
            >
              {slides[currentSlide].title}
            </motion.h2>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ fontSize: '16px', opacity: 0.8, marginBottom: '24px' }}
            >
              {slides[currentSlide].subtitle}
            </motion.p>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              style={{ fontSize: '20px', fontWeight: 300, lineHeight: 1.4 }}
            >
              "{slides[currentSlide].quote}"
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls (Invisible but clickable) */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        <div 
          style={{ flex: 1 }} 
          onClick={() => {
            if (currentSlide > 0) {
              setCurrentSlide(currentSlide - 1);
              setProgress(0);
            }
          }} 
        />
        <div 
          style={{ flex: 1 }} 
          onClick={() => {
            if (currentSlide < slides.length - 1) {
              setCurrentSlide(currentSlide + 1);
              setProgress(0);
            } else {
              navigate(-1);
            }
          }} 
        />
      </div>
    </motion.div>
  );
};

export default MemoryRecap;
