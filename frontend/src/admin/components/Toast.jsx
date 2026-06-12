import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => {},
    error: (msg) => {},
    info: (msg) => {},
  };

  const iconMap = { success: CheckCircle, error: XCircle, info: Info };
  const colorMap = { success: '#4CAF50', error: '#FF5252', info: '#2196F3' };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = iconMap[t.type];
            const color = colorMap[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  backgroundColor: 'var(--card-bg)',
                  borderRadius: '14px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  border: `1px solid ${color}30`,
                  minWidth: '280px',
                  maxWidth: '380px',
                  pointerEvents: 'all',
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <Icon size={20} color={color} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)', flex: 1 }}>
                  {t.message}
                </span>
                <X
                  size={16}
                  color="var(--text-muted)"
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => removeToast(t.id)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
