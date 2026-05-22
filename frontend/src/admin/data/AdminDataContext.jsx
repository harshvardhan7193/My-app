import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../../utils/api';

const AdminDataContext = createContext(null);

export const AdminDataProvider = ({ children }) => {
  const [memories, setMemories] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [recapSlides, setRecapSlides] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({
    anniversaryDate: '',
    autoCelebrate: true,
    confetti: true,
    theme: 'light',
    twoFactor: false,
    debugMode: false,
  });
  const [loading, setLoading] = useState(true);

  // Fetch all data from API on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [
          memoriesData,
          albumsData,
          eventsData,
          milestonesData,
          slidesData,
          usersData,
          settingsData,
          messagesData,
        ] = await Promise.all([
          api.getMemories(),
          api.getAlbums(),
          api.getEvents(),
          api.getMilestones(),
          api.getSlides(),
          api.getUsers(),
          api.getSettings(),
          api.getChatMessages().catch(() => []),
        ]);

        setMemories(memoriesData.memories || memoriesData || []);
        setAlbums(albumsData || []);
        setEvents(eventsData || []);
        setMilestones(milestonesData || []);
        setRecapSlides(slidesData || []);
        setUsers(usersData || []);
        setSettings(settingsData || {});
        setMessages(messagesData || []);
      } catch (err) {
        console.error('Error loading admin space data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Memories CRUD
  const addMemory = async (memory) => {
    try {
      const created = await api.createMemory(memory);
      setMemories(prev => [created, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const updateMemory = async (id, updates) => {
    try {
      const updated = await api.updateMemory(id, updates);
      setMemories(prev => prev.map(m => m._id === id ? updated : m));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMemory = async (id) => {
    try {
      await api.deleteMemory(id);
      setMemories(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFavorite = async (id) => {
    try {
      const updated = await api.toggleFavorite(id);
      setMemories(prev => prev.map(m => m._id === id ? updated : m));
    } catch (err) {
      console.error(err);
    }
  };

  // Albums CRUD
  const addAlbum = async (album) => {
    try {
      const created = await api.createAlbum(album);
      setAlbums(prev => [created, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const updateAlbum = async (id, updates) => {
    try {
      const updated = await api.updateAlbum(id, updates);
      setAlbums(prev => prev.map(a => a._id === id ? updated : a));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAlbum = async (id) => {
    try {
      await api.deleteAlbum(id);
      setAlbums(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const addPhotoToAlbum = async (albumId, photo) => {
    try {
      const updated = await api.addPhotoToAlbum(albumId, photo);
      setAlbums(prev => prev.map(a => a._id === albumId ? updated : a));
    } catch (err) {
      console.error(err);
    }
  };

  const deletePhotoFromAlbum = async (albumId, photoId) => {
    try {
      const updated = await api.deletePhotoFromAlbum(albumId, photoId);
      setAlbums(prev => prev.map(a => a._id === albumId ? updated : a));
    } catch (err) {
      console.error(err);
    }
  };

  // Messages (Admin manage) — backed by Firebase RTDB via /api/chat/messages
  const deleteMessage = async (id) => {
    try {
      await api.deleteChatMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Events CRUD
  const addEvent = async (event) => {
    try {
      const created = await api.createEvent(event);
      setEvents(prev => [created, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const updateEvent = async (id, updates) => {
    try {
      const updated = await api.updateEvent(id, updates);
      setEvents(prev => prev.map(e => e._id === id ? updated : e));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await api.deleteEvent(id);
      setEvents(prev => prev.filter(e => e._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Milestones CRUD
  const addMilestone = async (milestone) => {
    try {
      const created = await api.createMilestone(milestone);
      setMilestones(prev => [...prev, created]);
    } catch (err) {
      console.error(err);
    }
  };

  const updateMilestone = async (id, updates) => {
    try {
      const updated = await api.updateMilestone(id, updates);
      setMilestones(prev => prev.map(m => m._id === id ? updated : m));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMilestone = async (id) => {
    try {
      await api.deleteMilestone(id);
      setMilestones(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const reorderMilestones = async (newOrder) => {
    try {
      setMilestones(newOrder);
      const payload = newOrder.map((m, idx) => ({ id: m._id, order: idx }));
      await api.reorderMilestones(payload);
    } catch (err) {
      console.error(err);
    }
  };

  // Recap Slides CRUD
  const addSlide = async (slide) => {
    try {
      const created = await api.createSlide(slide);
      setRecapSlides(prev => [...prev, created]);
    } catch (err) {
      console.error(err);
    }
  };

  const updateSlide = async (id, updates) => {
    try {
      const updated = await api.updateSlide(id, updates);
      setRecapSlides(prev => prev.map(s => s._id === id ? updated : s));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSlide = async (id) => {
    try {
      await api.deleteSlide(id);
      setRecapSlides(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const reorderSlides = async (newOrder) => {
    try {
      setRecapSlides(newOrder);
      const payload = newOrder.map((s, idx) => ({ id: s._id, order: idx }));
      await api.reorderSlides(payload);
    } catch (err) {
      console.error(err);
    }
  };

  // Users Management
  const updateUser = async (id, updates) => {
    try {
      const updated = await api.updateUser(id, updates);
      setUsers(prev => prev.map(u => u._id === id ? updated : u));
    } catch (err) {
      console.error(err);
    }
  };

  // Settings
  const updateSettings = async (updates) => {
    try {
      const updated = await api.updateSettings(updates);
      setSettings(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminDataContext.Provider value={{
      memories, addMemory, updateMemory, deleteMemory, toggleFavorite,
      albums, addAlbum, updateAlbum, deleteAlbum, addPhotoToAlbum, deletePhotoFromAlbum,
      messages, deleteMessage,
      events, addEvent, updateEvent, deleteEvent,
      milestones, addMilestone, updateMilestone, deleteMilestone, reorderMilestones,
      recapSlides, addSlide, updateSlide, deleteSlide, reorderSlides,
      users, updateUser,
      settings, updateSettings,
      loading,
    }}>
      {children}
    </AdminDataContext.Provider>
  );
};

export const useAdminData = () => {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData must be used inside AdminDataProvider');
  return ctx;
};
