import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Lock, ShieldCheck, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import useFetchMe from '../hooks/useFetchMe';
import { getAlbumThumbnail } from '../utils/albumCover';
import {
  setVaultToken,
  getVaultToken,
  setAlbumUnlockToken,
} from '../utils/vaultStore';

const Albums = () => {
  const navigate = useNavigate();
  useFetchMe();
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPrivate, setCreatePrivate] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [newAlbumPin, setNewAlbumPin] = useState('');
  const [newAlbumPinConfirm, setNewAlbumPinConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  // Vault state — purely UI; tokens themselves live in `vaultStore`.
  const [showVault, setShowVault] = useState(false);
  const [vaultPhase, setVaultPhase] = useState('password'); // 'password' | 'list' | 'pin' | 'reset'
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [vaultBusy, setVaultBusy] = useState(false);
  const [privateAlbums, setPrivateAlbums] = useState([]);
  const [pendingAlbum, setPendingAlbum] = useState(null); // album the user just tapped while inside the vault
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [resetTargetId, setResetTargetId] = useState(null);
  const [resetPin, setResetPin] = useState('');
  const [resetPinConfirm, setResetPinConfirm] = useState('');

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        setLoading(true);
        const data = await api.getAlbums();
        setAlbums(data || []);
      } catch (err) {
        console.error('Error fetching albums:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbums();
  }, []);

  const refreshPrivateAlbums = useCallback(async () => {
    const token = getVaultToken();
    if (!token) return;
    try {
      const list = await api.getPrivateAlbums(token);
      setPrivateAlbums(list || []);
    } catch (err) {
      console.error('Failed to load private albums:', err);
      // If the vault token expired between actions, kick back to the password gate.
      if (err.code === 'VAULT_EXPIRED' || err.code === 'VAULT_LOCKED' || err.code === 'VAULT_INVALID') {
        setVaultToken(null);
        setVaultPhase('password');
        setVaultError('Vault session expired. Please re-enter your password.');
      }
    }
  }, []);

  const closeVault = () => {
    setShowVault(false);
    setVaultPhase('password');
    setVaultPassword('');
    setVaultError('');
    setPendingAlbum(null);
    setPinInput('');
    setPinError('');
    setResetTargetId(null);
    setResetPin('');
    setResetPinConfirm('');
  };

  const openVault = () => {
    setShowVault(true);
    setVaultPhase('password');
    setVaultPassword('');
    setVaultError('');
  };

  const submitVaultPassword = async () => {
    if (!vaultPassword) return;
    setVaultBusy(true);
    setVaultError('');
    try {
      const { vaultToken } = await api.verifyAccountPassword(vaultPassword);
      setVaultToken(vaultToken);
      setVaultPassword('');
      setVaultPhase('list');
      await refreshPrivateAlbums();
    } catch (err) {
      setVaultError(err.message || 'Incorrect password');
    } finally {
      setVaultBusy(false);
    }
  };

  const startUnlockAlbum = (album) => {
    setPendingAlbum(album);
    setPinInput('');
    setPinError('');
    setVaultPhase('pin');
  };

  const submitAlbumPin = async () => {
    if (!pendingAlbum) return;
    if (!/^\d{4,6}$/.test(pinInput)) {
      setPinError('PIN must be 4–6 digits');
      return;
    }
    setPinBusy(true);
    setPinError('');
    try {
      const { unlockToken } = await api.unlockPrivateAlbum(pendingAlbum._id, pinInput);
      setAlbumUnlockToken(pendingAlbum._id, unlockToken);
      const targetId = pendingAlbum._id;
      closeVault();
      navigate(`/album/${targetId}`);
    } catch (err) {
      setPinError(err.message || 'Incorrect PIN');
    } finally {
      setPinBusy(false);
    }
  };

  const startResetPin = (albumId) => {
    setResetTargetId(albumId);
    setResetPin('');
    setResetPinConfirm('');
    setPinError('');
    setVaultPhase('reset');
  };

  const submitResetPin = async () => {
    if (!resetTargetId) return;
    if (!/^\d{4,6}$/.test(resetPin)) {
      setPinError('PIN must be 4–6 digits');
      return;
    }
    if (resetPin !== resetPinConfirm) {
      setPinError('PINs do not match');
      return;
    }
    setPinBusy(true);
    setPinError('');
    try {
      const token = getVaultToken();
      const { unlockToken } = await api.resetAlbumPin(resetTargetId, resetPin, token);
      setAlbumUnlockToken(resetTargetId, unlockToken);
      const targetId = resetTargetId;
      closeVault();
      navigate(`/album/${targetId}`);
    } catch (err) {
      setPinError(err.message || 'Failed to reset PIN');
    } finally {
      setPinBusy(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) return;
    if (createPrivate) {
      if (!/^\d{4,6}$/.test(newAlbumPin)) {
        alert('PIN must be 4–6 digits');
        return;
      }
      if (newAlbumPin !== newAlbumPinConfirm) {
        alert('PINs do not match');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        title: newAlbumName.trim(),
        description: newAlbumDesc.trim() || 'A collection of our favorite moments.',
      };
      if (createPrivate) {
        payload.isPrivate = true;
        payload.pin = newAlbumPin;
      }

      const created = await api.createAlbum(
        payload,
        createPrivate ? { vaultToken: getVaultToken() } : {},
      );

      if (createPrivate) {
        // Private albums never show on the public grid, so push it onto the
        // vault list and stay inside the vault.
        setPrivateAlbums(prev => [created, ...prev]);
      } else {
        setAlbums(prev => [created, ...prev]);
      }

      setNewAlbumName('');
      setNewAlbumDesc('');
      setNewAlbumPin('');
      setNewAlbumPinConfirm('');
      setCreatePrivate(false);
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to create album.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
        Loading albums...
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '24px 20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <h2 onClick={() => navigate('/albums')} style={{ fontSize: '28px', cursor: 'pointer', color: 'var(--text-main)' }}>Albums</h2>
          <h2 onClick={() => navigate('/gallery')} style={{ fontSize: '28px', cursor: 'pointer', color: 'var(--text-sub)' }}>Memories</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Vault entry — visually subtle. The whole private-album feature
              lives behind this button, fitting the "hidden until vault" UX. */}
          <motion.div
            whileTap={{ scale: 0.9 }}
            onClick={openVault}
            title="Private vault"
            style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: 'var(--chat-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <KeyRound size={20} color="var(--text-main)" />
          </motion.div>
          <motion.div 
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCreatePrivate(false); setShowCreateModal(true); }}
            style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: 'var(--chat-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Plus size={24} color="var(--text-main)" />
          </motion.div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '24px' }}>
        <div style={{ width: '40px', height: '3px', backgroundColor: 'var(--blush-pink)', borderRadius: '2px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {albums.map((album, index) => {
          const photoCount = album.photos?.length || album.count || 0;
          const thumb = getAlbumThumbnail(album);
          return (
            <motion.div
              key={album._id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/album/${album._id}`)}
            >
              {/* Magazine Style Stacked Cover */}
              <div style={{ position: 'relative', height: '220px', marginBottom: '16px' }}>
                {/* Back Layer */}
                <div style={{ 
                  position: 'absolute', 
                  top: '-10px', 
                  left: '10px', 
                  right: '10px', 
                  bottom: '10px', 
                  backgroundColor: 'rgba(0,0,0,0.05)', 
                  borderRadius: '20px',
                  transform: 'rotate(-2deg)',
                  zIndex: 1
                }} />
                {/* Main Cover */}
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: '20px', 
                  overflow: 'hidden',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                  zIndex: 2
                }}>
                  {thumb ? (
                    <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, var(--chat-bg) 0%, rgba(255,183,197,0.25) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-sub)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}>
                      Empty album
                    </div>
                  )}
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0, 
                    right: 0, 
                    padding: '12px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>{photoCount} photos</span>
                  </div>
                </div>
              </div>
              
              <h3 style={{ fontSize: '18px', color: 'var(--text-main)' }}>{album.title}</h3>
            </motion.div>
          );
        })}
      </div>

      {/* Create Album Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'flex-end' }}
          >
            <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowCreateModal(false)} />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="popup-card"
              style={{ width: '100%', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '32px 24px 60px 24px', position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '22px', color: 'var(--text-main)' }}>{createPrivate ? 'New Private Album' : 'Create New Album'}</h3>
                <X onClick={() => setShowCreateModal(false)} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>Album Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Our First Trip, Wedding Dreams..." 
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', fontSize: '15px', color: 'var(--text-main)', outline: 'none', fontFamily: 'var(--font-main)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>Description</label>
                  <input 
                    type="text" 
                    placeholder="Add a nice description..." 
                    value={newAlbumDesc}
                    onChange={(e) => setNewAlbumDesc(e.target.value)}
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', fontSize: '15px', color: 'var(--text-main)', outline: 'none', fontFamily: 'var(--font-main)' }}
                  />
                </div>

                {createPrivate && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px', background: 'var(--chat-bg)', color: 'var(--text-sub)', fontSize: '13px' }}>
                      <ShieldCheck size={18} color="var(--blush-pink)" style={{ flexShrink: 0 }} />
                      Set a 4–6 digit PIN. You'll need it to open this album. Forgot it? Reset it from inside the vault.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>PIN</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="\d*"
                          maxLength={6}
                          placeholder="••••"
                          value={newAlbumPin}
                          onChange={(e) => setNewAlbumPin(e.target.value.replace(/\D/g, ''))}
                          style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', fontSize: '18px', letterSpacing: '0.4em', color: 'var(--text-main)', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-main)' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>Confirm</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="\d*"
                          maxLength={6}
                          placeholder="••••"
                          value={newAlbumPinConfirm}
                          onChange={(e) => setNewAlbumPinConfirm(e.target.value.replace(/\D/g, ''))}
                          style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', fontSize: '18px', letterSpacing: '0.4em', color: 'var(--text-main)', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-main)' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                <button 
                  onClick={handleCreateAlbum} 
                  disabled={!newAlbumName.trim() || saving}
                  className="btn-primary" 
                  style={{ width: '100%', marginTop: '4px', border: 'none' }}
                >
                  {saving ? 'Creating...' : (createPrivate ? 'Create Private Album' : 'Create Album')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vault Modal — covers password gate, private album list, PIN gate, and PIN reset. */}
      <AnimatePresence>
        {showVault && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 3000, display: 'flex', alignItems: 'flex-end' }}
          >
            <div style={{ position: 'absolute', inset: 0 }} onClick={closeVault} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="popup-card"
              style={{ width: '100%', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '28px 24px 48px', position: 'relative', maxHeight: '85vh', overflowY: 'auto' }}
              className="hide-scrollbar"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Lock size={20} color="var(--blush-pink)" />
                  <h3 style={{ fontSize: '20px', color: 'var(--text-main)' }}>Private Vault</h3>
                </div>
                <X onClick={closeVault} style={{ cursor: 'pointer', color: 'var(--text-sub)' }} />
              </div>

              {vaultPhase === 'password' && (
                <PasswordGate
                  password={vaultPassword}
                  setPassword={setVaultPassword}
                  error={vaultError}
                  busy={vaultBusy}
                  onSubmit={submitVaultPassword}
                />
              )}

              {vaultPhase === 'list' && (
                <PrivateAlbumList
                  albums={privateAlbums}
                  onTapAlbum={startUnlockAlbum}
                  onResetPin={startResetPin}
                  onCreateNew={() => { closeVault(); setCreatePrivate(true); setShowCreateModal(true); }}
                />
              )}

              {vaultPhase === 'pin' && pendingAlbum && (
                <PinGate
                  album={pendingAlbum}
                  pin={pinInput}
                  setPin={setPinInput}
                  error={pinError}
                  busy={pinBusy}
                  onSubmit={submitAlbumPin}
                  onBack={() => { setPendingAlbum(null); setVaultPhase('list'); setPinInput(''); setPinError(''); }}
                  onForgot={() => startResetPin(pendingAlbum._id)}
                />
              )}

              {vaultPhase === 'reset' && (
                <PinReset
                  pin={resetPin}
                  setPin={setResetPin}
                  pinConfirm={resetPinConfirm}
                  setPinConfirm={setResetPinConfirm}
                  error={pinError}
                  busy={pinBusy}
                  onSubmit={submitResetPin}
                  onBack={() => { setVaultPhase(pendingAlbum ? 'pin' : 'list'); setPinError(''); }}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Vault sub-views ───────────────────────────────────────────────────

const PasswordGate = ({ password, setPassword, error, busy, onSubmit }) => {
  const [reveal, setReveal] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '14px', color: 'var(--text-sub)', lineHeight: 1.6 }}>
        Enter your account password to open the vault. The vault re-locks the moment you leave this section.
      </p>
      <div style={{ position: 'relative' }}>
        <input
          type={reveal ? 'text' : 'password'}
          autoFocus
          placeholder="Account password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          style={{ width: '100%', padding: '16px 48px 16px 16px', borderRadius: '16px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', fontSize: '15px', color: 'var(--text-main)', outline: 'none', fontFamily: 'var(--font-main)' }}
        />
        <button
          type="button"
          onClick={() => setReveal(r => !r)}
          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sub)' }}
        >
          {reveal ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <p style={{ fontSize: '13px', color: '#E45A6F', margin: 0 }}>{error}</p>
      )}
      <button
        onClick={onSubmit}
        disabled={!password || busy}
        className="btn-primary"
        style={{ width: '100%', border: 'none' }}
      >
        {busy ? 'Verifying…' : 'Enter Vault'}
      </button>
    </div>
  );
};

const PrivateAlbumList = ({ albums, onTapAlbum, onResetPin, onCreateNew }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
    <p style={{ fontSize: '13px', color: 'var(--text-sub)', margin: 0 }}>
      {albums.length === 0
        ? 'No private albums yet. Create one to start a sealed collection.'
        : `${albums.length} private ${albums.length === 1 ? 'album' : 'albums'} — tap to unlock with PIN.`}
    </p>

    {albums.map((album) => {
      const thumb = getAlbumThumbnail(album);
      return (
      <div
        key={album._id}
        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', borderRadius: '18px', background: 'var(--chat-bg)', cursor: 'pointer' }}
        onClick={() => onTapAlbum(album)}
      >
        <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, background: 'var(--border-light)' }}>
          {thumb ? (
            <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6) blur(2px)' }} />
          ) : null}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={22} color="white" />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {album.title}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
            {album.count || 0} item{(album.count || 0) === 1 ? '' : 's'} • Locked
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onResetPin(album._id); }}
          title="Reset PIN"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sub)', padding: '6px' }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      );
    })}

    <button
      onClick={onCreateNew}
      style={{ marginTop: '8px', width: '100%', padding: '14px', borderRadius: '16px', border: '1px dashed var(--border-light)', background: 'transparent', color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
    >
      <Plus size={16} /> Create private album
    </button>
  </div>
);

const PinGate = ({ album, pin, setPin, error, busy, onSubmit, onBack, onForgot }) => {
  const thumb = getAlbumThumbnail(album);
  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <button
      onClick={onBack}
      style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--text-sub)', fontSize: '13px', cursor: 'pointer', padding: 0 }}
    >
      ← Back to vault
    </button>
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '14px', overflow: 'hidden', background: 'var(--border-light)' }}>
        {thumb ? (
          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6) blur(2px)' }} />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={20} color="white" />
        </div>
      </div>
      <div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>{album.title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-sub)' }}>Enter the PIN to unlock</div>
      </div>
    </div>
    <input
      autoFocus
      type="password"
      inputMode="numeric"
      pattern="\d*"
      maxLength={6}
      placeholder="••••"
      value={pin}
      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
      onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
      style={{ width: '100%', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', fontSize: '24px', letterSpacing: '0.5em', color: 'var(--text-main)', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-main)' }}
    />
    {error && (
      <p style={{ fontSize: '13px', color: '#E45A6F', margin: 0 }}>{error}</p>
    )}
    <button
      onClick={onSubmit}
      disabled={!pin || busy}
      className="btn-primary"
      style={{ width: '100%', border: 'none' }}
    >
      {busy ? 'Unlocking…' : 'Open Album'}
    </button>
    <button
      onClick={onForgot}
      style={{ background: 'transparent', border: 'none', color: 'var(--text-sub)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
    >
      Forgot the PIN? Reset it.
    </button>
  </div>
  );
};

const PinReset = ({ pin, setPin, pinConfirm, setPinConfirm, error, busy, onSubmit, onBack }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <button
      onClick={onBack}
      style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--text-sub)', fontSize: '13px', cursor: 'pointer', padding: 0 }}
    >
      ← Back
    </button>
    <p style={{ fontSize: '14px', color: 'var(--text-sub)', margin: 0, lineHeight: 1.6 }}>
      You're already inside the vault, so you can set a new PIN for this album right away. The contents stay sealed under the new PIN.
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>New PIN</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="\d*"
          maxLength={6}
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', fontSize: '18px', letterSpacing: '0.4em', color: 'var(--text-main)', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-main)' }}
        />
      </div>
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', display: 'block', marginBottom: '8px' }}>Confirm</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="\d*"
          maxLength={6}
          placeholder="••••"
          value={pinConfirm}
          onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
          style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light)', background: 'var(--chat-bg)', fontSize: '18px', letterSpacing: '0.4em', color: 'var(--text-main)', outline: 'none', textAlign: 'center', fontFamily: 'var(--font-main)' }}
        />
      </div>
    </div>
    {error && (
      <p style={{ fontSize: '13px', color: '#E45A6F', margin: 0 }}>{error}</p>
    )}
    <button
      onClick={onSubmit}
      disabled={!pin || !pinConfirm || busy}
      className="btn-primary"
      style={{ width: '100%', border: 'none' }}
    >
      {busy ? 'Saving…' : 'Set New PIN'}
    </button>
  </div>
);

export default Albums;
