import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, Heart } from 'lucide-react';
import api from '../utils/api';

const Timeline = () => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        setLoading(true);
        const data = await api.getMilestones();
        // Sort milestones by date ascending
        const sorted = (data || []).sort((a, b) => new Date(a.date) - new Date(b.date));
        setMilestones(sorted);
      } catch (err) {
        console.error('Error fetching milestones:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMilestones();
  }, []);

  const getIconForMilestone = (title = '') => {
    const lower = title.toLowerCase();
    if (lower.includes('trip') || lower.includes('travel') || lower.includes('bali') || lower.includes('hotel') || lower.includes('flight')) {
      return MapPin;
    }
    if (lower.includes('proposal') || lower.includes('love') || lower.includes('marry') || lower.includes('promise') || lower.includes('anniversary')) {
      return Heart;
    }
    return Sparkles;
  };

  const getBadgeColor = (index) => {
    const colors = ['#F4D3D3', '#EBE8F3', '#FFB7C5', '#FFF5F2'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
        Loading our journey...
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '24px 20px' }}
    >
      <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Our Journey</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>Every moment that brought us here.</p>

      {milestones.length === 0 ? (
        <div className="premium-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-sub)' }}>
          No milestones added yet. Add them in the Admin settings!
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '40px' }}>
          {/* Timeline Line */}
          <div style={{
            position: 'absolute',
            left: '15px',
            top: '0',
            bottom: '0',
            width: '2px',
            background: 'linear-gradient(to bottom, var(--dusty-rose) 0%, var(--muted-lavender) 100%)',
            borderRadius: '2px'
          }} />

          {milestones.map((milestone, index) => {
            const IconComponent = getIconForMilestone(milestone.title);
            const badgeColor = getBadgeColor(index);
            const dateObj = new Date(milestone.date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const yearStr = dateObj.getFullYear();

            return (
              <motion.div 
                key={milestone._id || milestone.id || index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                style={{ marginBottom: '48px', position: 'relative' }}
              >
                {/* Timeline Dot */}
                <div style={{
                  position: 'absolute',
                  left: '-32px',
                  top: '0',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: badgeColor,
                  border: '4px solid var(--warm-white)',
                  zIndex: 1,
                  boxShadow: '0 0 0 2px ' + badgeColor
                }} />

                {/* Year Badge */}
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {formattedDate}, {yearStr}
                </p>

                <div className="premium-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '12px', 
                      backgroundColor: badgeColor + '40',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <IconComponent size={20} color="var(--text-primary)" />
                    </div>
                    <h4 style={{ fontSize: '18px' }}>{milestone.title}</h4>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {milestone.description || milestone.desc}
                  </p>
                  {milestone.image && (
                    <img src={milestone.image} style={{ 
                      width: '100%', 
                      borderRadius: '16px', 
                      marginTop: '16px',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.05)'
                    }} />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default Timeline;
