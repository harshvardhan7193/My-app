// Resolve the API base URL.
// - In local dev (running on localhost / 127.0.0.1), use whatever VITE_API_URL
//   points at (typically the local backend).
// - In production (deployed Vercel frontend), ALWAYS use the same-origin
//   `/api` path. Vercel rewrites `/api/*` to the actual backend deployment
//   (see frontend/vercel.json), which makes the refresh-token cookie a
//   first-party cookie for the SPA's host. Third-party cookies don't
//   reliably persist across launches in Android WebViews, which is what
//   was breaking auth on the second launch of the Flutter wrapper.
const _resolveApiBase = () => {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (typeof window === 'undefined') return fromEnv || '/api';
  const host = window.location.hostname;
  const isLocalDev = host === 'localhost' || host === '127.0.0.1';
  if (isLocalDev) return fromEnv || 'http://localhost:5000/api';
  // Production: ignore any cross-origin URL in VITE_API_URL — go same-origin.
  return '/api';
};
const API_BASE_URL = _resolveApiBase();

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
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = this.getHeaders(options);

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
        // Try a silent refresh once. If it works, retry the original request.
        const refreshed = await this.refreshToken();
        if (refreshed) {
          headers.set('Authorization', `Bearer ${this.accessToken}`);
          const retryResponse = await fetch(url, config);
          return this.handleResponse(retryResponse);
        }

        // Refresh failed — clear stored session but DON'T hard-redirect.
        // Let route guards (e.g. RequireAdmin / consumer guards) decide where to send the user.
        this.setAccessToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('currentUser');
        const err = new Error('Session expired. Please log in again.');
        err.code = 'UNAUTHORIZED';
        throw err;
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error(`API Request Error [${config.method || 'GET'} ${endpoint}]:`, error);
      throw error;
    }
  }

  async handleResponse(response) {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorMessage = data?.message || response.statusText || 'An error occurred';
      throw new Error(errorMessage);
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
    return data.user;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      this.setAccessToken(null);
      localStorage.removeItem('user');
      // Legacy compatibility for screens that still read currentUser
      localStorage.removeItem('currentUser');
      localStorage.removeItem('accessToken');
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

  updateMe(updates) {
    return this.request('/users/me', {
      method: 'PUT',
      body: updates,
    });
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
  getAlbums() {
    return this.request('/albums');
  }

  createAlbum(album) {
    return this.request('/albums', {
      method: 'POST',
      body: album,
    });
  }

  updateAlbum(id, updates) {
    return this.request(`/albums/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  deleteAlbum(id) {
    return this.request(`/albums/${id}`, {
      method: 'DELETE',
    });
  }

  addPhotoToAlbum(albumId, photo) {
    return this.request(`/albums/${albumId}/photos`, {
      method: 'POST',
      body: photo,
    });
  }

  deletePhotoFromAlbum(albumId, photoId) {
    return this.request(`/albums/${albumId}/photos/${photoId}`, {
      method: 'DELETE',
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

  deregisterFcmToken(token) {
    return this.request('/users/me/fcm-token', {
      method: 'DELETE',
      body: { token },
    });
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
