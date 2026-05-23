import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, ArrowRight, AlertCircle, User } from 'lucide-react';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!userId.trim()) {
      setError('Please enter your Admin ID.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const api = (await import('../../utils/api')).default;
      const user = await api.login(userId.trim(), password.trim());

      if (user.role !== 'admin') {
         setError('Unauthorized. This portal is for administrators only.');
         setLoading(false);
         // You might want to log them out or just show error.
         return;
      }

      // Save user profile for legacy compatibility if needed
      const legacyUser = {
        role: user.role,
        name: user.name,
        email: user.email,
        avatar: user.avatar || 'https://i.pravatar.cc/200?u=admin',
        partnerName: 'System',
        partnerAvatar: 'https://i.pravatar.cc/200?u=system',
      };
      localStorage.setItem('currentUser', JSON.stringify(legacyUser));

      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Invalid Admin ID or Password.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSignIn();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        height: '100vh', 
        padding: '40px 32px',
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#f8fafc' // slightly cooler background for admin
      }}
    >
      <div style={{ marginTop: '60px', marginBottom: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', backgroundColor: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Shield size={32} color="#475569" />
        </div>
        <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#1e293b' }}>Admin Portal</h1>
        <p style={{ color: '#64748b', fontSize: '16px' }}>Secure access for administrators.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        {/* Error Message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              color: '#b91c1c', 
              fontSize: '14px', 
              backgroundColor: '#fef2f2', 
              padding: '12px 16px', 
              borderRadius: '12px',
              border: '1px solid #fecaca'
            }}
          >
            <AlertCircle size={18} color="#dc2626" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* User ID Input */}
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin ID</p>
          <div className="premium-card" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0'
          }}>
            <User size={20} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="admin" 
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ 
                flex: 1, 
                border: 'none', 
                outline: 'none', 
                fontSize: '16px',
                background: 'transparent',
                fontFamily: 'var(--font-body)',
                color: '#1e293b'
              }} 
            />
          </div>
        </div>

        {/* Password Input */}
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</p>
          <div className="premium-card" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0'
          }}>
            <Lock size={20} color="#94a3b8" />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ 
                flex: 1, 
                border: 'none', 
                outline: 'none', 
                fontSize: '16px',
                background: 'transparent',
                fontFamily: 'var(--font-body)',
                color: '#1e293b'
              }} 
            />
            <div onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer', color: '#94a3b8' }}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '40px', paddingBottom: '40px', maxWidth: '400px', margin: 'auto auto 0 auto', width: '100%' }}>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSignIn}
          disabled={loading}
          style={{ 
             width: '100%', 
             display: 'flex', 
             alignItems: 'center', 
             justifyContent: 'center', 
             gap: '12px', 
             opacity: loading ? 0.7 : 1,
             backgroundColor: '#0f172a',
             color: 'white',
             padding: '16px',
             borderRadius: '12px',
             border: 'none',
             fontSize: '16px',
             fontWeight: 600,
             cursor: 'pointer'
          }}
        >
          {loading ? 'Authenticating...' : 'Secure Login'} <ArrowRight size={20} />
        </motion.button>
        
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
          Unauthorized access is strictly prohibited.
        </p>
      </div>
    </motion.div>
  );
};

export default AdminLogin;
