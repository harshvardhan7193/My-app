import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Heart, ArrowRight, ChevronLeft } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      style={{
        height: '100vh',
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--warm-white)'
      }}
    >
      <motion.div
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate(-1)}
        style={{ marginBottom: '32px', color: 'var(--text-secondary)', cursor: 'pointer' }}
      >
        <ChevronLeft size={28} />
      </motion.div>

      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '12px' }}>Start your <span className="serif" style={{ fontStyle: 'italic' }}>journey</span></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Create a beautiful space for the two of you.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <InputGroup icon={User} label="Your Name" placeholder="Harsh" />
        <InputGroup icon={Mail} label="Email Address" placeholder="Harsh@example.com" />
        <InputGroup icon={Heart} label="Partner's Email" placeholder="Neha@example.com" />
      </div>

      <div style={{ marginTop: 'auto', paddingBottom: '40px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '24px', lineHeight: 1.6 }}>
          By signing up, you agree to our <span style={{ textDecoration: 'underline' }}>Privacy Policy</span> and <span style={{ textDecoration: 'underline' }}>Terms of Service</span>.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard')}
          className="btn-primary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
        >
          Send Invite <ArrowRight size={20} />
        </motion.button>
      </div>
    </motion.div>
  );
};

const InputGroup = ({ icon: Icon, label, placeholder }) => (
  <div style={{ position: 'relative' }}>
    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    <div className="premium-card" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      borderRadius: '16px',
      backgroundColor: 'white'
    }}>
      <Icon size={20} color="var(--text-muted)" />
      <input
        type="text"
        placeholder={placeholder}
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
);

export default Signup;
