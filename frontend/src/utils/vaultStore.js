// In-memory store for the vault token and per-album unlock tokens.
//
// Memory-only by design: a hard reload of the WebView wipes everything,
// which matches the "lock everything when navigating away" UX the user
// asked for. We never persist these to localStorage — that would survive
// app restarts and weaken the privacy guarantee.

const state = {
  vaultToken: null,
  albumTokens: new Map(), // albumId → unlock JWT
};

export const setVaultToken = (token) => {
  state.vaultToken = token || null;
};

export const getVaultToken = () => state.vaultToken;

export const clearVaultToken = () => {
  state.vaultToken = null;
};

export const setAlbumUnlockToken = (albumId, token) => {
  if (!albumId) return;
  if (token) state.albumTokens.set(String(albumId), token);
  else state.albumTokens.delete(String(albumId));
};

export const getAlbumUnlockToken = (albumId) =>
  albumId ? state.albumTokens.get(String(albumId)) || null : null;

export const clearAlbumUnlockToken = (albumId) => {
  if (!albumId) return;
  state.albumTokens.delete(String(albumId));
};

export const clearAllAlbumUnlockTokens = () => {
  state.albumTokens.clear();
};

// Drop every unlock token EXCEPT the one for `keepAlbumId`. Used by the
// route watcher: once the user enters /album/:id we want to forget any
// unlock from a previously-opened private album.
export const keepOnlyAlbumUnlockToken = (keepAlbumId) => {
  const keep = keepAlbumId ? String(keepAlbumId) : null;
  for (const id of Array.from(state.albumTokens.keys())) {
    if (id !== keep) state.albumTokens.delete(id);
  }
};
