import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Trash2, Download, MessageCircle, Image as ImageIcon, Video as VideoIcon, FileText, Music2, X } from 'lucide-react';
import { useAdminData } from '../data/AdminDataContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const TYPES = ['All', 'text', 'image', 'video', 'audio', 'file'];

const ChatManager = () => {
  const { messages, users, deleteMessage } = useAdminData();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [senderFilter, setSenderFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [deletingId, setDeletingId] = useState(null);

  // Build a sender filter list dynamically from the couple's users (sender stored as user _id in RTDB)
  const senderOptions = useMemo(() => {
    const opts = [{ id: 'All', label: 'All' }];
    (users || []).forEach((u) => opts.push({ id: String(u._id), label: u.name?.split(' ')[0] || 'User' }));
    return opts;
  }, [users]);

  const senderName = (id) => {
    const u = (users || []).find((x) => String(x._id) === String(id));
    return u?.name?.split(' ')[0] || 'Unknown';
  };

  const messageType = (m) => {
    if (m.type === 'audio') return 'audio';
    if (m.type === 'file') return 'file';
    if (m.type === 'video') return 'video';
    if (m.type === 'image' || m.mediaUrl) return 'image';
    return 'text';
  };

  const filtered = (messages || []).filter(m => {
    const haystack = (m.text || m.mediaUrl || '').toLowerCase();
    const matchSearch = haystack.includes(search.toLowerCase());
    const matchSender = senderFilter === 'All' || String(m.sender) === senderFilter;
    const matchType = typeFilter === 'All' || messageType(m) === typeFilter;
    return matchSearch && matchSender && matchType;
  });

  const handleExport = () => {
    const data = JSON.stringify(messages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'chat_export.json'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Chat log exported!');
  };

  const confirmDelete = () => {
    deleteMessage(deletingId);
    toast.success('Message deleted.');
    setDeletingId(null);
  };

  const stats = [
    { label: 'Total Messages', value: messages.length },
    ...(users || []).slice(0, 2).map((u) => ({
      label: `From ${u.name?.split(' ')[0] || 'User'}`,
      value: messages.filter(m => String(m.sender) === String(u._id)).length,
    })),
    { label: 'Media Shared', value: messages.filter(m => ['image', 'video', 'audio', 'file'].includes(messageType(m))).length },
  ];

  return (
    <div>
      <div className="admin-section-title">
        <h2>Conversation History</h2>
        <p>A log of your private world — view, search, and moderate.</p>
      </div>

      <div className="admin-stat-grid" style={{ marginBottom: '28px' }}>
        {stats.map(s => (
          <div key={s.label} className="admin-card" style={{ textAlign: 'center', padding: '20px' }}>
            <h3 style={{ fontSize: '28px', marginBottom: '4px' }}>{s.value}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-sub)', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="admin-card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '200px', maxWidth: '340px', background: 'var(--chat-bg)', padding: '10px 14px', borderRadius: '12px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input placeholder="Search messages..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '14px', color: 'var(--text-main)' }} />
            {search && <X size={14} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {senderOptions.map(s => (
                <button key={s.id} onClick={() => setSenderFilter(s.id)}
                  style={{ padding: '7px 14px', borderRadius: '100px', border: '1px solid var(--border-light)', background: senderFilter === s.id ? 'var(--blush-pink)' : 'var(--card-bg)', color: senderFilter === s.id ? 'white' : 'var(--text-sub)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  {s.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {TYPES.map(t => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  style={{ padding: '7px 14px', borderRadius: '100px', border: '1px solid var(--border-light)', background: typeFilter === t ? 'var(--text-main)' : 'var(--card-bg)', color: typeFilter === t ? 'white' : 'var(--text-sub)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleExport}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              <Download size={16} /> Export
            </motion.button>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '24px' }}>Sender</th>
                <th>Message</th>
                <th>Type</th>
                <th>Time / Date</th>
                <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No messages found.</td></tr>
              )}
              {filtered.map(msg => {
                const senderLabel = senderName(msg.sender);
                const type = messageType(msg);
                const created = msg.createdAt ? new Date(msg.createdAt) : null;
                return (
                  <tr key={msg.id}>
                    <td style={{ paddingLeft: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: senderLabel === 'Neha' ? 'var(--card-accent-pink)' : 'var(--card-accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{senderLabel[0]}</div>
                        <span style={{ fontWeight: 600 }}>{senderLabel}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '360px' }}>
                      {type === 'image' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden' }}><img src={msg.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /></div>
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Photo shared</span>
                        </div>
                      ) : type === 'video' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', position: 'relative', backgroundColor: '#000' }}>
                            {msg.mediaUrl.includes('/video/upload/') ? (
                              <img 
                                src={msg.mediaUrl.replace(/\.[^/.]+$/, '.jpg').replace('/video/upload/', '/video/upload/w_150,h_150,c_limit,so_0/')} 
                                loading="lazy"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                alt=""
                              />
                            ) : (
                              <video 
                                src={msg.mediaUrl.includes('#t=') ? msg.mediaUrl : `${msg.mediaUrl}#t=0.1`} 
                                preload="metadata" 
                                muted 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              />
                            )}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                              <VideoIcon size={16} />
                            </div>
                          </div>
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Video shared</span>
                        </div>
                      ) : type === 'audio' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--chat-bg)' }}>
                            <Music2 size={16} />
                          </div>
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.mediaName || 'Audio shared'}</span>
                        </div>
                      ) : type === 'file' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--chat-bg)' }}>
                            <FileText size={16} />
                          </div>
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.mediaName || 'File shared'}</span>
                        </div>
                      ) : (
                        <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px' }}>{msg.text}</p>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-sub)', fontSize: '13px' }}>
                        {type === 'image' ? <ImageIcon size={14} /> : type === 'video' ? <VideoIcon size={14} /> : type === 'audio' ? <Music2 size={14} /> : type === 'file' ? <FileText size={14} /> : <MessageCircle size={14} />}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{created ? created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{created ? created.toLocaleDateString() : ''}</div>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                      <button onClick={() => setDeletingId(msg.id)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#FF5252', cursor: 'pointer' }}><Trash2 size={17} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog isOpen={!!deletingId} title="Delete Message?" description="This message will be permanently removed from the conversation history." onConfirm={confirmDelete} onCancel={() => setDeletingId(null)} />
    </div>
  );
};

export default ChatManager;
