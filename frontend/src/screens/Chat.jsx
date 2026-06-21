import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Heart, Paperclip, MoreVertical, Search, Phone, Video, ChevronLeft, X, ChevronUp, ChevronDown, Play, FileText, Music2, Download, ExternalLink, Reply, Check, CheckCheck, Copy, Info, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { putCache, getCache, isAppOffline } from '../utils/offlineCache';
import { subscribeMessages, pushMessage, searchAllMessages, updateMessageStatus, editMessageText } from '../config/firebase';
import chatBgLight from '../assets/images/chat background/theme1 light.jpg';
import chatBgDark from '../assets/images/chat background/theme1 dark.png';

const Chat = () => {
  const navigate = useNavigate();
  const online = useOnlineStatus();

  // Identity / partner — loaded from the backend, with a localStorage fallback for display while loading
  const [me, setMe] = useState(() => {
    const saved = localStorage.getItem('user') || localStorage.getItem('currentUser');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.coupleId && (parsed._id || parsed.id)) {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });

  const [partner, setPartner] = useState(() => {
    const saved = localStorage.getItem('partner');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const savedMe = localStorage.getItem('currentUser');
    if (savedMe) {
      try {
        const parsedMe = JSON.parse(savedMe);
        if (parsedMe.partnerName) {
          return {
            name: parsedMe.partnerName,
            avatar: parsedMe.partnerAvatar,
          };
        }
      } catch (e) {}
    }
    return null;
  });

  const user = React.useMemo(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return {
      role: 'male',
      name: 'Harsh Panchal',
      partnerName: 'Neha Panchal',
      avatar: 'https://i.pravatar.cc/200?u=Harsh',
      partnerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop',
    };
  }, []);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadingLabel, setUploadingLabel] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [replyToMsg, setReplyToMsg] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [longPressedMsg, setLongPressedMsg] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(
    typeof document !== 'undefined' && document.body.classList.contains('dark-mode')
  );
  const [composerActive, setComposerActive] = useState(false);
  const inputAreaRef = useRef(null);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const didInitialScrollRef = useRef(false);
  const processedMessageIdsRef = useRef(new Set());

  // Paginated history: start by showing only the latest 20 messages, and
  // load 20 more older messages each time the user scrolls near the top.
  const PAGE_SIZE = 20;
  const [messageLimit, setMessageLimit] = useState(PAGE_SIZE);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // When true, the next messages update is from a "load more older" event —
  // skip auto-scroll-to-bottom and instead preserve the user's scroll anchor.
  const loadingMoreRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);

  const scrollToBottom = (behavior = 'smooth') => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };

  // Jump to the latest message — retried across frames because the chat mounts
  // right after the door animation when flex layout / images may not be final yet.
  const ensureScrolledToLatest = useCallback(() => {
    const jump = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      container.scrollTop = container.scrollHeight;
    };
    jump();
    requestAnimationFrame(jump);
    requestAnimationFrame(() => requestAnimationFrame(jump));
    [50, 150, 350, 600].forEach((ms) => setTimeout(jump, ms));
  }, []);

  // Keep the latest messages visible when the composer is focused.
  useEffect(() => {
    if (!composerActive) return;
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [composerActive]);

  useLayoutEffect(() => {
    if (!messages.length) return;

    // Pagination: older messages just streamed in. Restore the user's view so
    // they stay anchored to the same message they were reading instead of
    // being yanked to the top or the bottom.
    if (loadingMoreRef.current) {
      const container = scrollContainerRef.current;
      if (container) {
        const delta = container.scrollHeight - prevScrollHeightRef.current;
        container.scrollTop = prevScrollTopRef.current + delta;
      }
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
      return;
    }

    if (!didInitialScrollRef.current) {
      ensureScrolledToLatest();
      // Mark initial scroll done only after layout has had time to settle
      // (door open fade + message bubble paint). Prevents a later me?._id
      // update from treating the view as "user scrolled up" while still at top.
      setTimeout(() => {
        ensureScrolledToLatest();
        didInitialScrollRef.current = true;
      }, 400);
      return;
    }

    const lastMsg = messages[messages.length - 1];
    const sentByMe = lastMsg?.sender === String(me?._id);

    // If sent by me, snap to bottom instantly for immediate light-speed feedback
    if (sentByMe) {
      scrollToBottom('auto');
    } else {
      // If received from partner, only scroll if user is already near the bottom
      const container = scrollContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 350;
        if (isNearBottom) {
          scrollToBottom('smooth');
        }
      } else {
        scrollToBottom('smooth');
      }
    }
  }, [messages, me?._id, ensureScrolledToLatest]);

  // Belt-and-suspenders: when Chat first mounts after the door opens, keep
  // pinning to the bottom until the initial scroll latch is set.
  useEffect(() => {
    if (!messages.length || didInitialScrollRef.current) return undefined;
    ensureScrolledToLatest();
    const t = setTimeout(ensureScrolledToLatest, 500);
    return () => clearTimeout(t);
  }, [messages.length, ensureScrolledToLatest]);

  // Triggered when the user scrolls near the top of the message list — bump
  // the live window by another page so older history streams in.
  const handleMessagesScroll = (e) => {
    const el = e.currentTarget;
    const isScrolledUp = el.scrollHeight - el.scrollTop - el.clientHeight > 300;
    setShowScrollDown(isScrolledUp);

    if (
      el.scrollTop < 80 &&
      hasMoreOlder &&
      !isLoadingMore &&
      !loadingMoreRef.current &&
      messages.length >= messageLimit
    ) {
      loadingMoreRef.current = true;
      prevScrollHeightRef.current = el.scrollHeight;
      prevScrollTopRef.current = el.scrollTop;
      setIsLoadingMore(true);
      setMessageLimit((n) => n + PAGE_SIZE);
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const updateTheme = () => {
      setIsDarkMode(document.body.classList.contains('dark-mode'));
    };

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
    updateTheme();

    return () => observer.disconnect();
  }, []);

  // Bootstrap: resolve current user + partner once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meData, partnerData] = await Promise.all([
          api.getMe(),
          api.getPartner().catch(() => null),
        ]);
        if (cancelled) return;
        
        if (meData) {
          setMe(meData);
          localStorage.setItem('user', JSON.stringify(meData));
          
          // Keep legacy currentUser in sync
          const savedMe = localStorage.getItem('currentUser');
          if (savedMe) {
            try {
              const parsed = JSON.parse(savedMe);
              parsed._id = meData._id;
              parsed.coupleId = meData.coupleId;
              parsed.name = meData.name;
              parsed.avatar = meData.avatar;
              localStorage.setItem('currentUser', JSON.stringify(parsed));
            } catch (e) {}
          }
        }
        
        if (partnerData) {
          setPartner(partnerData);
          localStorage.setItem('partner', JSON.stringify(partnerData));
        }
      } catch (err) {
        console.error('Chat bootstrap failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Check for shared media from outside apps (Android Gallery Share Intent)
  useEffect(() => {
    if (!me?._id || !me?.coupleId) return;

    const checkSharedMedia = async () => {
      if (window.flutter_inappwebview) {
        try {
          const files = await window.flutter_inappwebview.callHandler('getPendingSharedMedia');
          if (files && files.length > 0) {
            for (const fileData of files) {
              try {
                // fileData is: { name, mimeType, size, dataUrl }
                // Convert dataUrl back to a JS File/Blob object
                const res = await fetch(fileData.dataUrl);
                const blob = await res.blob();
                const file = new File([blob], fileData.name, { type: fileData.mimeType });
                
                // Upload and send!
                const mimeType = fileData.mimeType || '';
                const isImage = mimeType.startsWith('image/');
                const isVideo = mimeType.startsWith('video/');
                const isAudio = mimeType.startsWith('audio/');
                const messageType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';
                const mediaKindLabel = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';

                setUploadingLabel(`Uploading shared ${mediaKindLabel}...`);
                setUploadProgress(5);
                triggerToast(`Uploading shared ${mediaKindLabel}...`);

                const uploadRes = await api.uploadFileWithProgress(file, (percentage) => {
                  setUploadProgress((prev) => {
                    const floor = typeof prev === 'number' ? prev : 5;
                    return Math.max(floor, Math.min(95, percentage));
                  });
                });

                setUploadingLabel('Sending message...');
                setUploadProgress(97);

                const payload = {
                  type: messageType,
                  mediaUrl: uploadRes.url,
                  mediaPublicId: uploadRes.publicId,
                  mediaMimeType: uploadRes.mimeType || mimeType,
                  mediaName: uploadRes.originalFilename || file.name,
                  mediaSize: uploadRes.size || file.size,
                  mediaFormat: uploadRes.format,
                  mediaResourceType: uploadRes.resourceType,
                  sender: String(me._id),
                };

                const msgId = await pushMessage(me.coupleId, payload);
                api.logActivity('Sent a message', 'chat').catch(() => {});
                if (partner?._id) {
                  api.sendChatNotification({
                    recipientId: String(partner._id),
                    messagePreview: `Sent a photo/file: ${mediaKindLabel}`,
                    messageId: msgId
                  }).catch((err) => console.error('Failed to send chat push notification:', err));
                }

                setUploadProgress(100);
                setTimeout(() => {
                  setUploadProgress(null);
                  setUploadingLabel('');
                }, 250);
              } catch (err) {
                console.error('Failed to process and upload shared file:', err);
                setUploadProgress(null);
                setUploadingLabel('');
                triggerToast('Upload failed');
              }
            }
          }
        } catch (err) {
          console.error('Failed to check pending shared media:', err);
        }
      }
    };

    // Check immediately on load/mount when `me` is ready
    checkSharedMedia();

    window.addEventListener('shared-media-received', checkSharedMedia);
    return () => {
      window.removeEventListener('shared-media-received', checkSharedMedia);
    };
  }, [me, partner]);

  // Restore cached chat history when offline.
  useEffect(() => {
    if (!me?.coupleId || !isAppOffline()) return undefined;
    let cancelled = false;
    getCache('chatMessages').then((cached) => {
      if (!cancelled && Array.isArray(cached) && cached.length) {
        setMessages(cached);
      }
    });
    return () => { cancelled = true; };
  }, [me?.coupleId]);

  // Subscribe to the live message stream with a growing window. Re-subscribing
  // when `messageLimit` increases pulls in older history while still keeping
  // the realtime tail (Firebase RTDB's limitToLast is anchored to the newest
  // message, so new messages still stream in instantly).
  useEffect(() => {
    if (!me?.coupleId) return undefined;
    let cancelled = false;
    const unsub = subscribeMessages(
      me.coupleId,
      (msgs) => {
        if (cancelled) return;
        // If the listener returned fewer messages than we asked for, the chat
        // has fewer than `messageLimit` total messages — there is no older
        // history left to load.
        if (msgs.length < messageLimit) {
          setHasMoreOlder(false);
        }
        setMessages(msgs);
        putCache('chatMessages', msgs);

        // Mark incoming messages as read
        msgs.forEach(msg => {
          if (msg.sender !== String(me._id) && msg.status !== 'read') {
            updateMessageStatus(me.coupleId, msg.id, 'read').catch(console.error);
          }
        });
      },
      messageLimit,
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [me?.coupleId, messageLimit]);

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !me?.coupleId || !online) return;
    setInputText('');
    try {
      const payload = {
        text,
        sender: String(me._id),
        type: 'text',
      };
      if (editingMsg) {
        editMessageText(me.coupleId, editingMsg.id, text);
        setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, text, isEdited: true } : m));
        setEditingMsg(null);
        return;
      }
      if (replyToMsg) {
        payload.replyToId = replyToMsg.id;
        payload.replyToText = replyToMsg.text || (replyToMsg.type === 'image' ? '📷 Photo' : (replyToMsg.type === 'video' ? '🎥 Video' : (replyToMsg.type === 'audio' ? '🎵 Audio' : '📁 File')));
        payload.replyToSender = replyToMsg.sender;
        setReplyToMsg(null);
      }
      const msgId = pushMessage(me.coupleId, payload);
      
      // Optimistic UI Update: Instantly append the message to the screen
      // so there is zero perceived delay while Firebase processes the write.
      const optimisticMsg = {
        id: msgId,
        ...payload,
        createdAt: Date.now(),
        status: 'sending'
      };
      setMessages(prev => [...prev.filter(m => m.id !== msgId), optimisticMsg]);
      
      // Defer secondary background HTTP requests (logging & notifications) by 100ms
      // to keep the main event loop and WebView network channel 100% focused on
      // immediate UI rendering and Firebase write execution.
      setTimeout(() => {
        api.logActivity('Sent a message', 'chat').catch(() => {});
        if (partner?._id) {
          api.sendChatNotification({
            recipientId: String(partner._id),
            messagePreview: text,
            messageId: msgId
          }).catch((err) => console.error('Failed to send chat push notification:', err));
        }
      }, 100);
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputText(text);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const triggerHeartAnimation = () => {
    const newHearts = [{
      id: Date.now(),
      left: 50,
      size: 160,
      duration: 4,
      delay: 0,
      rotation: Math.random() * 20 - 10,
      color: '#FF1744'
    }];
    setFloatingHearts(prev => [...prev, ...newHearts]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => !newHearts.find(n => n.id === h.id)));
    }, 4500);
  };

  useEffect(() => {
    if (!messages.length) return;
    const currentIds = new Set(messages.map(m => m.id));
    const previousIds = processedMessageIdsRef.current;
    
    const newMessages = messages.filter(m => !previousIds.has(m.id));
    newMessages.forEach(msg => {
      if (msg.sender !== String(me?._id) && msg.text === '❤️') {
        // Only animate if the message was sent within the last 10 seconds
        if (msg.createdAt > Date.now() - 10000) {
          triggerHeartAnimation();
        }
      }
    });

    processedMessageIdsRef.current = currentIds;
  }, [messages, me?._id]);

  const sendHeart = async () => {
    if (!me?.coupleId) return;
    triggerHeartAnimation();
    try {
      const payload = {
        text: '❤️',
        sender: String(me._id),
        type: 'text',
      };
      const msgId = pushMessage(me.coupleId, payload);
      
      // Optimistic UI Update for heart
      const optimisticMsg = {
        id: msgId,
        ...payload,
        createdAt: Date.now(),
        status: 'sending'
      };
      setMessages(prev => [...prev.filter(m => m.id !== msgId), optimisticMsg]);
            api.logActivity('Sent a message', 'chat').catch(() => {});
      if (partner?._id) {
        api.sendChatNotification({
          recipientId: String(partner._id),
          messagePreview: '❤️',
          messageId: msgId
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to send heart:', err);
    }
  };

  const triggerToast = (msg) => {
    // Disabled per user request
    // setToastMessage(msg);
    // setShowToast(true);
    // setTimeout(() => setShowToast(false), 2000);
  };

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const matches = await searchAllMessages(me.coupleId, searchQuery);

      if (matches.length > 0) {
        setSearchResults(matches);
        const lastIndex = matches.length - 1;
        setCurrentResultIndex(lastIndex);
        focusSearchResult(matches[lastIndex]);
      } else {
        setSearchResults([]);
        setCurrentResultIndex(-1);
        triggerToast('No matches found');
      }
    }
  };

  const focusSearchResult = (match) => {
    if (match.indexFromEnd > messageLimit) {
      setMessageLimit(match.indexFromEnd + 20);
      const tryScroll = (attempts = 0) => {
        const el = document.getElementById(`msg-${match.id}`);
        const container = scrollContainerRef.current;
        if (el && container) {
          const topPos = el.offsetTop;
          container.scrollTo({
            top: topPos - (container.offsetHeight / 2) + (el.offsetHeight / 2),
            behavior: 'smooth'
          });
          setHighlightedId(match.id);
          setTimeout(() => setHighlightedId(null), 2000);
        } else if (attempts < 20) {
          setTimeout(() => tryScroll(attempts + 1), 100);
        }
      };
      tryScroll();
    } else {
      scrollToMessage(match.id);
    }
  };

  const scrollToMessage = (id) => {
    const element = document.getElementById(`msg-${id}`);
    const container = scrollContainerRef.current;
    if (element && container) {
      const topPos = element.offsetTop;
      container.scrollTo({
        top: topPos - (container.offsetHeight / 2) + (element.offsetHeight / 2),
        behavior: 'smooth'
      });
      setHighlightedId(id);
      setTimeout(() => setHighlightedId(null), 2000);
    }
  };

  const handleScrollToBottom = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  const navigateResults = (direction) => {
    if (searchResults.length === 0) return;
    let newIndex = currentResultIndex + direction;
    if (newIndex < 0) newIndex = searchResults.length - 1;
    if (newIndex >= searchResults.length) newIndex = 0;

    setCurrentResultIndex(newIndex);
    focusSearchResult(searchResults[newIndex]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !me?.coupleId) return;
    const mimeType = file.type || '';
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    const isAudio = mimeType.startsWith('audio/');
    const messageType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';
    const mediaKindLabel = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file';

    setUploadingLabel(`Uploading ${mediaKindLabel}...`);
    setUploadProgress(5);
    triggerToast(`Uploading ${mediaKindLabel}...`);
    try {
      const uploadRes = await api.uploadFileWithProgress(file, (percentage) => {
        // Network upload progress can jump straight to 100% on fast links.
        // Keep this phase capped so 100% means the full send flow is complete.
        setUploadProgress((prev) => {
          const floor = typeof prev === 'number' ? prev : 5;
          return Math.max(floor, Math.min(95, percentage));
        });
      });
      setUploadingLabel('Sending message...');
      setUploadProgress(97);
      const payload = {
        type: messageType,
        mediaUrl: uploadRes.url,
        mediaPublicId: uploadRes.publicId,
        mediaMimeType: uploadRes.mimeType || mimeType,
        mediaName: uploadRes.originalFilename || file.name,
        mediaSize: uploadRes.size || file.size,
        mediaFormat: uploadRes.format,
        mediaResourceType: uploadRes.resourceType,
        sender: String(me._id),
      };
      if (replyToMsg) {
        payload.replyToId = replyToMsg.id;
        payload.replyToText = replyToMsg.text || (replyToMsg.type === 'image' ? '📷 Photo' : (replyToMsg.type === 'video' ? '🎥 Video' : (replyToMsg.type === 'audio' ? '🎵 Audio' : '📁 File')));
        payload.replyToSender = replyToMsg.sender;
        setReplyToMsg(null);
      }
      await pushMessage(me.coupleId, payload);
      api.logActivity('Sent a message', 'chat').catch(() => {});
      if (partner?._id) {
        api.sendChatNotification({
          recipientId: String(partner._id),
          messagePreview: `Sent a photo/file: ${mediaKindLabel}`
        }).catch((err) => console.error('Failed to send chat push notification:', err));
      }
      setUploadProgress(100);
      setTimeout(() => {
        setUploadProgress(null);
        setUploadingLabel('');
      }, 250);
    } catch (err) {
      console.error('Failed to upload media:', err);
      setUploadProgress(null);
      setUploadingLabel('');
      triggerToast('Upload failed');
    }
  };

  // Local helpers for date grouping — derive a YYYY-MM-DD string from a RTDB createdAt (ms epoch)
  const dateKey = (createdAt) => {
    const d = createdAt ? new Date(createdAt) : new Date();
    return d.toISOString().split('T')[0];
  };
  const timeLabel = (createdAt) => {
    const d = createdAt ? new Date(createdAt) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatBytes = (bytes) => {
    if (!bytes || Number.isNaN(bytes)) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  };

  const openMediaViewer = (msg) => {
    navigate(`/chat-media/photo/${msg.id}`, {
      state: {
        mediaUrl: msg.mediaUrl,
        createdAt: msg.createdAt,
        sender: msg.sender,
        mediaType: msg.type,
      },
    });
  };

  const downloadAttachment = async (url, fileName) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback to opening in a new tab if blob download fails.
      window.open(url, '_blank', 'noopener,noreferrer');
      triggerToast('Unable to force download. Opened file in new tab.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onAnimationComplete={ensureScrolledToLatest}
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'var(--chat-bg)',
        backgroundImage: `linear-gradient(${isDarkMode ? 'rgba(0,0,0,0.45), rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.25), rgba(255,255,255,0.25)'}), url("${isDarkMode ? chatBgDark : chatBgLight}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Chat Header */}
      <div style={{
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-light)',
        zIndex: 10,
        position: 'sticky',
        top: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.div whileTap={{ scale: 0.9 }} onClick={() => navigate('/')} style={{ cursor: 'pointer', padding: '4px' }}>
            <ChevronLeft size={24} color="var(--text-main)" />
          </motion.div>
          <div
            onClick={() => navigate('/partner-profile')}
            style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: 'var(--blush-pink)', overflow: 'hidden', cursor: 'pointer' }}
          >
            <img src={partner?.avatar || user.partnerAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
          </div>
          <div onClick={() => navigate('/partner-profile')} style={{ cursor: 'pointer' }}>
            <h4 style={{ fontSize: '16px' }}>{(partner?.name || user.partnerName || 'Partner').split(' ')[0]}</h4>
            <p style={{ fontSize: '12px', color: isMuted ? 'var(--text-muted)' : '#4CAF50' }}>
              {isMuted ? 'Notifications Muted' : (partner?.isOnline ? 'Online now' : 'Offline')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div onClick={() => setShowMenu(!showMenu)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <MoreVertical size={20} color="var(--text-secondary)" />
          </div>
        </div>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 60, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--menu-bg)',
                padding: '10px 20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                zIndex: 5
              }}
            >
              <Search size={18} color="var(--text-sub)" />
              <input
                autoFocus
                placeholder="Search in conversation..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchResults([]);
                  setCurrentResultIndex(-1);
                }}
                onKeyPress={handleSearch}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '16px', background: 'transparent', color: 'var(--text-main)' }}
              />

              {searchResults.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-sub)', fontSize: '12px' }}>
                  <span>{currentResultIndex + 1} of {searchResults.length}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <ChevronUp size={18} style={{ cursor: 'pointer' }} onClick={() => navigateResults(-1)} />
                    <ChevronDown size={18} style={{ cursor: 'pointer' }} onClick={() => navigateResults(1)} />
                  </div>
                </div>
              )}

              <X size={18} color="var(--text-sub)" onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} style={{ cursor: 'pointer' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleMessagesScroll}
        style={{
          flex: 1,
          minHeight: 0,
          padding: '20px',
          paddingBottom: '20px',
          overflowY: 'auto',
          position: 'relative',
        }}
        className="hide-scrollbar"
      >
        {(isLoadingMore || (hasMoreOlder && messages.length >= messageLimit)) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '6px 0 14px',
              fontSize: '11px',
              fontFamily: 'var(--font-main)',
              color: 'var(--text-sub)',
              opacity: 0.75,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            {isLoadingMore ? 'Loading earlier messages…' : 'Scroll up for more'}
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg, index) => {
            const msgDate = dateKey(msg.createdAt);
            const prevDate = index > 0 ? dateKey(messages[index - 1].createdAt) : null;
            const showDate = index === 0 || prevDate !== msgDate;
            const isMine = me && msg.sender === String(me._id);
            const msgTime = timeLabel(msg.createdAt);
            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div style={{ textAlign: 'center', margin: '16px 0 24px' }}>
                    <span style={{
                      padding: '4px 16px',
                      backgroundColor: 'var(--date-tag-bg)',
                      borderRadius: '100px',
                      fontSize: '11px',
                      color: 'var(--date-tag-text)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {formatDateLabel(msgDate)}
                    </span>
                  </div>
                )}
                <motion.div
                  id={`msg-${msg.id}`}
                  initial={msg.status === 'sending' ? { opacity: 0, y: 8, scale: 0.96 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  style={{
                    display: 'flex',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                    marginBottom: '16px',
                    position: 'relative'
                  }}
                >
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.06}
                    onDragEnd={(e, info) => {
                      if (info.offset.x > 50) {
                        setReplyToMsg(msg);
                        textInputRef.current?.focus();
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const isBottom = rect.bottom > window.innerHeight - 150;
                      setContextMenuPos({
                        top: isBottom ? undefined : rect.bottom + 8,
                        bottom: isBottom ? window.innerHeight - rect.top + 8 : undefined,
                        right: isMine ? (window.innerWidth - rect.right) : undefined,
                        left: isMine ? undefined : rect.left,
                      });
                      setLongPressedMsg(msg);
                    }}
                    style={{
                      maxWidth: '75%',
                      padding: (msg.type === 'image' || msg.type === 'video') ? '4px' : '6px 10px 8px 12px',
                      borderRadius: isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      backgroundColor: highlightedId === msg.id
                        ? 'rgba(255, 183, 197, 0.4)'
                        : (isMine ? 'var(--bubble-me)' : 'var(--bubble-them)'),
                      color: isMine ? 'var(--msg-me-text)' : 'var(--msg-them-text)',
                      boxShadow: highlightedId === msg.id
                        ? '0 0 20px var(--blush-pink)'
                        : '0 4px 12px rgba(0,0,0,0.03)',
                      position: 'relative',
                      transition: 'all 0.3s ease',
                      border: highlightedId === msg.id ? '1px solid var(--blush-pink)' : 'none',
                      overflow: 'hidden',
                      zIndex: 2
                    }}
                  >
                    {msg.replyToId && (
                      <div
                        onClick={() => scrollToMessage(msg.replyToId)}
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.08)',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          marginBottom: (msg.type === 'image' || msg.type === 'video') ? '4px' : '6px',
                          cursor: 'pointer',
                          borderLeft: '4px solid var(--blush-pink)',
                          fontSize: '12px',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <span style={{ fontWeight: 600, color: msg.replyToSender === String(me._id) ? 'var(--blush-pink)' : 'var(--text-main)', marginBottom: '2px' }}>
                          {msg.replyToSender === String(me._id) ? 'You' : (partner?.name || 'Partner')}
                        </span>
                        <span style={{ opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {msg.replyToText}
                        </span>
                      </div>
                    )}
                    {msg.type === 'image' || msg.type === 'video' ? (
                      <div
                        style={{ position: 'relative', cursor: 'pointer' }}
                        onClick={() => openMediaViewer(msg)}
                      >
                        {msg.type === 'video' ? (
                          <video
                            src={msg.mediaUrl}
                            preload="metadata"
                            muted
                            playsInline
                            style={{ width: '100%', borderRadius: '16px', display: 'block', backgroundColor: '#000' }}
                          />
                        ) : (
                          <img
                            src={msg.mediaUrl}
                            style={{ width: '100%', borderRadius: '16px', display: 'block' }}
                            alt="Attachment"
                          />
                        )}
                        {msg.type === 'video' && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                          }}>
                            <div style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '26px',
                              backgroundColor: 'rgba(0,0,0,0.5)',
                              backdropFilter: 'blur(6px)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            }}>
                              <Play size={22} color="white" fill="white" style={{ marginLeft: '3px' }} />
                            </div>
                          </div>
                        )}
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.3)',
                          backdropFilter: 'blur(4px)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <p style={{ fontSize: '10px', color: 'white', margin: 0 }}>{msgTime}</p>
                          {isMine && (
                            <span style={{ display: 'flex', color: 'white', opacity: 0.9 }}>
                              {msg.status === 'read' ? <CheckCheck size={12} color="#4ea8de" /> : msg.status === 'delivered' ? <CheckCheck size={12} /> : <Check size={12} />}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : msg.type === 'audio' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Music2 size={16} />
                          <p style={{ fontSize: '13px', margin: 0, opacity: 0.85, fontWeight: 600, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {msg.mediaName || 'Audio file'}
                          </p>
                        </div>
                        <audio src={msg.mediaUrl} controls style={{ width: '100%' }} preload="metadata" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ fontSize: '10px', margin: 0, opacity: 0.65 }}>{formatBytes(msg.mediaSize)}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', display: 'inline-flex' }}>
                              <ExternalLink size={14} />
                            </a>
                            <button
                              type="button"
                              onClick={() => downloadAttachment(msg.mediaUrl, msg.mediaName)}
                              style={{ color: 'inherit', display: 'inline-flex', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              <Download size={14} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.65 }}>
                              <p style={{ fontSize: '10px', margin: 0 }}>{msgTime}</p>
                              {isMine && (
                                <span style={{ display: 'flex' }}>
                                  {msg.status === 'read' ? <CheckCheck size={12} color="#4ea8de" /> : msg.status === 'delivered' ? <CheckCheck size={12} /> : <Check size={12} />}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : msg.type === 'file' ? (
                      <div style={{ minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={18} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', margin: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {msg.mediaName || 'File attachment'}
                            </p>
                            <p style={{ fontSize: '10px', margin: 0, marginTop: '2px', opacity: 0.65 }}>
                              {[msg.mediaMimeType || 'file', formatBytes(msg.mediaSize)].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', display: 'inline-flex' }}>
                              <ExternalLink size={14} />
                            </a>
                            <button
                              type="button"
                              onClick={() => downloadAttachment(msg.mediaUrl, msg.mediaName)}
                              style={{ color: 'inherit', display: 'inline-flex', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              <Download size={14} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.65 }}>
                            <p style={{ fontSize: '10px', margin: 0 }}>{msgTime}</p>
                            {isMine && (
                              <span style={{ display: 'flex' }}>
                                {msg.status === 'read' ? <CheckCheck size={12} color="#4ea8de" /> : msg.status === 'delivered' ? <CheckCheck size={12} /> : <Check size={12} />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <p style={{ fontSize: '15px', margin: 0, wordBreak: 'break-word', lineHeight: 1.3 }}>
                          {msg.text}
                          {msg.isEdited && <span style={{ fontSize: '10px', opacity: 0.6, marginLeft: '6px', fontStyle: 'italic' }}>(edited)</span>}
                        </p>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          opacity: 0.6,
                          flexShrink: 0,
                          marginLeft: 'auto'
                        }}>
                          <p style={{ fontSize: '10px', margin: 0, whiteSpace: 'nowrap' }}>{msgTime}</p>
                          {isMine && (
                            <span style={{ display: 'flex' }}>
                              {msg.status === 'read' ? <CheckCheck size={12} color="#4ea8de" /> : msg.status === 'delivered' ? <CheckCheck size={12} /> : <Check size={12} />}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </React.Fragment>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />

        <AnimatePresence>
          {showScrollDown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={handleScrollToBottom}
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '20px',
                width: '40px',
                height: '40px',
                borderRadius: '20px',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10,
                border: '1px solid var(--border-light)',
              }}
            >
              <ChevronDown size={24} color="var(--text-main)" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer — flex child (not position:fixed). With adjustResize the whole
          chat column shrinks above the keyboard so nothing needs manual inset
          or viewport scale compensation. */}
      <div
        ref={inputAreaRef}
        style={{
          flexShrink: 0,
          width: '100%',
          padding: composerActive ? '6px 12px max(4px, env(safe-area-inset-bottom, 0px))' : '0px 12px 0',
          boxSizing: 'border-box',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          background: composerActive ? 'var(--header-bg)' : 'transparent',
          backdropFilter: composerActive ? 'blur(12px)' : 'none',
          borderTop: composerActive ? '1px solid var(--border-light)' : 'none',
        }}
      >
        <AnimatePresence>
          {(replyToMsg || editingMsg) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                backgroundColor: 'var(--header-bg)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px 16px 0 0',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid var(--border-light)',
                borderBottom: 'none',
                marginBottom: '-12px',
                zIndex: 1
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, borderLeft: '4px solid var(--blush-pink)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blush-pink)' }}>
                  {editingMsg ? 'Editing Message' : `Replying to ${replyToMsg?.sender === String(me._id) ? 'You' : (partner?.name || 'Partner')}`}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {editingMsg ? editingMsg.text : (replyToMsg?.text || (replyToMsg?.type === 'image' ? '📷 Photo' : (replyToMsg?.type === 'video' ? '🎥 Video' : (replyToMsg?.type === 'audio' ? '🎵 Audio' : '📁 File'))))}
                </span>
              </div>
              <X size={20} color="var(--text-sub)" style={{ cursor: 'pointer', padding: '4px' }} onClick={() => { setReplyToMsg(null); setEditingMsg(null); setInputText(''); }} />
            </motion.div>
          )}
        </AnimatePresence>
        
        {uploadProgress !== null && (
          <div
            style={{
              marginBottom: '10px',
              padding: '10px 12px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-light)',
              borderRadius: '14px',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{uploadingLabel}</span>
              <span style={{ color: 'var(--text-sub)' }}>{uploadProgress}%</span>
            </div>
            <div style={{ width: '100%', height: '7px', borderRadius: '999px', background: 'var(--border-light)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: 'var(--blush-pink)',
                  borderRadius: '999px',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <div className="premium-card" style={{
            flex: 1,
            minWidth: 0,
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px 6px 14px',
            borderRadius: '100px',
            backgroundColor: 'var(--card-bg)',
            marginBottom: 0,
          }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*,audio/*,*/*"
              style={{ display: 'none' }}
            />
            <motion.div
              whileTap={{ scale: 0.9 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '4px', cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={20} color="var(--text-muted)" />
            </motion.div>
            <input
              type="text"
              ref={textInputRef}
              placeholder="Type a love note..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                setComposerActive(true);
                requestAnimationFrame(() => scrollToBottom('auto'));
              }}
              onBlur={() => setComposerActive(false)}
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                outline: 'none',
                fontSize: '16px',
                fontFamily: 'var(--font-body)',
                background: 'transparent',
                color: 'var(--text-main)',
              }}
            />
            <motion.div
              whileTap={{ scale: 0.9 }}
              onClick={sendHeart}
              style={{ padding: '6px', color: 'var(--blush-pink)', cursor: 'pointer', flexShrink: 0 }}
            >
              <Heart size={20} fill="var(--blush-pink)" />
            </motion.div>
          </div>

          {/* Send — separate circle outside the text field (WhatsApp-style). */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={handleSendMessage}
            style={{
              flexShrink: 0,
              width: '48px',
              height: '48px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: 'var(--blush-pink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255, 183, 197, 0.45)',
              marginBottom: composerActive ? '2px' : '0',
            }}
          >
            <Send size={20} />
          </motion.button>
        </div>
      </div>

      {/* Global Menus & Overlays */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              style={{
                position: 'fixed',
                top: '70px',
                right: '20px',
                background: 'var(--menu-bg)',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                padding: '8px',
                width: '180px',
                zIndex: 100
              }}
            >
              {['View Profile', 'Search Messages', isMuted ? 'Unmute Notifications' : 'Mute Notifications'].map((item) => (
                <div
                  key={item}
                  onClick={() => {
                    if (item === 'View Profile') navigate('/partner-profile');
                    if (item === 'Search Messages') setShowSearch(true);
                    if (item.includes('Mute')) {
                      setIsMuted(!isMuted);
                      triggerToast(isMuted ? 'Notifications unmuted' : 'Notifications muted');
                    }
                    setShowMenu(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: 'var(--text-main)'
                  }}
                  className="hover-bg-soft"
                >
                  {item}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {floatingHearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, y: 0, scale: 0.5, rotate: h.rotation }}
            animate={{ 
              opacity: [0, 1, 0.8, 0], 
              y: -(window.innerHeight + 100), 
              scale: [0.5, 1.2, 1], 
              rotate: h.rotation + (Math.random() * 30 - 15) 
            }}
            transition={{ duration: h.duration, delay: h.delay, ease: "easeOut" }}
            style={{
              position: 'fixed',
              bottom: '0px',
              left: `calc(${h.left}% - ${h.size / 2}px)`,
              zIndex: 9999,
              pointerEvents: 'none',
              willChange: 'transform, opacity'
            }}
          >
            <Heart size={h.size} fill={h.color} color={h.color} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'absolute',
              bottom: '72px',
              left: 0,
              right: 0,
              marginLeft: 'auto',
              marginRight: 'auto',
              width: 'fit-content',
              maxWidth: 'calc(100% - 40px)',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '100px',
              fontSize: '14px',
              zIndex: 3000,
              pointerEvents: 'none',
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Long Press Context Menu */}
      <AnimatePresence>
        {longPressedMsg && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLongPressedMsg(null)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 4000,
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: contextMenuPos?.bottom ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: contextMenuPos?.bottom ? 10 : -10 }}
              style={{
                position: 'fixed',
                top: contextMenuPos?.top,
                bottom: contextMenuPos?.bottom,
                left: contextMenuPos?.left,
                right: contextMenuPos?.right,
                transform: 'none',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                gap: '24px',
                zIndex: 4001,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}
            >
              <div 
                onClick={() => {
                  setReplyToMsg(longPressedMsg);
                  setLongPressedMsg(null);
                  setTimeout(() => textInputRef.current?.focus(), 100);
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Reply size={22} color="#3b82f6" />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)' }}>Reply</span>
              </div>
              {longPressedMsg.sender === String(me?._id) && Date.now() - (typeof longPressedMsg.createdAt === 'number' ? longPressedMsg.createdAt : Date.now()) <= 30 * 60 * 1000 && longPressedMsg.type === 'text' && (
                <div 
                  onClick={() => {
                    setEditingMsg(longPressedMsg);
                    setInputText(longPressedMsg.text);
                    setLongPressedMsg(null);
                    setTimeout(() => textInputRef.current?.focus(), 100);
                  }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit2 size={22} color="#f59e0b" />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)' }}>Edit</span>
                </div>
              )}
              <div 
                onClick={() => {
                  navigator.clipboard.writeText(longPressedMsg.text || '');
                  triggerToast('Copied to clipboard');
                  setLongPressedMsg(null);
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Copy size={22} color="#10b981" />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)' }}>Copy</span>
              </div>
              <div 
                onClick={() => {
                  setShowInfoModal(longPressedMsg);
                  setLongPressedMsg(null);
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Info size={22} color="#8b5cf6" />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-main)' }}>Info</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(null)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 5000 }}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'var(--card-bg)',
                borderRadius: '24px 24px 0 0',
                padding: '24px',
                zIndex: 5001,
                boxShadow: '0 -8px 32px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Message Info</h3>
                <X size={24} color="var(--text-sub)" onClick={() => setShowInfoModal(null)} style={{ cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Check size={20} color="var(--text-sub)" />
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>Sent</p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-sub)' }}>
                      {showInfoModal.createdAt ? new Date(showInfoModal.createdAt).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <CheckCheck size={20} color="var(--text-sub)" />
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>Delivered</p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-sub)' }}>
                      {showInfoModal.deliveredAt ? new Date(showInfoModal.deliveredAt).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <CheckCheck size={20} color="#3b82f6" />
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>Read</p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-sub)' }}>
                      {showInfoModal.readAt ? new Date(showInfoModal.readAt).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Chat;
