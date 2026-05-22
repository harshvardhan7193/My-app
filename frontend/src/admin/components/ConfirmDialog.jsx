import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDialog = ({ isOpen, title, description, onConfirm, onCancel, confirmLabel = 'Delete', confirmColor = '#FF5252' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            zIndex: 5000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg)',
              borderRadius: '24px',
              padding: '32px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              border: '1px solid var(--border-light)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: `${confirmColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} color={confirmColor} />
              </div>
              <X size={20} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={onCancel} />
            </div>

            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>{title}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-sub)', lineHeight: 1.6, marginBottom: '32px' }}>{description}</p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onCancel}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: confirmColor, color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
