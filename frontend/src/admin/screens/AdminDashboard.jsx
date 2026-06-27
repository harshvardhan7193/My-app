import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, Image as ImageIcon, MessageSquare, Calendar as CalendarIcon, Sparkles, TrendingUp, Clock, GitBranch, FolderHeart } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useAdminData } from '../data/AdminDataContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { memories, albums, messages, events, settings } = useAdminData();
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const daysTogether = () => {
    if (!settings?.anniversaryDate) return '—';
    const start = new Date(settings.anniversaryDate);
    const now = new Date();
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, days).toLocaleString();
  };

  const stats = [
    { icon: Heart, label: 'Days Together', value: daysTogether(), color: '#FFB7C5' },
    { icon: ImageIcon, label: 'Total Memories', value: memories.length.toString(), color: '#F4D3D3' },
    { icon: MessageSquare, label: 'Chat Messages', value: messages.length.toString(), color: '#EBE8F3' },
    { icon: CalendarIcon, label: 'Planned Events', value: events.length.toString(), color: '#D4AF37' },
  ];

  const activityData = [
    { month: 'Jan', uploads: 12 }, { month: 'Feb', uploads: 18 },
    { month: 'Mar', uploads: 15 }, { month: 'Apr', uploads: 25 },
    { month: 'May', uploads: 20 }, { month: 'Jun', uploads: 32 },
  ];

  const categoryData = [
    { name: 'Dates', value: memories.filter(m => m.category === 'Dates').length || 3, color: '#FFB7C5' },
    { name: 'Trips', value: memories.filter(m => m.category === 'Trips').length || 2, color: '#F4D3D3' },
    { name: 'Milestones', value: memories.filter(m => m.category === 'Milestones').length || 1, color: '#EBE8F3' },
    { name: 'Favorites', value: memories.filter(m => m.category === 'Favorites').length || 2, color: '#D4AF37' },
  ];

  const recentActivity = [
    { id: 1, user: 'Neha', action: 'uploaded photos to', target: 'Summer in Bali', time: '2 hours ago', link: '/admin/albums' },
    { id: 2, user: 'Harsh', action: 'added event:', target: 'Anniversary Dinner', time: '5 hours ago', link: '/admin/calendar' },
    { id: 3, user: 'Neha', action: 'changed mood to', target: 'Feeling Loved 🥰', time: '8 hours ago', link: '/admin/users' },
    { id: 4, user: 'Harsh', action: 'created album', target: 'Our Dog: Milo', time: '1 day ago', link: '/admin/albums' },
  ];

  const shortcuts = [
    { label: 'Add New Memory', icon: ImageIcon, color: 'var(--blush-pink)', onClick: () => navigate('/admin/memories') },
    { label: 'Create New Album', icon: FolderHeart, color: '#9c27b0', onClick: () => navigate('/admin/albums') },
    { label: 'Add Calendar Event', icon: CalendarIcon, color: '#D4AF37', onClick: () => navigate('/admin/calendar') },
    { label: 'Add Timeline Milestone', icon: GitBranch, color: '#4CAF50', onClick: () => navigate('/admin/timeline') },
  ];

  return (
    <div>
      <div className="admin-section-title">
        <h2>Relationship Overview</h2>
        <p>Everything you've built together, at a glance.</p>
      </div>

      <div className="admin-stat-grid">
        {stats.map((stat, i) => <StatCard key={stat.label} {...stat} delay={i * 0.08} />)}
      </div>

      <div className="admin-grid grid-2" style={{ marginBottom: '32px' }}>
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px' }}>Memories Growth</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4CAF50', fontSize: '14px', fontWeight: 600 }}>
              <TrendingUp size={16} /> +24% vs last month
            </div>
          </div>
          <div style={{ height: '260px', minWidth: 0 }}>
            {chartsReady && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--blush-pink)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--blush-pink)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-sub)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-sub)', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-light)' }} />
                <Area type="monotone" dataKey="uploads" stroke="var(--blush-pink)" strokeWidth={3} fillOpacity={1} fill="url(#colorUploads)" />
              </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ fontSize: '18px', marginBottom: '24px' }}>Category Distribution</h3>
          <div style={{ height: '260px', minWidth: 0 }}>
            {chartsReady && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={categoryData} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-light)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-sub)', fontSize: 12 }} width={80} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-light)' }} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                  {categoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Bar>
              </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="admin-grid grid-3">
        <div className="admin-card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Recent Activity</h3>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th><th>Action</th><th>Target</th><th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((a) => (
                  <tr key={a.id} onClick={() => navigate(a.link)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: a.user === 'Neha' ? 'var(--card-accent-pink)' : 'var(--card-accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{a.user[0]}</div>
                        {a.user}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-sub)' }}>{a.action}</td>
                    <td><span className="admin-badge pink">{a.target}</span></td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px' }}><Clock size={14} />{a.time}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Quick Shortcuts</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {shortcuts.map((s) => (
              <motion.button
                key={s.label} whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
                onClick={s.onClick}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: 'var(--chat-bg)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              >
                <div style={{ color: s.color }}><s.icon size={18} /></div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}>{s.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
