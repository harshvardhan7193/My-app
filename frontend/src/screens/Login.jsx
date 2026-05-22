import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!userId.trim()) {
      setError('Please enter your User ID.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const api = (await import('../utils/api')).default;
      const user = await api.login(userId.trim(), password.trim());

      // Save user profile for partner UI compatibility
      const legacyUser = {
        role: user.role,
        name: user.name,
        email: user.email,
        avatar: user.avatar || (user.role === 'male' ? 'https://i.pravatar.cc/200?u=alex' : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop'),
        partnerName: user.role === 'male' ? 'Sarah Wilson' : 'Alex Johnson',
        partnerAvatar: user.role === 'male' ? 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop' : 'https://i.pravatar.cc/200?u=alex',
      };
      localStorage.setItem('currentUser', JSON.stringify(legacyUser));

      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid User ID or Password.');
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
        backgroundColor: 'var(--warm-white)'
      }}
    >
      <div style={{ marginTop: '60px', marginBottom: '36px' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '12px' }}>Welcome <span className="serif" style={{ fontStyle: 'italic' }}>back</span></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Sign in to your private love space.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Error Message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              color: '#c2185b', 
              fontSize: '14px', 
              backgroundColor: 'var(--card-accent-pink)', 
              padding: '12px 16px', 
              borderRadius: '16px',
              border: '1px solid rgba(244, 211, 211, 0.5)'
            }}
          >
            <AlertCircle size={18} color="var(--blush-pink)" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* User ID Input */}
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User ID or Email</p>
          <div className="premium-card" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'white'
          }}>
            <User size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="alex or sarah" 
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ 
                flex: 1, 
                border: 'none', 
                outline: 'none', 
                fontSize: '16px',
                background: 'transparent',
                fontFamily: 'var(--font-body)'
              }} 
            />
          </div>
        </div>

        {/* Password Input */}
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</p>
          <div className="premium-card" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'white'
          }}>
            <Lock size={20} color="var(--text-muted)" />
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
                fontFamily: 'var(--font-body)'
              }} 
            />
            <div onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingBottom: '40px' }}>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSignIn}
          disabled={loading}
          className="btn-primary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', gap: '12px', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Signing In...' : 'Sign In'} <ArrowRight size={20} />
        </motion.button>
        
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Private access space for partners.<br />
          Use <span style={{ fontWeight: 600 }}>alex</span> or <span style={{ fontWeight: 600 }}>sarah</span> with password <span style={{ fontWeight: 600 }}>love123</span>
        </p>
      </div>

      {/* Aesthetic Blur Background Element */}
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(255, 183, 197, 0.2) 0%, transparent 70%)',
        filter: 'blur(60px)',
        zIndex: -1
      }} />
    </motion.div>
  );
};

export default Login;
