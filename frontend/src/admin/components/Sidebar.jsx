import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Image, 
  FolderHeart, 
  MessageSquare, 
  Calendar, 
  GitBranch, 
  Sparkles, 
  Settings,
  Heart,
  Activity,
  BellRing,
  Contact,
} from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = ({ isCollapsed }) => {
  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { path: '/admin/users', icon: Users, label: 'Us' },
    { path: '/admin/memories', icon: Image, label: 'Memories' },
    { path: '/admin/albums', icon: FolderHeart, label: 'Albums' },
    { path: '/admin/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/admin/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/admin/timeline', icon: GitBranch, label: 'Timeline' },
    { path: '/admin/moments', icon: Sparkles, label: 'Moments' },
    { path: '/admin/activity', icon: Activity, label: 'Activity' },
    { path: '/admin/contacts', icon: Contact, label: 'Contacts' },
    { path: '/admin/notifications', icon: BellRing, label: 'Notify' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <Heart size={28} color="var(--blush-pink)" fill="var(--blush-pink)" />
        {!isCollapsed && <span className="sidebar-logo">Love Admin</span>}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={22} />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <NavLink to="/" className="nav-item">
           <Sparkles size={20} />
           {!isCollapsed && <span>View App</span>}
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
