import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ icon: Icon, label, value, color, delay = 0 }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="admin-card stat-card"
    >
      <div className="stat-icon" style={{ backgroundColor: `${color}15`, color: color }}>
        <Icon size={28} />
      </div>
      <div className="stat-info">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
    </motion.div>
  );
};

export default StatCard;
