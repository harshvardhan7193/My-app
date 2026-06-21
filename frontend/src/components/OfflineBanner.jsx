import { WifiOff } from 'lucide-react';
import useOnlineStatus from '../hooks/useOnlineStatus';

const OfflineBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 16px',
        paddingTop: 'max(10px, env(safe-area-inset-top))',
        background: 'linear-gradient(135deg, #F4D3D3, #FFB7C5)',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 2px 12px rgba(255, 183, 197, 0.35)',
      }}
    >
      <WifiOff size={16} strokeWidth={2.5} />
      <span>You&apos;re offline — showing saved content</span>
    </div>
  );
};

export default OfflineBanner;
