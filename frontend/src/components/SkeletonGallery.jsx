import React from 'react';
import { motion } from 'framer-motion';

const SkeletonGallery = () => {
  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ display: 'flex', gap: '24px', marginBottom: '32px' }}>
        <div className="skeleton" style={{ width: '120px', height: '32px' }}>
          <div className="shimmer" style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="skeleton" style={{ width: '100px', height: '32px' }}>
          <div className="shimmer" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton" style={{ height: i % 2 === 0 ? '240px' : '180px', borderRadius: '24px' }}>
            <div className="shimmer" style={{ width: '100%', height: '100%' }} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonGallery;
