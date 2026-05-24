const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/upload', {
      method: 'POST',
      body: formData,
    });
  }

  uploadFileWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${API_BASE_URL}/upload`;
      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', url, true);
      
      // Inject Authorization header if token is present
      if (this.accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
      }

      // Track upload progress events
      if (xhr.upload && onProgress) {
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
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData?.message || `Upload failed with status ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.send(formData);
    });
  }

  // --- Notification API ---
  sendNotification(notification) {
    return this.request('/notifications/send', {
      method: 'POST',
      body: notification,
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
}

const api = new ApiClient();

// Access token is persisted in localStorage by request.
// App boot still attempts refreshToken() to rotate/renew session from httpOnly cookie.

export default api;
