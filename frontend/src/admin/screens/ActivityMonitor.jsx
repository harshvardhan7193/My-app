import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wifi, WifiOff, Clock, Activity, Smartphone, Monitor, Moon, Sun, RefreshCw, 
  FileText, Image, Calendar, MessageSquare, Award, Play, MapPin 
} from 'lucide-react';
import { useAdminData } from '../data/AdminDataContext';
import api from '../../utils/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 10) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const formatFull = (date) =>
  new Date(date).toLocaleString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const getActionIcon = (action) => {
  const a = action.toLowerCase();
  if (a.includes('open') || a.includes('login')) return Smartphone;
  if (a.includes('message') || a.includes('chat')) return MessageSquare;
  if (a.includes('photo') || a.includes('image') || a.includes('album')) return Image;
  if (a.includes('calendar') || a.includes('event')) return Calendar;
  if (a.includes('memory') || a.includes('memories')) return FileText;
  if (a.includes('streak') || a.includes('milestone')) return Award;
  if (a.includes('slide') || a.includes('recap')) return Play;
  return Activity;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// ─────────────────────────────────────────────────────────────────────────────

const WeekBar = ({ values, color }) => {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '64px' }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(v / max) * 100}%` }}
            transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
            style={{ width: '100%', borderRadius: '4px', background: color, minHeight: '4px' }}
            title={`${v} minutes`}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{DAYS[i]}</span>
        </div>
      ))}
    </div>
  );
};

const ActivityMonitor = () => {
  const { users } = useAdminData();
  const [tick, setTick] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch analytics on mount and whenever tick is updated
  useEffect(() => {
    let cancelled = false;
    const fetchAnalytics = async () => {
      try {
        const res = await api.getActivityMonitor();
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load live activity monitor metrics:', err);
        if (!cancelled) setLoading(false);
      }
    };
    fetchAnalytics();
    return () => { cancelled = true; };
  }, [tick]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleManualRefresh = () => {
    setTick(t => t + 1);
  };

  const userColors = ['var(--blush-pink)', '#9c27b0'];

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ marginRight: '12px' }} />
        <span>Loading live activity metrics...</span>
      </div>
    );
  }

  const sessions = data?.sessions || {};
  const recentActivities = data?.recentActivities || [];
  const summary = data?.summary || {
    onlineRightNow: '0 / 0',
    actionsToday: '0',
    longestStreak: '0 days'
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div className="admin-section-title" style={{ marginBottom: 0 }}>
          <h2>Activity Monitor</h2>
          <p>Last online times, session stats, and activity history.</p>
        </div>
        <motion.div
          animate={{ rotate: tick * 180 }}
          transition={{ duration: 0.5 }}
          style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
          onClick={handleManualRefresh}
          title="Auto-refreshes every 30s. Click to refresh now."
        >
          <RefreshCw size={18} />
        </motion.div>
      </div>

      {/* User Status Cards */}
      <div className="admin-grid grid-2" style={{ marginBottom: '28px' }}>
        {users.map((user, i) => {
          const userNameKey = user.name.split(' ')[0];
          const session = sessions[userNameKey] || {
            lastOnline: user.lastSeen || new Date(),
            isOnline: user.isOnline || false,
            device: 'Chrome · Windows',
            sessionsToday: 0,
            avgSessionMins: 0,
            peakHour: 'N/A',
            weeklyData: [0, 0, 0, 0, 0, 0, 0]
          };

          const isMobile = session.device.toLowerCase().includes('iphone') || 
                           session.device.toLowerCase().includes('ios') || 
                           session.device.toLowerCase().includes('android');
          const DeviceIcon = isMobile ? Smartphone : Monitor;
          const color = userColors[i];

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="admin-card"
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              {/* Accent gradient */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${color}, transparent)` }} />

              {/* Top row: avatar + online indicator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '18px', overflow: 'hidden', border: `2px solid ${color}40` }}>
                      <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={user.name} />
                    </div>
                    {/* Online dot */}
                    <div style={{
                      position: 'absolute', bottom: '-2px', right: '-2px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      backgroundColor: session.isOnline ? '#4CAF50' : '#A89F9F',
                      border: '2px solid var(--card-bg)',
                    }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', marginBottom: '2px' }}>{user.name}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--chat-bg)', padding: '2px 10px', borderRadius: '100px' }}>{user.role}</span>
                  </div>
                </div>

                {/* Online / Offline badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '8px 14px', borderRadius: '100px',
                  backgroundColor: session.isOnline ? 'rgba(76,175,80,0.1)' : 'var(--chat-bg)',
                  border: `1px solid ${session.isOnline ? 'rgba(76,175,80,0.3)' : 'var(--border-light)'}`,
                }}>
                  {session.isOnline
                    ? <><Wifi size={15} color="#4CAF50" /><span style={{ fontSize: '13px', fontWeight: 700, color: '#4CAF50' }}>Online</span></>
                    : <><WifiOff size={15} color="var(--text-muted)" /><span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>Offline</span></>
                  }
                </div>
              </div>

              {/* Last Seen */}
              <div style={{ padding: '16px', background: 'var(--chat-bg)', borderRadius: '14px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  <Clock size={14} />
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {session.isOnline ? 'Active Since' : 'Last Seen'}
                  </span>
                </div>
                <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {timeAgo(session.lastOnline)}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {formatFull(session.lastOnline)}
                </p>
              </div>

              {/* Session Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[
                  { label: 'Sessions Today', value: session.sessionsToday },
                  { label: 'Avg Duration', value: `${session.avgSessionMins}m` },
                  { label: 'Peak Hour', value: session.peakHour },
                ].map(s => (
                  <div key={s.label} style={{ padding: '12px', background: 'var(--chat-bg)', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', fontWeight: 700, marginBottom: '3px', color: color }}>{s.value}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, lineHeight: 1.3 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Device */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', border: '1px solid var(--border-light)', borderRadius: '12px', marginBottom: '20px' }}>
                <DeviceIcon size={18} color="var(--text-muted)" />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>{session.device}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last known device</p>
                </div>
              </div>

              {/* Location Coordinates */}
              {session.coordinates && session.coordinates.latitude !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', border: '1px solid var(--border-light)', borderRadius: '12px', marginBottom: '20px' }}>
                  <MapPin size={18} color="var(--blush-pink)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>
                      {session.coordinates.latitude.toFixed(6)}, {session.coordinates.longitude.toFixed(6)}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Updated {timeAgo(session.coordinates.updatedAt)}
                    </p>
                  </div>
                  <a 
                    href={`https://www.google.com/maps?q=${session.coordinates.latitude},${session.coordinates.longitude}`}
                    target="_blank" 
                    rel="noreferrer"
                    style={{
                      fontSize: '11px', 
                      color: color, 
                      fontWeight: 700, 
                      textDecoration: 'none',
                      background: 'var(--chat-bg)',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      border: `1px solid ${color}40`,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    View Map
                  </a>
                </div>
              )}

              {/* Weekly Activity Bar */}
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Weekly Usage (minutes)
                </p>
                <WeekBar values={session.weeklyData} color={color} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Joint Activity Log */}
      <div className="admin-card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={18} color="var(--blush-pink)" />
          <h3 style={{ fontSize: '18px' }}>Recent Activity Log</h3>
        </div>
        <div style={{ padding: '8px 0', maxHeight: '420px', overflowY: 'auto' }}>
          {recentActivities.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No recent activity recorded yet.
            </div>
          ) : (
            recentActivities.map((entry, idx) => {
              const isHarsh = entry.user === 'Harsh';
              const color = isHarsh ? 'var(--blush-pink)' : '#9c27b0';
              const ActionIcon = getActionIcon(entry.action);
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '14px 24px',
                    borderBottom: idx < recentActivities.length - 1 ? '1px solid var(--border-light)' : 'none',
                  }}
                >
                  {/* Action-related icon circle */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ActionIcon size={16} color={color} />
                  </div>

                  {/* Action text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color, fontSize: '14px' }}>{entry.user}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-sub)' }}> {entry.action}</span>
                    {entry.device && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px', background: 'var(--chat-bg)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
                        {entry.device.split(' · ')[0]}
                      </span>
                    )}
                  </div>

                  {/* Time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    <Clock size={13} />
                    {timeAgo(entry.time)}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="admin-grid grid-3" style={{ marginTop: '24px' }}>
        {[
          { label: 'Online Right Now', value: summary.onlineRightNow, icon: Wifi, color: '#4CAF50' },
          { label: 'Actions Today', value: summary.actionsToday, icon: Activity, color: 'var(--blush-pink)' },
          { label: 'Longest Streak', value: summary.longestStreak, icon: Moon, color: '#D4AF37' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
            className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 700 }}>{s.value}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-sub)', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ActivityMonitor;
