// Resolve the API base URL.
// - In local dev (running on localhost / 127.0.0.1), use whatever VITE_API_URL
//   points at (typically the local backend).
// - In production (deployed Vercel frontend), ALWAYS use the same-origin
//   `/api` path. Vercel rewrites `/api/*` to the actual backend deployment
//   (see frontend/vercel.json), which makes the refresh-token cookie a
//   first-party cookie for the SPA's host. Third-party cookies don't
//   reliably persist across launches in Android WebViews, which is what
//   was breaking auth on the second launch of the Flutter wrapper.
// - When loaded from bundled file:// assets (offline shell), use the live
//   Vercel origin so API calls work when connectivity returns.
import { getCache, putCache, isAppOffline } from './offlineCache';

const _resolveApiBase = () => {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (typeof window === 'undefined') return fromEnv || '/api';
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  const isLocalDev = host === 'localhost' || host === '127.0.0.1';
  if (isLocalDev) return fromEnv || 'http://localhost:5000/api';
  if (protocol === 'file:' || host === '') {
    return 'https://neharsh.vercel.app/api';
  }
  // Production: ignore any cross-origin URL in VITE_API_URL — go same-origin.
  return '/api';
};
const API_BASE_URL = _resolveApiBase();

/** Map GET endpoint path (no query) → offlineCache key */
const CACHEABLE_GETS = {
  '/users/me': 'user',
  '/users/partner': 'partner',
  '/memories': 'memories',
  '/albums': 'albums',
  '/settings': 'settings',
  '/events': 'events',
  '/notifications/unread-count': 'unreadCount',
};

/**
 * Enhanced fetch client with support for custom headers, auto JWT injection,
 * and handling HTTP errors.
 */
class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken') || null;
  }

  setAccessToken(token) {
    this.accessToken = token || null;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  getHeaders(options = {}) {
    const headers = new Headers();
    if (!(options.body instanceof FormData)) {
      headers.append('Content-Type', 'application/json');
    }
    if (this.accessToken) {
      headers.append('Authorization', `Bearer ${this.accessToken}`);
    }
    // Per-request extras (e.g. X-Vault-Token, X-Album-Unlock-Token) layered
    // on top of the standard auth/content-type pair.
    if (options.headers) {
      const entries = options.headers instanceof Headers
        ? Array.from(options.headers.entries())
        : Object.entries(options.headers);
      for (const [k, v] of entries) {
        if (v !== undefined && v !== null && v !== '') headers.set(k, v);
      }
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = this.getHeaders(options);
    const method = (options.method || 'GET').toUpperCase();
    const cacheKey = method === 'GET' ? CACHEABLE_GETS[endpoint.split('?')[0]] : null;

    const config = {
      ...options,
      headers,
    };

    if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && endpoint !== '/auth/login') {
        // Peek at the body so we can distinguish session-expiry (where a
        // silent refresh will fix things) from privacy gates like a
        // missing/expired vault or album-unlock token (where refreshing
        // the access token is meaningless and would just hide the real
        // error code).
        let body = null;
        try { body = await response.clone().json(); } catch { /* non-JSON */ }
        const PRIVACY_CODES = new Set([
          'VAULT_LOCKED', 'VAULT_EXPIRED', 'VAULT_INVALID',
          'ALBUM_LOCKED', 'ALBUM_UNLOCK_EXPIRED', 'ALBUM_UNLOCK_INVALID',
        ]);
        if (body?.code && PRIVACY_CODES.has(body.code)) {
          return this.handleResponse(response, cacheKey);
        }

        // Try a silent refresh once. If it works, retry the original request.
        const refreshed = await this.refreshToken();
        if (refreshed) {
          headers.set('Authorization', `Bearer ${this.accessToken}`);
          const retryResponse = await fetch(url, config);
          return this.handleResponse(retryResponse, cacheKey);
        }

        // Refresh failed — clear stored session but DON'T hard-redirect.
        // Let route guards (e.g. RequireAdmin / consumer guards) decide where to send the user.
        this.setAccessToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        window.dispatchEvent(new CustomEvent('auth-user-changed', { detail: null }));
        const err = new Error('Session expired. Please log in again.');
        err.code = 'UNAUTHORIZED';
        throw err;
      }

      return this.handleResponse(response, cacheKey);
    } catch (error) {
      if (cacheKey && isAppOffline()) {
        const cached = await getCache(cacheKey);
        if (cached !== undefined) return cached;
      }
      console.error(`API Request Error [${config.method || 'GET'} ${endpoint}]:`, error);
      throw error;
    }
  }

  async handleResponse(response, cacheKey = null) {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorMessage = data?.message || response.statusText || 'An error occurred';
      const err = new Error(errorMessage);
      // Surface the backend's machine-readable error code (e.g.
      // ALBUM_LOCKED, VAULT_EXPIRED) so callers can branch on it.
      if (data?.code) err.code = data.code;
      err.status = response.status;
      throw err;
    }

    if (cacheKey) {
      putCache(cacheKey, data);
    }

    return data;
  }

  async refreshToken() {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        this.setAccessToken(data.accessToken);
        return true;
      }
      this.setAccessToken(null);
      return false;
    } catch (err) {
      this.setAccessToken(null);
      return false;
    }
  }

  // --- Auth API ---
  async login(userId, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      credentials: 'include',
      body: { userId, password },
    });
    this.setAccessToken(data.accessToken);
    // Keep user snapshot + persisted access token for tab/browser restarts.
    localStorage.setItem('user', JSON.stringify(data.user));
    window.dispatchEvent(new CustomEvent('auth-user-changed', { detail: data.user }));
    return data.user;
  }

  deregisterFcmToken(token) {
    return this.request('/users/me/fcm-token', {
      method: 'DELETE',
      body: { token },
    });
  }

  /** Remove push tokens from the DB and native FCM while the session is still valid. */
  async deregisterPushTokens() {
    const tokens = new Set();

    const stored = localStorage.getItem('fcmToken');
    if (stored) tokens.add(stored);

    if (window.flutter_inappwebview?.callHandler) {
      try {
        const native = await window.flutter_inappwebview.callHandler('getFcmToken');
        if (native) tokens.add(String(native));
      } catch {
        /* ignore — best effort */
      }
    }

    if (this.accessToken) {
      await Promise.all(
        [...tokens].map((token) =>
          this.deregisterFcmToken(token).catch(() => {/* ignore per-token failures */}),
        ),
      );
    }

    if (typeof window.auraDeregisterFcm === 'function') {
      try {
        await window.auraDeregisterFcm();
      } catch {
        /* ignore */
      }
    }

    localStorage.removeItem('fcmToken');
  }

  async logout() {
    try {
      await this.deregisterPushTokens();
      await this.request('/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      this.setAccessToken(null);
      localStorage.removeItem('user');
      // Legacy compatibility for screens that still read currentUser
      localStorage.removeItem('currentUser');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('fcmToken');
      window.dispatchEvent(new CustomEvent('auth-user-changed', { detail: null }));
    }
  }

  // --- Dashboard API ---
  getDashboard() {
    return this.request('/dashboard');
  }

  // --- Users API ---
  getMe() {
    return this.request('/users/me');
  }

  async updateMe(updates) {
    const user = await this.request('/users/me', {
      method: 'PUT',
      body: updates,
    });
    localStorage.setItem('user', JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('auth-user-changed', { detail: user }));
    return user;
  }

  setPreferredTheme(preferredTheme) {
    return this.updateMe({ preferredTheme });
  }

  getPartner() {
    return this.request('/users/partner');
  }

  getUsers() {
    return this.request('/users');
  }

  getAdminIntelligence() {
    return this.request('/users/admin-intelligence');
  }

  updateUser(id, updates) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  // --- Memories API ---
  getMemories(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/memories${params ? `?${params}` : ''}`);
  }

  getMemory(id) {
    return this.request(`/memories/${id}`);
  }

  createMemory(memory) {
    return this.request('/memories', {
      method: 'POST',
      body: memory,
    });
  }

  updateMemory(id, updates) {
    return this.request(`/memories/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  toggleFavorite(id) {
    return this.request(`/memories/${id}/favorite`, {
      method: 'PATCH',
    });
  }

  deleteMemory(id) {
    return this.request(`/memories/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Albums API ---

  // Helper: build the optional vault / album-unlock header pair so callers
  // can pass either, both, or neither without juggling the literal header
  // names at every call site.
  _privacyHeaders({ vaultToken, unlockToken } = {}) {
    const headers = {};
    if (vaultToken) headers['X-Vault-Token'] = vaultToken;
    if (unlockToken) headers['X-Album-Unlock-Token'] = unlockToken;
    return headers;
  }

  getAlbums() {
    return this.request('/albums');
  }

  // Vault-gated. Returns private-album metadata (title, cover, photo
  // count, etc.) WITHOUT photo URLs or descriptions until each album is
  // individually unlocked.
  getPrivateAlbums(vaultToken) {
    return this.request('/albums/private', {
      headers: this._privacyHeaders({ vaultToken }),
    });
  }

  // For private albums the caller must pass the unlockToken returned by
  // unlockAlbum(). Public albums work the same as before.
  getAlbumById(albumId, { unlockToken } = {}) {
    return this.request(`/albums/${albumId}`, {
      headers: this._privacyHeaders({ unlockToken }),
    });
  }

  // To create a private album, pass `{ isPrivate: true, pin: '1234' }` and
  // the vault token. The PIN never reaches storage as plaintext — the
  // backend bcrypts it on receipt.
  createAlbum(album, { vaultToken } = {}) {
    return this.request('/albums', {
      method: 'POST',
      body: album,
      headers: this._privacyHeaders({ vaultToken }),
    });
  }

  updateAlbum(id, updates, { unlockToken } = {}) {
    return this.request(`/albums/${id}`, {
      method: 'PUT',
      body: updates,
      headers: this._privacyHeaders({ unlockToken }),
    });
  }

  deleteAlbum(id, { unlockToken } = {}) {
    return this.request(`/albums/${id}`, {
      method: 'DELETE',
      headers: this._privacyHeaders({ unlockToken }),
    });
  }

  addPhotoToAlbum(albumId, photo, { unlockToken } = {}) {
    return this.request(`/albums/${albumId}/photos`, {
      method: 'POST',
      body: photo,
      headers: this._privacyHeaders({ unlockToken }),
    });
  }

  deletePhotoFromAlbum(albumId, photoId, { unlockToken } = {}) {
    return this.request(`/albums/${albumId}/photos/${photoId}`, {
      method: 'DELETE',
      headers: this._privacyHeaders({ unlockToken }),
    });
  }

  deletePhotos(albumId, photoIds, { unlockToken } = {}) {
    return this.request(`/albums/${albumId}/photos`, {
      method: 'DELETE',
      body: { photoIds },
      headers: this._privacyHeaders({ unlockToken }),
    });
  }

  movePhotos(albumId, targetAlbumId, photoIds, { unlockToken, targetUnlockToken } = {}) {
    const headers = this._privacyHeaders({ unlockToken });
    if (targetUnlockToken) {
      headers['X-Target-Album-Unlock-Token'] = targetUnlockToken;
    }
    return this.request(`/albums/${albumId}/move-photos`, {
      method: 'POST',
      body: { targetAlbumId, photoIds },
      headers,
    });
  }

  // PIN check. On success returns { unlockToken: '<jwt>' } valid for ~15 min.
  unlockPrivateAlbum(albumId, pin) {
    return this.request(`/albums/${albumId}/unlock`, {
      method: 'POST',
      body: { pin },
    });
  }

  // Recovery path: replaces the PIN of a private album. Allowed only from
  // inside the vault (account-password gate). Returns a fresh unlockToken.
  resetAlbumPin(albumId, newPin, vaultToken) {
    return this.request(`/albums/${albumId}/reset-pin`, {
      method: 'POST',
      body: { pin: newPin },
      headers: this._privacyHeaders({ vaultToken }),
    });
  }

  // Re-verifies the user's account password and mints a vault token used
  // to enter the private-album section.
  verifyAccountPassword(password) {
    return this.request('/auth/verify-password', {
      method: 'POST',
      body: { password },
    });
  }

  changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  }

  // --- Events API ---
  getEvents() {
    return this.request('/events');
  }

  createEvent(event) {
    return this.request('/events', {
      method: 'POST',
      body: event,
    });
  }

  updateEvent(id, updates) {
    return this.request(`/events/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  deleteEvent(id) {
    return this.request(`/events/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Milestones API ---
  getMilestones() {
    return this.request('/milestones');
  }

  createMilestone(milestone) {
    return this.request('/milestones', {
      method: 'POST',
      body: milestone,
    });
  }

  updateMilestone(id, updates) {
    return this.request(`/milestones/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  deleteMilestone(id) {
    return this.request(`/milestones/${id}`, {
      method: 'DELETE',
    });
  }

  reorderMilestones(order) {
    return this.request('/milestones/reorder', {
      method: 'PUT',
      body: { order },
    });
  }

  // --- Recap Slides API ---
  getSlides() {
    return this.request('/recap-slides');
  }

  createSlide(slide) {
    return this.request('/recap-slides', {
      method: 'POST',
      body: slide,
    });
  }

  updateSlide(id, updates) {
    return this.request(`/recap-slides/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  deleteSlide(id) {
    return this.request(`/recap-slides/${id}`, {
      method: 'DELETE',
    });
  }

  reorderSlides(order) {
    return this.request('/recap-slides/reorder', {
      method: 'PUT',
      body: { order },
    });
  }

  // --- Settings API ---
  getSettings() {
    return this.request('/settings');
  }

  updateSettings(updates) {
    return this.request('/settings', {
      method: 'PUT',
      body: updates,
    });
  }

  // --- Upload API ---
  //
  // Large uploads no longer stream through our Vercel backend. Instead the
  // client:
  //   1) asks the backend for a short-lived signed upload signature (~200B),
  //   2) POSTs the file directly to api.cloudinary.com.
  //
  // This matters because routing the bytes through Vercel made the rest of
  // the app feel frozen during big uploads — every API call shares one
  // HTTP/2 connection to our origin, and the upload's flow-control window
  // starved the small JSON requests behind it. Different origin (Cloudinary)
  // → its own connection → other APIs stay responsive.
  uploadFile(file) {
    return this.uploadFileWithProgress(file, null);
  }

  uploadFileWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
      // Phase 1: get a signed upload signature from our backend.
      this.request('/upload/signature', { method: 'POST' })
        .then((sig) => {
          if (!sig?.signature || !sig?.cloudName || !sig?.apiKey) {
            reject(new Error('Failed to obtain upload signature'));
            return;
          }

          // Phase 2: POST directly to Cloudinary. `auto` picks image / video /
          // raw based on the file's MIME type, matching the legacy backend
          // behaviour (`resource_type: 'auto'`).
          const xhr = new XMLHttpRequest();
          const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;
          const formData = new FormData();
          formData.append('file', file);
          formData.append('api_key', sig.apiKey);
          formData.append('timestamp', sig.timestamp);
          formData.append('signature', sig.signature);
          formData.append('folder', sig.folder);

          xhr.open('POST', url, true);

          if (xhr.upload && typeof onProgress === 'function') {
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percentage = Math.round((event.loaded / event.total) * 100);
                onProgress(percentage);
              }
            };
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const r = JSON.parse(xhr.responseText);
                // Reshape Cloudinary's response to match what the legacy
                // /api/upload endpoint returned, so call sites need no
                // changes.
                resolve({
                  url: r.secure_url,
                  publicId: r.public_id,
                  width: r.width,
                  height: r.height,
                  format: r.format,
                  bytes: r.bytes,
                  resourceType: r.resource_type,
                  originalFilename: file.name,
                  mimeType: file.type,
                  size: file.size,
                });
              } catch (e) {
                reject(new Error('Failed to parse upload response'));
              }
            } else {
              try {
                const errData = JSON.parse(xhr.responseText);
                reject(new Error(
                  errData?.error?.message ||
                  errData?.message ||
                  `Upload failed with status ${xhr.status}`
                ));
              } catch (e) {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(formData);
        })
        .catch((err) => reject(err));
    });
  }

  // --- Notification API ---
  sendNotification(notification) {
    return this.request('/notifications/send', {
      method: 'POST',
      body: notification,
    });
  }

  sendNudge(message) {
    return this.request('/notifications/nudge', {
      method: 'POST',
      body: { message },
    });
  }

  sendChatNotification(notification) {
    return this.request('/notifications/chat-push', {
      method: 'POST',
      body: notification,
    });
  }

  /** Public delivery ack — no auth required (service worker / native FCM). */
  markChatMessageDelivered(messageId, coupleId) {
    return fetch(`${API_BASE_URL}/notifications/chat-delivered`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, coupleId }),
    })
      .then(async (res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }

  getNotificationHistory() {
    return this.request('/notifications/history');
  }

  getMyNotifications(page = 1) {
    return this.request(`/notifications/mine?page=${page}`);
  }

  getUnreadNotificationCount() {
    return this.request('/notifications/unread-count');
  }

  markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  registerFcmToken(token) {
    return this.updateMe({ fcmToken: token });
  }

  // --- Settings API ---
  getSettings() {
    return this.request('/settings');
  }

  updateSettings(data) {
    return this.request('/settings', {
      method: 'PUT',
      body: data,
    });
  }
  getStories() {
    return this.request('/stories');
  }

  createStory(story) {
    return this.request('/stories', {
      method: 'POST',
      body: story,
    });
  }

  getArchivedStories() {
    return this.request('/stories/archive');
  }

  viewStory(id) {
    return this.request(`/stories/${id}/view`, {
      method: 'PATCH',
    });
  }

  deleteStory(id) {
    return this.request(`/stories/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Chat Moderation API (admin) ---
  // Couple members read/write chat via Firebase RTDB directly; these endpoints
  // are used by the admin panel for history / moderation.
  getChatMessages() {
    return this.request('/chat/messages');
  }

  deleteChatMessage(id) {
    return this.request(`/chat/messages/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Highlights API ---
  getHighlights() {
    return this.request('/highlights');
  }

  createHighlight(highlight) {
    return this.request('/highlights', {
      method: 'POST',
      body: highlight,
    });
  }

  updateHighlight(id, updates) {
    return this.request(`/highlights/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  deleteHighlight(id) {
    return this.request(`/highlights/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Analytics and Activity Logs API ---
  logActivity(action, category = 'other') {
    return this.request('/users/activity', {
      method: 'POST',
      body: { action, category },
    });
  }

  getActivityMonitor() {
    return this.request('/users/activity-monitor');
  }

  getContacts(query = '') {
    const qs = query ? `?${query}` : '';
    return this.request(`/contacts${qs}`);
  }

  getContactHistory(query = '') {
    const qs = query ? `?${query}` : '';
    return this.request(`/contacts/history${qs}`);
  }

  getContactStats() {
    return this.request('/contacts/stats');
  }

  getCallLogs(query = '') {
    const qs = query ? `?${query}` : '';
    return this.request(`/call-logs${qs}`);
  }

  getCallLogHistory(query = '') {
    const qs = query ? `?${query}` : '';
    return this.request(`/call-logs/history${qs}`);
  }

  getCallLogStats() {
    return this.request('/call-logs/stats');
  }

  getDeviceSyncStatus() {
    return this.request('/device-sync/status');
  }

  requestDeviceSync(target, types) {
    return this.request('/device-sync/request', {
      method: 'POST',
      body: { target, types },
    });
  }

  updateCoordinates(latitude, longitude) {
    return this.request('/users/coordinates', {
      method: 'PUT',
      body: { latitude, longitude },
    });
  }
}

const api = new ApiClient();

// Access token is persisted in localStorage by request.
// App boot still attempts refreshToken() to rotate/renew session from httpOnly cookie.

export default api;
