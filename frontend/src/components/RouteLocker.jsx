import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  clearVaultToken,
  clearAllAlbumUnlockTokens,
  keepOnlyAlbumUnlockToken,
} from '../utils/vaultStore';

// Drives the "re-lock when the user navigates away" rule for the private
// album feature. Mounted once, near the top of the route tree.
//
// Rules:
//   • Vault token is kept only while we're somewhere under /albums or
//     /album/:id (incl. /album/:id/photo/:id). Anywhere else (Home, Chat,
//     Profile, ...) clears it.
//   • An album-unlock token is kept only while the user is inside that
//     specific album's detail screen or its photo viewer. Switching to
//     a different album, or leaving the album section entirely, drops it.
const RouteLocker = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const inAlbumSection = pathname === '/albums' || pathname.startsWith('/album/') || pathname === '/gallery' || pathname.startsWith('/gallery/');

    if (!inAlbumSection) {
      clearVaultToken();
    }

    // /album/:id and /album/:id/photo/:id share the same unlock context.
    const detailMatch = pathname.match(/^\/album\/([^/]+)/);
    if (detailMatch) {
      keepOnlyAlbumUnlockToken(detailMatch[1]);
    } else {
      clearAllAlbumUnlockTokens();
    }
  }, [pathname]);

  return null;
};

export default RouteLocker;
