import React, { useEffect, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const Chat = lazy(() => import('./Chat'));

// Phases: 'closed' → user sees the door, 'opening' → door swings out,
// 'flash' → bright bloom masks the cut, 'open' → real <Chat /> takes over.

const FloatingHeart = ({ left, size, delay, duration, opacity }) => (
  <motion.div
    initial={{ y: '110%', opacity: 0 }}
    animate={{ y: '-15%', opacity: [0, opacity, 0] }}
    transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      position: 'absolute',
      left: `${left}%`,
      bottom: 0,
      pointerEvents: 'none',
      filter: 'blur(0.4px)',
    }}
  >
    <Heart size={size} fill="#ffb7c5" color="#ffb7c5" strokeWidth={0} />
  </motion.div>
);

const Sparkle = ({ left, top, delay, size }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
    transition={{ duration: 2.4, delay, repeat: Infinity, ease: 'easeInOut' }}
    style={{
      position: 'absolute',
      left: `${left}%`,
      top: `${top}%`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,229,180,1) 0%, rgba(255,200,140,0.7) 40%, transparent 70%)',
      pointerEvents: 'none',
    }}
  />
);

const ChatGate = () => {
  const location = useLocation();
  const [phase, setPhase] = useState(location.state?.doorOpened ? 'open' : 'closed');

  const handleEnter = () => {
    if (phase !== 'closed') return;
    setPhase('opening');
  };

  // Drive the phase machine after the user taps. Done in an effect so timers
  // are cleaned up if the component unmounts mid-animation (e.g. user navigates
  // away by pressing back during the swing).
  useEffect(() => {
    if (phase === 'opening') {
      const t = setTimeout(() => setPhase('flash'), 1000);
      return () => clearTimeout(t);
    }
    if (phase === 'flash') {
      const t = setTimeout(() => setPhase('open'), 520);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (phase === 'open') {
    return (
      <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={(
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-sub)',
            fontSize: '14px',
          }}
          >
            Opening chat...
          </div>
        )}
        >
          <Chat />
        </Suspense>
      </div>
    );
  }

  const opening = phase === 'opening' || phase === 'flash';
  const flashing = phase === 'flash';

  const hearts = [
    { left: 8,  size: 14, delay: 0,   duration: 9,  opacity: 0.45 },
    { left: 22, size: 10, delay: 1.6, duration: 11, opacity: 0.35 },
    { left: 38, size: 16, delay: 0.8, duration: 10, opacity: 0.5 },
    { left: 58, size: 12, delay: 2.2, duration: 12, opacity: 0.4 },
    { left: 72, size: 18, delay: 0.4, duration: 9.5, opacity: 0.55 },
    { left: 88, size: 11, delay: 3,   duration: 11, opacity: 0.4 },
  ];

  const sparkles = [
    { left: 18, top: 22, delay: 0,   size: 6 },
    { left: 78, top: 28, delay: 1.1, size: 5 },
    { left: 28, top: 70, delay: 0.6, size: 4 },
    { left: 82, top: 65, delay: 1.8, size: 6 },
    { left: 50, top: 12, delay: 0.3, size: 5 },
  ];

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 50% 38%, #3a1f29 0%, #1c0d14 55%, #0a0508 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Vignette for cinematic depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Ambient floating sparkles */}
      {!opening && sparkles.map((s, i) => <Sparkle key={`s-${i}`} {...s} />)}

      {/* Floating hearts background */}
      {!opening && hearts.map((h, i) => <FloatingHeart key={`h-${i}`} {...h} />)}

      {/* Title above the door */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: opening ? 0 : 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        style={{
          position: 'absolute',
          top: '7%',
          textAlign: 'center',
          color: 'rgba(255, 235, 238, 0.95)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            opacity: 0.6,
            marginBottom: '6px',
            fontFamily: 'var(--font-main)',
          }}
        >
          Welcome
        </div>
        <div
          style={{
            fontSize: '22px',
            fontStyle: 'italic',
            fontWeight: 500,
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.01em',
          }}
        >
          to your private space
        </div>
      </motion.div>

      {/* Soft glow behind the door */}
      <motion.div
        animate={{
          opacity: opening ? [0.65, 1, 1] : [0.3, 0.55, 0.3],
          scale: opening ? [1, 1.6, 1.85] : [1, 1.06, 1],
        }}
        transition={{
          duration: opening ? 1.0 : 4,
          repeat: opening ? 0 : Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          width: '320px',
          height: '500px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,183,197,0.5) 0%, rgba(244,211,211,0.22) 42%, transparent 72%)',
          filter: 'blur(48px)',
          pointerEvents: 'none',
        }}
      />

      {/* 3D scene wrapper */}
      <div style={{ perspective: '1800px', position: 'relative' }}>
        {/* Frame with the doorway opening */}
        <div
          style={{
            position: 'relative',
            width: '240px',
            height: '420px',
            borderRadius: '120px 120px 14px 14px',
            background: 'linear-gradient(180deg, #1a0d12 0%, #0a0508 100%)',
            boxShadow:
              'inset 0 0 40px rgba(0,0,0,0.95), 0 0 80px rgba(212,175,55,0.18), 0 30px 60px rgba(0,0,0,0.65)',
            padding: '10px',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Doorway interior — dark when closed, warm light bloom when opening */}
          <div
            style={{
              position: 'absolute',
              inset: '10px',
              borderRadius: '114px 114px 8px 8px',
              background: opening
                ? 'radial-gradient(ellipse at center, #fff8f3 0%, #ffe5d6 35%, #ffb7c5 65%, #f4d3d3 100%)'
                : 'linear-gradient(180deg, #0a0508 0%, #160810 100%)',
              transition: 'background 1s cubic-bezier(0.16, 1, 0.3, 1)',
              overflow: 'hidden',
            }}
          >
            <AnimatePresence>
              {opening && (
                <motion.div
                  key="burst"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: [0, 1, 0.85], scale: [0.4, 1.8, 2.4] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(circle at 50% 55%, rgba(255,255,255,0.95) 0%, rgba(255,229,214,0.6) 40%, transparent 70%)',
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Warm light leak under the closed door — hints at someone waiting inside */}
          {!opening && (
            <motion.div
              animate={{ opacity: [0.4, 0.85, 0.4] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                left: '14%',
                right: '14%',
                bottom: '11px',
                height: '3px',
                borderRadius: '2px',
                background:
                  'linear-gradient(90deg, transparent, rgba(255, 220, 180, 0.95), transparent)',
                filter: 'blur(1.5px)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* The hinged door — only tapping this opens the gate. */}
          <motion.div
            onClick={handleEnter}
            animate={{ rotateY: opening ? -108 : 0 }}
            transition={{
              duration: 1.0,
              ease: [0.16, 1, 0.3, 1],
            }}
            whileTap={phase === 'closed' ? { scale: 0.985 } : undefined}
            style={{
              position: 'absolute',
              inset: '10px',
              borderRadius: '114px 114px 8px 8px',
              transformOrigin: 'left center',
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              cursor: phase === 'closed' ? 'pointer' : 'default',
            }}
          >
            {/* Subtle breathing on the closed door */}
            <motion.div
              animate={!opening ? { scale: [1, 1.005, 1] } : { scale: 1 }}
              transition={{ duration: 4.5, repeat: opening ? 0 : Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                background:
                  'linear-gradient(160deg, #d48896 0%, #b8616f 30%, #9c4a59 65%, #7a3543 100%)',
                boxShadow:
                  'inset 0 0 60px rgba(0,0,0,0.45), inset 4px 0 14px rgba(0,0,0,0.5), 6px 8px 24px rgba(0,0,0,0.55)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '46px 28px 30px',
                backfaceVisibility: 'hidden',
              }}
            >
              {/* Top arched panel */}
              <div
                style={{
                  width: '76%',
                  height: '92px',
                  borderRadius: '50px 50px 6px 6px',
                  border: '1.5px solid rgba(255, 220, 220, 0.18)',
                  boxShadow: 'inset 0 0 14px rgba(0,0,0,0.35)',
                  marginBottom: '16px',
                }}
              />

              {/* Heart knocker */}
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  boxShadow: [
                    '0 0 18px rgba(212,175,55,0.45)',
                    '0 0 34px rgba(212,175,55,0.85)',
                    '0 0 18px rgba(212,175,55,0.45)',
                  ],
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle at 32% 30%, #ffe9a3 0%, #d4af37 55%, #8a6914 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <Heart size={34} fill="#fffaf3" color="#fffaf3" strokeWidth={0} />
              </motion.div>

              {/* Bottom panel */}
              <div
                style={{
                  width: '76%',
                  flex: 1,
                  borderRadius: '6px',
                  border: '1.5px solid rgba(255, 220, 220, 0.18)',
                  boxShadow: 'inset 0 0 14px rgba(0,0,0,0.35)',
                }}
              />

              {/* Diagonal shine */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '14%',
                  width: '12%',
                  height: '100%',
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 100%)',
                  filter: 'blur(2px)',
                  pointerEvents: 'none',
                }}
              />
            </motion.div>

            {/* Hinges (left edge) */}
            {[0.18, 0.5, 0.82].map((p, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: '2px',
                  top: `${p * 100}%`,
                  transform: 'translateY(-50%)',
                  width: '6px',
                  height: '14px',
                  borderRadius: '2px',
                  background: 'linear-gradient(180deg, #c9a14a, #6b4d18)',
                  boxShadow: '0 0 4px rgba(0,0,0,0.6)',
                }}
              />
            ))}

            {/* Knob */}
            <motion.div
              animate={opening ? { rotate: -28, scale: 1.06 } : { rotate: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                marginTop: '-8px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 30% 30%, #ffefb0 0%, #d4af37 60%, #6b4d18 100%)',
                boxShadow:
                  '0 0 10px rgba(212,175,55,0.7), inset -2px -2px 4px rgba(0,0,0,0.5)',
              }}
            />
          </motion.div>
        </div>

        {/* Soft floor shadow under the door */}
        <div
          style={{
            position: 'absolute',
            bottom: '-22px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '180px',
            height: '24px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%)',
            filter: 'blur(4px)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* "Tap to enter" hint */}
      <AnimatePresence>
        {phase === 'closed' && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute',
              // Sit above the BottomNav (~76px tall + its bottom offset).
              bottom: 'calc(110px + var(--aura-nav-bottom, var(--app-pad-bottom, 0px)))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              pointerEvents: 'none',
            }}
          >
            <motion.span
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                color: 'rgba(255, 230, 235, 0.95)',
                fontFamily: 'var(--font-main)',
                fontSize: '12px',
                fontWeight: 500,
                letterSpacing: '0.34em',
                textTransform: 'uppercase',
              }}
            >
              Tap to enter
            </motion.span>
            <motion.div
              animate={{ y: [0, 5, 0], opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'rgba(255, 220, 220, 0.85)',
                boxShadow: '0 0 8px rgba(255, 183, 197, 0.7)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav stays visible on the door page — fades out as the door
          opens so it doesn't compete with the bloom. */}
      <motion.div
        animate={{ opacity: opening ? 0 : 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ pointerEvents: opening ? 'none' : 'auto' }}
      >
        <BottomNav />
      </motion.div>

      {/* Final bloom that masks the cut to <Chat /> */}
      <AnimatePresence>
        {flashing && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at center, rgba(255,255,255,1) 0%, rgba(255,229,224,0.95) 55%, rgba(255,183,197,0.9) 100%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatGate;
