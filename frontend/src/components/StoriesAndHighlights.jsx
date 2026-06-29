import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Play,
  Eye,
  Heart,
  Film,
  Image as ImageIcon,
  Check,
  Trash2,
  FolderPlus,
  ArrowLeft,
  Send,
} from "lucide-react";
import api from "../utils/api";
import { pushMessage } from "../config/firebase";
import useOnlineStatus from "../hooks/useOnlineStatus";

const STORY_QUICK_EMOJIS = ["❤️", "😂", "💋", "😘", "🔥", "👏"];

const STORY_SAFE_TOP =
  "var(--app-pad-top, max(env(safe-area-inset-top, 0px), 12px))";
const STORY_SAFE_BOTTOM =
  "var(--aura-composer-bottom, max(var(--app-pad-bottom, 12px), env(safe-area-inset-bottom, 0px)))";

const StoriesAndHighlights = ({ currentUser, partnerUser }) => {
  const [activeStories, setActiveStories] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [archivedStories, setArchivedStories] = useState([]);

  // Modals / Player state
  const [storyPlayer, setStoryPlayer] = useState({
    isOpen: false,
    stories: [],
    startIndex: 0,
    title: "",
    highlightId: null,
  });
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [returnToStoryPlayerAfterPost, setReturnToStoryPlayerAfterPost] =
    useState(false);
  const [showCreateHighlight, setShowCreateHighlight] = useState(false);

  // Create Story Form State
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Create Highlight Form State
  const [highlightTitle, setHighlightTitle] = useState("");
  const [selectedStoriesForHighlight, setSelectedStoriesForHighlight] =
    useState([]);
  const [savingHighlight, setSavingHighlight] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchStoriesAndHighlights();
  }, []);

  const fetchStoriesAndHighlights = async () => {
    try {
      const [storiesData, highlightsData] = await Promise.all([
        api.getStories(),
        api.getHighlights(),
      ]);
      setActiveStories(storiesData || []);
      setHighlights(highlightsData || []);
    } catch (err) {
      console.error("Error fetching stories/highlights:", err);
    }
  };

  const fetchArchive = async () => {
    try {
      const archive = await api.getArchivedStories();
      setArchivedStories(archive || []);
    } catch (err) {
      console.error("Error fetching story archive:", err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePostStory = async () => {
    if (!mediaFile) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      // 1. Upload to Cloudinary
      const uploadRes = await api.uploadFileWithProgress(
        mediaFile,
        (percent) => {
          setUploadProgress(percent);
        },
      );
      const mediaUrl = uploadRes.url;
      const mediaType = mediaFile.type.startsWith("video/") ? "video" : "image";

      // 2. Create story in DB
      const newStory = await api.createStory({
        mediaUrl,
        mediaType,
        caption,
      });

      const shouldReopenPlayer = returnToStoryPlayerAfterPost;
      setReturnToStoryPlayerAfterPost(false);

      setActiveStories((prev) => {
        const updated = [...prev, newStory];
        if (shouldReopenPlayer) {
          const uid = currentUserId();
          const myUpdated = updated.filter((s) => storyUserId(s) === uid);
          setStoryPlayer({
            isOpen: true,
            stories: myUpdated,
            startIndex: Math.max(0, myUpdated.length - 1),
            title: "Your Story",
            highlightId: null,
          });
        }
        return updated;
      });

      // Reset form
      setMediaFile(null);
      setMediaPreview("");
      setCaption("");
      setShowCreateStory(false);
    } catch (err) {
      console.error("Error posting story:", err);
      setReturnToStoryPlayerAfterPost(false);
      alert("Failed to post story. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateHighlight = async () => {
    if (!highlightTitle.trim() || selectedStoriesForHighlight.length === 0)
      return;
    try {
      setSavingHighlight(true);
      // Use the media of the first story as the cover
      const coverUrl = selectedStoriesForHighlight[0].mediaUrl;
      const newHighlight = await api.createHighlight({
        title: highlightTitle,
        coverUrl,
        stories: selectedStoriesForHighlight.map((s) => s._id),
      });

      setHighlights((prev) => [newHighlight, ...prev]);

      // Reset
      setHighlightTitle("");
      setSelectedStoriesForHighlight([]);
      setShowCreateHighlight(false);
    } catch (err) {
      console.error("Error saving highlight:", err);
      alert("Failed to create highlight.");
    } finally {
      setSavingHighlight(false);
    }
  };

  const toggleSelectStoryForHighlight = (story) => {
    if (selectedStoriesForHighlight.some((s) => s._id === story._id)) {
      setSelectedStoriesForHighlight((prev) =>
        prev.filter((s) => s._id !== story._id),
      );
    } else {
      setSelectedStoriesForHighlight((prev) => [...prev, story]);
    }
  };

  const storyUserId = (story) => String(story?.user?._id || story?.user || "");
  const currentUserId = () => String(currentUser?._id || currentUser?.id || "");
  const isOwnStory = (story) =>
    storyUserId(story) === currentUserId() && currentUserId() !== "";

  const handleStoryUpdated = (updatedStory) => {
    setActiveStories((prev) =>
      prev.map((s) => (s._id === updatedStory._id ? updatedStory : s)),
    );
    setStoryPlayer((prev) => ({
      ...prev,
      stories: prev.stories.map((s) =>
        s._id === updatedStory._id ? updatedStory : s,
      ),
    }));
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm("Delete this story permanently?")) return;
    try {
      await api.deleteStory(storyId);
      setActiveStories((prev) => prev.filter((s) => s._id !== storyId));
      setHighlights((prev) =>
        prev.map((hl) => ({
          ...hl,
          stories: (hl.stories || []).filter(
            (s) => String(s._id || s) !== String(storyId),
          ),
        })),
      );

      if (storyPlayer.isOpen) {
        const remaining = storyPlayer.stories.filter((s) => s._id !== storyId);
        if (remaining.length === 0) {
          setStoryPlayer({
            isOpen: false,
            stories: [],
            startIndex: 0,
            title: "",
            highlightId: null,
          });
        } else {
          setStoryPlayer((prev) => ({
            ...prev,
            stories: remaining,
            startIndex: Math.min(prev.startIndex, remaining.length - 1),
          }));
        }
      }
    } catch (err) {
      console.error("Failed to delete story:", err);
      alert("Could not delete story. Please try again.");
    }
  };

  const handleRemoveFromHighlight = async (highlightId, storyId) => {
    const hl = highlights.find((h) => h._id === highlightId);
    if (!hl) return;

    if (!window.confirm("Remove this story from the highlight?")) return;

    try {
      const remainingIds = (hl.stories || [])
        .map((s) => s._id || s)
        .filter((id) => String(id) !== String(storyId));

      if (remainingIds.length === 0) {
        if (
          !window.confirm(
            "This is the last story. Delete the entire highlight?",
          )
        )
          return;
        await api.deleteHighlight(highlightId);
        setHighlights((prev) => prev.filter((h) => h._id !== highlightId));
        setStoryPlayer({
          isOpen: false,
          stories: [],
          startIndex: 0,
          title: "",
          highlightId: null,
        });
        return;
      }

      const updated = await api.updateHighlight(highlightId, {
        stories: remainingIds,
      });
      setHighlights((prev) =>
        prev.map((h) => (h._id === highlightId ? updated : h)),
      );

      const remainingStories = storyPlayer.stories.filter(
        (s) => s._id !== storyId,
      );
      if (remainingStories.length === 0) {
        setStoryPlayer({
          isOpen: false,
          stories: [],
          startIndex: 0,
          title: "",
          highlightId: null,
        });
      } else {
        setStoryPlayer((prev) => ({
          ...prev,
          stories: remainingStories,
          startIndex: Math.min(prev.startIndex, remainingStories.length - 1),
        }));
      }
    } catch (err) {
      console.error("Failed to remove story from highlight:", err);
      alert("Could not update highlight. Please try again.");
    }
  };

  const handleDeleteHighlight = async (highlightId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this highlight permanently?")) return;
    try {
      await api.deleteHighlight(highlightId);
      setHighlights((prev) => prev.filter((h) => h._id !== highlightId));
    } catch (err) {
      console.error("Failed to delete highlight:", err);
    }
  };

  const openCreateStory = (resumePlayerAfterPost = false) => {
    if (resumePlayerAfterPost) {
      setReturnToStoryPlayerAfterPost(true);
      setStoryPlayer({
        isOpen: false,
        stories: [],
        startIndex: 0,
        title: "",
        highlightId: null,
      });
    }
    setShowCreateStory(true);
  };

  const openCreateHighlightModal = () => {
    fetchArchive();
    setShowCreateHighlight(true);
  };

  // Group active stories by User
  const myStories = activeStories.filter(
    (s) => s.user?._id === currentUser?._id,
  );
  const partnerStories = activeStories.filter(
    (s) => s.user?._id === partnerUser?._id,
  );

  const hasMyStories = myStories.length > 0;
  const hasPartnerStories = partnerStories.length > 0;

  // Determine ring border styling
  const getRingStyle = (hasStories, isPartner) => {
    if (!hasStories) return { border: "2px dashed var(--text-muted)" };
    return {
      background:
        "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
      padding: "3px",
    };
  };

  return (
    <div style={{ marginBottom: "32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}>
        <h3 style={{ fontSize: "20px", fontWeight: 600 }}>
          Highlights & Stories
        </h3>
        <button
          onClick={() => openCreateStory()}
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--blush-pink)",
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}>
          <Plus size={14} /> Add Story
        </button>
      </div>

      {/* Stories/Highlights Horizontal Tray */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          paddingBottom: "8px",
          alignItems: "center",
        }}
        className="hide-scrollbar">
        {/* 1. Current User Story Circle */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
          }}>
          <div
            onClick={() => {
              if (hasMyStories) {
                setStoryPlayer({
                  isOpen: true,
                  stories: myStories,
                  startIndex: 0,
                  title: "Your Story",
                  highlightId: null,
                });
              } else {
                openCreateStory();
              }
            }}
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              ...getRingStyle(hasMyStories, false),
            }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                border: hasMyStories ? "2px solid var(--card-bg)" : "none",
                backgroundColor: "var(--chat-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt="You"
                />
              ) : (
                <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                  {currentUser?.name?.[0]}
                </span>
              )}
            </div>
          </div>
          <span
            style={{
              fontSize: "12px",
              marginTop: "6px",
              fontWeight: 500,
              opacity: 0.9,
            }}>
            You
          </span>
          <div
            onClick={(e) => {
              e.stopPropagation();
              openCreateStory();
            }}
            style={{
              position: "absolute",
              bottom: "22px",
              right: "0px",
              backgroundColor: "var(--blush-pink)",
              borderRadius: "50%",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid var(--card-bg)",
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
            }}>
            <Plus size={12} color="white" strokeWidth={3} />
          </div>
        </div>

        {/* 2. Partner Story Circle */}
        {partnerUser && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}>
            <div
              onClick={() => {
                if (hasPartnerStories) {
                  setStoryPlayer({
                    isOpen: true,
                    stories: partnerStories,
                    startIndex: 0,
                    title: `${(partnerUser.name || "Partner").split(" ")[0]}'s Story`,
                    highlightId: null,
                  });
                }
              }}
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: hasPartnerStories ? "pointer" : "default",
                ...getRingStyle(hasPartnerStories, true),
              }}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: hasPartnerStories
                    ? "2px solid var(--card-bg)"
                    : "none",
                  backgroundColor: "var(--chat-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: hasPartnerStories ? 1 : 0.6,
                }}>
                {partnerUser.avatar ? (
                  <img
                    src={partnerUser.avatar}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    alt="Partner"
                  />
                ) : (
                  <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                    {partnerUser.name?.[0]}
                  </span>
                )}
              </div>
            </div>
            <span
              style={{
                fontSize: "12px",
                marginTop: "6px",
                fontWeight: 500,
                opacity: 0.9,
              }}>
              {(partnerUser.name || "Partner").split(" ")[0]}
            </span>
          </div>
        )}

        {/* Divider */}
        <div
          style={{
            width: "1px",
            height: "50px",
            backgroundColor: "var(--border-light)",
            flexShrink: 0,
          }}
        />

        {/* 3. Instagram Highlights Circles */}
        {highlights.map((hl) => (
          <div
            key={hl._id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
            }}>
            <div
              onClick={() => {
                const validStories = (hl.stories || []).filter(Boolean);
                if (validStories.length > 0) {
                  setStoryPlayer({
                    isOpen: true,
                    stories: validStories,
                    startIndex: 0,
                    title: hl.title,
                    highlightId: hl._id,
                  });
                } else {
                  alert(
                    "This highlight has no stories. The stories in it expired or were deleted before index synchronization.",
                  );
                }
              }}
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                border: "1.5px solid var(--border-light)",
                padding: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: "var(--card-bg)",
              }}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  overflow: "hidden",
                }}>
                <img
                  src={hl.coverUrl}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  alt={hl.title}
                />
              </div>
            </div>
            <span
              style={{
                fontSize: "12px",
                marginTop: "6px",
                fontWeight: 500,
                maxWidth: "75px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                opacity: 0.9,
              }}>
              {hl.title}
            </span>
          </div>
        ))}

        {/* 4. "+ New Highlight" Circle */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
          <div
            onClick={openCreateHighlightModal}
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              border: "2px dashed var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backgroundColor: "var(--card-bg)",
            }}>
            <FolderPlus size={22} color="var(--text-sub)" />
          </div>
          <span
            style={{
              fontSize: "12px",
              marginTop: "6px",
              fontWeight: 500,
              color: "var(--text-sub)",
            }}>
            New Highlight
          </span>
        </div>
      </div>

      {/* FULLSCREEN STORY PLAYER */}
      <AnimatePresence>
        {storyPlayer.isOpen && (
          <StoryPlayerPortal
            player={storyPlayer}
            currentUser={currentUser}
            partnerUser={partnerUser}
            onClose={() =>
              setStoryPlayer({
                isOpen: false,
                stories: [],
                startIndex: 0,
                title: "",
                highlightId: null,
              })
            }
            onDelete={handleDeleteStory}
            onRemoveFromHighlight={handleRemoveFromHighlight}
            onAddStory={() => openCreateStory(true)}
            onStoryUpdated={handleStoryUpdated}
            isOwnStory={isOwnStory}
          />
        )}
      </AnimatePresence>

      {/* MODAL: CREATE STORY */}
      <AnimatePresence>
        {showCreateStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.85)",
              zIndex: 3000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                width: "100%",
                maxWidth: "400px",
                backgroundColor: "var(--menu-bg)",
                borderRadius: "28px",
                padding: "24px",
                position: "relative",
                boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                color: "var(--text-main)",
              }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}>
                <h3 style={{ fontSize: "18px", fontWeight: 600 }}>
                  Create New Story
                </h3>
                <X
                  onClick={() => {
                    setReturnToStoryPlayerAfterPost(false);
                    setShowCreateStory(false);
                  }}
                  style={{ cursor: "pointer", color: "var(--text-sub)" }}
                />
              </div>

              {/* Upload Drop Zone / Preview */}
              <div
                onClick={() => fileInputRef.current.click()}
                style={{
                  width: "100%",
                  height: "240px",
                  borderRadius: "20px",
                  border: "2px dashed var(--border-light)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  cursor: "pointer",
                  backgroundColor: "var(--chat-bg)",
                  position: "relative",
                  marginBottom: "16px",
                }}>
                {mediaPreview ? (
                  <>
                    <img
                      src={mediaPreview}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      alt="Preview"
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.2)",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        bottom: "12px",
                        backgroundColor: "rgba(0,0,0,0.6)",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "100px",
                        fontSize: "11px",
                      }}>
                      Change photo
                    </span>
                  </>
                ) : (
                  <>
                    <ImageIcon
                      size={40}
                      color="var(--blush-pink)"
                      style={{ marginBottom: "12px" }}
                    />
                    <p style={{ fontSize: "14px", fontWeight: 600 }}>
                      Upload Media
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginTop: "4px",
                      }}>
                      Tap to select an image
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: "none" }}
              />

              {/* Caption Input */}
              <input
                type="text"
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  border: "1px solid var(--border-light)",
                  backgroundColor: "var(--chat-bg)",
                  color: "var(--text-main)",
                  outline: "none",
                  fontSize: "14px",
                  marginBottom: "20px",
                }}
              />

              {/* Submit Buttons */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => {
                    setReturnToStoryPlayerAfterPost(false);
                    setShowCreateStory(false);
                  }}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.05)",
                    color: "var(--text-main)",
                    boxShadow: "none",
                    padding: "12px 20px",
                    fontSize: "14px",
                  }}>
                  Cancel
                </button>
                <button
                  onClick={handlePostStory}
                  disabled={uploading || !mediaFile}
                  className="btn-primary"
                  style={{
                    flex: 2,
                    padding: "12px 20px",
                    fontSize: "14px",
                    opacity: !mediaFile || uploading ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}>
                  {uploading
                    ? `Posting (${uploadProgress}%)...`
                    : "Share Story"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE HIGHLIGHT */}
      <AnimatePresence>
        {showCreateHighlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.85)",
              zIndex: 3000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                width: "100%",
                maxWidth: "420px",
                backgroundColor: "var(--menu-bg)",
                borderRadius: "28px",
                padding: "24px",
                position: "relative",
                boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                color: "var(--text-main)",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
              }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}>
                <h3 style={{ fontSize: "18px", fontWeight: 600 }}>
                  New Highlight
                </h3>
                <X
                  onClick={() => setShowCreateHighlight(false)}
                  style={{ cursor: "pointer", color: "var(--text-sub)" }}
                />
              </div>

              {/* Title Input */}
              <input
                type="text"
                placeholder="Highlight Name (e.g. Summer Vacation)"
                value={highlightTitle}
                onChange={(e) => setHighlightTitle(e.target.value)}
                maxLength={20}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  border: "1px solid var(--border-light)",
                  backgroundColor: "var(--chat-bg)",
                  color: "var(--text-main)",
                  outline: "none",
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
              />

              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-sub)",
                  marginBottom: "10px",
                  fontWeight: 600,
                }}>
                Select Stories:
              </p>

              {/* Grid of Archived Stories */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                  marginBottom: "20px",
                  minHeight: "180px",
                  paddingRight: "4px",
                }}
                className="hide-scrollbar">
                {archivedStories.length === 0 ? (
                  <div
                    style={{
                      gridColumn: "span 3",
                      textAlign: "center",
                      padding: "40px 10px",
                      color: "var(--text-muted)",
                    }}>
                    No stories found in your archive to highlight.
                  </div>
                ) : (
                  archivedStories.map((story) => {
                    const isSelected = selectedStoriesForHighlight.some(
                      (s) => s._id === story._id,
                    );
                    return (
                      <div
                        key={story._id}
                        onClick={() => toggleSelectStoryForHighlight(story)}
                        style={{
                          aspectRatio: "3/4",
                          borderRadius: "12px",
                          overflow: "hidden",
                          position: "relative",
                          cursor: "pointer",
                          border: isSelected
                            ? "3px solid var(--blush-pink)"
                            : "1px solid var(--border-light)",
                        }}>
                        <img
                          src={story.mediaUrl}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          alt="Archive Story"
                        />
                        {isSelected && (
                          <div
                            style={{
                              position: "absolute",
                              top: "6px",
                              right: "6px",
                              backgroundColor: "var(--blush-pink)",
                              color: "white",
                              borderRadius: "50%",
                              width: "18px",
                              height: "18px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}>
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: "4px 6px",
                            backgroundColor: "rgba(0,0,0,0.5)",
                            color: "white",
                            fontSize: "8px",
                          }}>
                          {new Date(story.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => setShowCreateHighlight(false)}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.05)",
                    color: "var(--text-main)",
                    boxShadow: "none",
                    padding: "12px 20px",
                    fontSize: "14px",
                  }}>
                  Cancel
                </button>
                <button
                  onClick={handleCreateHighlight}
                  disabled={
                    savingHighlight ||
                    !highlightTitle.trim() ||
                    selectedStoriesForHighlight.length === 0
                  }
                  className="btn-primary"
                  style={{
                    flex: 2,
                    padding: "12px 20px",
                    fontSize: "14px",
                    opacity:
                      savingHighlight ||
                      !highlightTitle.trim() ||
                      selectedStoriesForHighlight.length === 0
                        ? 0.6
                        : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  {savingHighlight ? "Creating..." : "Create Highlight"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// PORTAL-STYLE INNER PLAYER COMPONENT FOR FULLSCREEN DISPLAY
const StoryPlayerPortal = ({
  player,
  currentUser,
  partnerUser,
  onClose,
  onDelete,
  onRemoveFromHighlight,
  onAddStory,
  onStoryUpdated,
  isOwnStory,
}) => {
  const online = useOnlineStatus();
  const [currentIndex, setCurrentIndex] = useState(player.startIndex);
  const [progress, setProgress] = useState(0);
  const [holdPaused, setHoldPaused] = useState(false);
  const [replyFocused, setReplyFocused] = useState(false);
  const isPaused = holdPaused || replyFocused;
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [liking, setLiking] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [emojiPulse, setEmojiPulse] = useState(null);
  const activeStory = player.stories[currentIndex];

  const duration = 5000;
  const progressIntervalRef = useRef(null);
  const lastTapRef = useRef({ time: 0 });
  const tapTimeoutRef = useRef(null);
  const replyInputRef = useRef(null);

  const myId = () => String(currentUser?._id || currentUser?.id || "");
  const partnerId = () => String(partnerUser?._id || partnerUser?.id || "");

  useEffect(() => {
    setProgress(0);
    setHoldPaused(false);
    setReplyFocused(false);
    setReplyText("");
    setReplySent(false);

    if (activeStory && activeStory.user?._id !== currentUser?._id) {
      api
        .viewStory(activeStory._id)
        .then((updated) => onStoryUpdated?.(updated))
        .catch(console.error);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (isPaused) {
      clearInterval(progressIntervalRef.current);
      return;
    }

    const intervalStep = 100;
    const totalSteps = duration / intervalStep;
    let stepCount = (progress / 100) * totalSteps;

    progressIntervalRef.current = setInterval(() => {
      stepCount += 1;
      const newProgress = (stepCount / totalSteps) * 100;

      if (newProgress >= 100) {
        setProgress(100);
        clearInterval(progressIntervalRef.current);
        handleNext();
      } else {
        setProgress(newProgress);
      }
    }, intervalStep);

    return () => clearInterval(progressIntervalRef.current);
  }, [currentIndex, isPaused, progress]);

  useEffect(
    () => () => {
      clearTimeout(tapTimeoutRef.current);
    },
    [],
  );

  const triggerHeartAnimation = () => {
    const id = Date.now();
    setFloatingHearts((prev) => [...prev, id]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h !== id));
    }, 1500);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < player.stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleLike = async (withAnimation = false) => {
    if (!activeStory || liking) return;
    if (withAnimation) triggerHeartAnimation();
    try {
      setLiking(true);
      const updated = await api.likeStory(activeStory._id);
      onStoryUpdated?.(updated);
    } catch (err) {
      console.error("Failed to like story:", err);
    } finally {
      setLiking(false);
    }
  };

  const handleReact = async (emoji) => {
    if (!activeStory || reacting) return;
    setEmojiPulse(emoji);
    setTimeout(() => setEmojiPulse(null), 400);
    try {
      setReacting(true);
      const updated = await api.reactToStory(activeStory._id, emoji);
      onStoryUpdated?.(updated);
    } catch (err) {
      console.error("Failed to react to story:", err);
    } finally {
      setReacting(false);
    }
  };

  const handleSendReply = async () => {
    const text = replyText.trim();
    if (
      !text ||
      !activeStory ||
      !currentUser?.coupleId ||
      !online ||
      sendingReply
    )
      return;

    try {
      setSendingReply(true);
      const payload = {
        type: "story_reply",
        text,
        sender: myId(),
        storyId: activeStory._id,
        storyMediaUrl: activeStory.mediaUrl,
        storyCaption: activeStory.caption || "",
        storyMediaType: activeStory.mediaType || "image",
      };
      const msgId = pushMessage(currentUser.coupleId, payload);

      if (partnerId()) {
        api
          .sendChatNotification({
            recipientId: partnerId(),
            messagePreview: text,
            messageId: msgId,
          })
          .catch(() => {});
      }

      setReplyText("");
      setReplySent(true);
      setTimeout(() => setReplySent(false), 2000);
    } catch (err) {
      console.error("Failed to send story reply:", err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleTap = (e) => {
    const tapWidth = window.innerWidth;
    const clickX = e.clientX;

    if (clickX < tapWidth * 0.3) {
      clearTimeout(tapTimeoutRef.current);
      handlePrev();
      return;
    }

    const ownStory = isOwnStory(activeStory);
    const inHighlight = !!player.highlightId;
    const canInteract = !ownStory && !inHighlight;

    if (!canInteract) {
      handleNext();
      return;
    }

    const now = Date.now();
    if (now - lastTapRef.current.time < 300) {
      clearTimeout(tapTimeoutRef.current);
      lastTapRef.current.time = 0;
      handleLike(true);
      return;
    }
    lastTapRef.current.time = now;

    clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      handleNext();
    }, 280);
  };

  if (!activeStory) return null;

  const ownStory = isOwnStory(activeStory);
  const inHighlight = !!player.highlightId;
  const canInteract = !ownStory && !inHighlight;
  const showDelete = ownStory;
  const showAddStory = ownStory && !inHighlight;
  const showRemoveFromHighlight = inHighlight && !ownStory;

  const likedByMe = (activeStory.likes || []).some(
    (id) => String(id._id || id) === myId(),
  );
  const partnerLiked = (activeStory.likes || []).some(
    (id) => String(id._id || id) === partnerId(),
  );
  const partnerReaction = (activeStory.reactions || []).find(
    (r) => String(r.user?._id || r.user) === partnerId(),
  );
  const myReaction = (activeStory.reactions || []).find(
    (r) => String(r.user?._id || r.user) === myId(),
  );

  const timeString = () => {
    const hours = Math.floor(
      (new Date() - new Date(activeStory.createdAt)) / (1000 * 60 * 60),
    );
    if (hours === 0) return "Just now";
    return `${hours}h ago`;
  };

  const stopBarEvent = (e) => e.stopPropagation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "black",
        zIndex: 5000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      }}>
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          overflow: "hidden",
          boxSizing: "border-box",
          paddingTop: STORY_SAFE_TOP,
          paddingBottom: STORY_SAFE_BOTTOM,
        }}>
        <div
          onClick={handleTap}
          onMouseDown={() => setHoldPaused(true)}
          onMouseUp={() => setHoldPaused(false)}
          onTouchStart={() => setHoldPaused(true)}
          onTouchEnd={() => setHoldPaused(false)}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
          }}
        />

        {/* Floating hearts on like */}
        <AnimatePresence>
          {floatingHearts.map((id) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0.5, y: 0 }}
              animate={{ opacity: 1, scale: 1.2, y: -120 }}
              exit={{ opacity: 0, scale: 0.8, y: -180 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: "50%",
                top: "45%",
                transform: "translateX(-50%)",
                zIndex: 18,
                pointerEvents: "none",
                fontSize: "72px",
              }}>
              ❤️
            </motion.div>
          ))}
        </AnimatePresence>

        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "12px",
            right: "12px",
            display: "flex",
            gap: "4px",
            zIndex: 20,
          }}>
          {player.stories.map((s, idx) => {
            let width = "0%";
            if (idx < currentIndex) width = "100%";
            if (idx === currentIndex) width = `${progress}%`;
            return (
              <div
                key={s._id}
                style={{
                  flex: 1,
                  height: "3px",
                  backgroundColor: "rgba(255,255,255,0.3)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}>
                <div
                  style={{
                    height: "100%",
                    backgroundColor: "white",
                    width: width,
                    transition:
                      idx === currentIndex ? "none" : "width 0.1s linear",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            top: "24px",
            left: "16px",
            right: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 20,
            color: "white",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "1.5px solid white",
              }}>
              <img
                src={activeStory.user?.avatar || "https://i.pravatar.cc/200"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                alt="User"
              />
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600 }}>
                {activeStory.user?.name || player.title}
              </p>
              <p style={{ fontSize: "10px", opacity: 0.6, marginTop: "-2px" }}>
                {timeString()}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              zIndex: 30,
            }}>
            {showAddStory && (
              <button
                type="button"
                aria-label="Add story"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddStory?.();
                }}
                style={{
                  background: "rgba(255, 183, 197, 0.22)",
                  border: "1px solid rgba(255, 183, 197, 0.45)",
                  color: "#ffb7c5",
                  borderRadius: "999px",
                  height: "32px",
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}>
                <Plus size={14} />
                Add
              </button>
            )}
            {showDelete && (
              <button
                type="button"
                aria-label="Delete story"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(activeStory._id);
                }}
                style={{
                  background: "rgba(255, 77, 98, 0.22)",
                  border: "1px solid rgba(255, 120, 140, 0.45)",
                  color: "#ff8a9a",
                  borderRadius: "999px",
                  height: "32px",
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}>
                <Trash2 size={14} />
                Delete
              </button>
            )}
            {showRemoveFromHighlight && (
              <button
                type="button"
                aria-label="Remove from highlight"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromHighlight(player.highlightId, activeStory._id);
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "white",
                  borderRadius: "999px",
                  height: "32px",
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}>
                <Trash2 size={14} />
                Remove
              </button>
            )}
            <button
              type="button"
              aria-label="Close story viewer"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "white",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
          }}>
          {activeStory.mediaType === "video" ? (
            <video
              src={activeStory.mediaUrl}
              autoPlay
              playsInline
              muted
              style={{ width: "100%", maxHeight: "80%", objectFit: "contain" }}
            />
          ) : (
            <img
              src={activeStory.mediaUrl}
              style={{ width: "100%", maxHeight: "80%", objectFit: "contain" }}
              alt="Story Content"
            />
          )}
        </div>

        {activeStory.caption && (
          <div
            style={{
              position: "absolute",
              bottom: canInteract
                ? "130px"
                : ownStory && !inHighlight
                  ? "64px"
                  : "32px",
              left: "16px",
              right: "16px",
              padding: "16px",
              backgroundColor: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(10px)",
              borderRadius: "16px",
              color: "white",
              textAlign: "center",
              fontSize: "14px",
              zIndex: 15,
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}>
            {activeStory.caption}
          </div>
        )}

        {canInteract && (
          <div
            onClick={stopBarEvent}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 25,
              padding: "12px 16px 12px",
              background:
                "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
            }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
                gap: "6px",
              }}>
              {STORY_QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`React with ${emoji}`}
                  disabled={reacting}
                  onClick={(e) => {
                    stopBarEvent(e);
                    handleReact(emoji);
                  }}
                  style={{
                    background:
                      myReaction?.emoji === emoji
                        ? "rgba(255,255,255,0.2)"
                        : "transparent",
                    border: "none",
                    fontSize: "22px",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "8px",
                    transform: emojiPulse === emoji ? "scale(1.3)" : "scale(1)",
                    transition: "transform 0.2s ease",
                  }}>
                  {emoji}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                ref={replyInputRef}
                type="text"
                placeholder={online ? "Send message…" : "Offline"}
                value={replyText}
                disabled={!online || sendingReply}
                onChange={(e) => setReplyText(e.target.value)}
                onPointerDown={(e) => {
                  stopBarEvent(e);
                  setReplyFocused(true);
                }}
                onFocus={() => setReplyFocused(true)}
                onBlur={() => setReplyFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                onClick={stopBarEvent}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.25)",
                  backgroundColor: "rgba(255,255,255,0.12)",
                  color: "white",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
              {replyText.trim() ? (
                <button
                  type="button"
                  aria-label="Send reply"
                  disabled={!online || sendingReply}
                  onClick={(e) => {
                    stopBarEvent(e);
                    handleSendReply();
                  }}
                  style={{
                    background: "rgba(255, 183, 197, 0.35)",
                    border: "none",
                    color: "white",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}>
                  <Send size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={likedByMe ? "Unlike story" : "Like story"}
                  disabled={liking}
                  onClick={(e) => {
                    stopBarEvent(e);
                    handleLike(true);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: likedByMe ? "#ff4d6a" : "white",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  <Heart size={28} fill={likedByMe ? "#ff4d6a" : "none"} />
                </button>
              )}
            </div>
            {replySent && (
              <p
                style={{
                  textAlign: "center",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "11px",
                  marginTop: "8px",
                  marginBottom: 0,
                }}>
                Sent to chat
              </p>
            )}
          </div>
        )}

        {ownStory && !inHighlight && (
          <div
            style={{
              minHeight: "48px",
              backgroundColor: "rgba(0,0,0,0.8)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "12px",
              padding: "10px 16px",
              color: "white",
              zIndex: 15,
              fontSize: "12px",
            }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Eye size={16} />
              {activeStory.views?.length || 0} view
              {(activeStory.views?.length || 0) !== 1 ? "s" : ""}
            </span>
            {partnerLiked && (
              <span
                style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Heart size={16} fill="#ff4d6a" color="#ff4d6a" />
                {(partnerUser?.name || "Partner").split(" ")[0]} liked
              </span>
            )}
            {partnerReaction && (
              <span
                style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "16px" }}>
                  {partnerReaction.emoji}
                </span>
                {(partnerUser?.name || "Partner").split(" ")[0]} reacted
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StoriesAndHighlights;
