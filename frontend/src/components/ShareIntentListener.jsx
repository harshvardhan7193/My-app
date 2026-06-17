import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ShareIntentListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleSharedMedia = () => {
      navigate('/chat');
    };

    const checkPendingSharedMedia = async () => {
      if (window.flutter_inappwebview) {
        try {
          const hasMedia = await window.flutter_inappwebview.callHandler('hasPendingSharedMedia');
          if (hasMedia) {
            navigate('/chat');
          }
        } catch (err) {
          console.error('[ShareIntentListener] failed to check pending media:', err);
        }
      }
    };

    // Check on mount (in case app launched via share intent)
    checkPendingSharedMedia();

    window.addEventListener('shared-media-received', handleSharedMedia);
    return () => {
      window.removeEventListener('shared-media-received', handleSharedMedia);
    };
  }, [navigate]);

  return null;
};

export default ShareIntentListener;
