import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Contact, Search, Download, RefreshCw, Users, Smartphone,
  ChevronDown, ChevronUp, History, Clock,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { useToast } from '../components/Toast';
import api from '../../utils/api';

const USER_FILTERS = [
  { value: '', label: 'All' },
  { value: 'male', label: 'Him' },
  { value: 'female', label: 'Her' },
];

const formatDate = (date) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatPhones = (phones = []) => phones.map((p) => p.number).filter(Boolean).join(', ') || '—';
const formatEmails = (emails = []) => emails.map((e) => e.address).filter(Boolean).join(', ') || '—';

const ContactsManager = () => {
  const toast = useToast();
  const [tab, setTab] = useState('contacts');
  const [stats, setStats] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLog, setExpandedLog] = useState(null);

  const resolveUserId = useCallback((role) => {
    if (!role) return '';
    const match = stats.find((s) => s.role === role);
    return match?.userId || '';
  }, [stats]);

  useEffect(() => {
    setUserIdFilter(resolveUserId(roleFilter));
    setPage(1);
  }, [roleFilter, resolveUserId]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.getContactStats();
      setStats(res.stats || []);
    } catch (err) {
      console.error('Failed to load contact stats:', err);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (userIdFilter) params.set('userId', userIdFilter);
      const res = await api.getContacts(params.toString());
      setContacts(res.contacts || []);
      setTotalPages(res.pages || 1);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [page, search, userIdFilter, toast]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (userIdFilter) params.set('userId', userIdFilter);
      const res = await api.getContactHistory(params.toString());
      setLogs(res.logs || []);
      setTotalPages(res.pages || 1);
    } catch (err) {
      console.error('Failed to load contact history:', err);
      toast.error('Failed to load sync history');
    } finally {
      setLoading(false);
    }
  }, [page, userIdFilter, toast]);

  const refresh = useCallback(async () => {
    await loadStats();
    if (tab === 'contacts') await loadContacts();
    else await loadHistory();
  }, [tab, loadStats, loadContacts, loadHistory]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab !== 'contacts') return undefined;
    const timer = setTimeout(() => {
      loadContacts();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [tab, page, userIdFilter, search, loadContacts]);

  useEffect(() => {
    if (tab !== 'history') return undefined;
    loadHistory();
  }, [tab, page, userIdFilter, loadHistory]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '500' });
      if (search.trim()) params.set('search', search.trim());
      if (userIdFilter) params.set('userId', userIdFilter);
      const res = await api.getContacts(params.toString());
      const blob = new Blob([JSON.stringify(res.contacts || [], null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contacts_export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Contacts exported!');
    } catch {
      toast.error('Export failed');
    }
  };

  const maleStat = stats.find((s) => s.role === 'male');
  const femaleStat = stats.find((s) => s.role === 'female');

  return (
    <div>
      <div className="admin-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Phone Contacts</h2>
          <p>Synced address books from both partners in your couple.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={refresh}
          className="admin-btn secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} /> Refresh
        </motion.button>
      </div>

      <div className="admin-stat-grid" style={{ marginBottom: '24px' }}>
        <StatCard
          icon={Users}
          label={maleStat?.name ? `${maleStat.name.split(' ')[0]}'s contacts` : 'His contacts'}
          value={maleStat?.total ?? '—'}
          color="#D3E4F4"
          delay={0}
        />
        <StatCard
          icon={Smartphone}
          label={femaleStat?.name ? `${femaleStat.name.split(' ')[0]}'s contacts` : 'Her contacts'}
          value={femaleStat?.total ?? '—'}
          color="#FFB7C5"
          delay={0.05}
        />
        <StatCard
          icon={Clock}
          label="Last sync (him)"
          value={maleStat?.lastSyncedAt ? formatDate(maleStat.lastSyncedAt).split(',')[0] : 'Never'}
          color="#4CAF50"
          delay={0.1}
        />
        <StatCard
          icon={Clock}
          label="Last sync (her)"
          value={femaleStat?.lastSyncedAt ? formatDate(femaleStat.lastSyncedAt).split(',')[0] : 'Never'}
          color="#9c27b0"
          delay={0.15}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'contacts', label: 'Contacts', icon: Contact },
          { id: 'history', label: 'Sync History', icon: History },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setPage(1); }}
            className={`admin-btn ${tab === t.id ? '' : 'secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div className="admin-card" style={{ marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {tab === 'contacts' && (
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search name, phone, email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="admin-input"
                style={{ paddingLeft: '36px', width: '100%' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            {USER_FILTERS.map((f) => (
              <button
                key={f.value || 'all'}
                type="button"
                onClick={() => setRoleFilter(f.value)}
                className={`admin-btn ${roleFilter === f.value ? '' : 'secondary'}`}
                style={{ fontSize: '13px' }}
              >
                {f.label}
              </button>
            ))}
          </div>
          {tab === 'contacts' && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleExport} className="admin-btn secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> Export
            </motion.button>
          )}
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <p style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</p>
        ) : tab === 'contacts' ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone(s)</th>
                  <th>Email(s)</th>
                  <th>Owner</th>
                  <th>Last Synced</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      No contacts synced yet. Ask partners to sync from Profile in the mobile app.
                    </td>
                  </tr>
                ) : contacts.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 600 }}>{c.displayName || '—'}</td>
                    <td style={{ fontSize: '13px' }}>{formatPhones(c.phones)}</td>
                    <td style={{ fontSize: '13px' }}>{formatEmails(c.emails)}</td>
                    <td>
                      <span className="admin-badge pink">{c.userId?.name?.split(' ')[0] || c.userId?.role || '—'}</span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{formatDate(c.lastSyncedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '32px' }} />
                  <th>User</th>
                  <th>Synced At</th>
                  <th>Added</th>
                  <th>Updated</th>
                  <th>Removed</th>
                  <th>Total</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      No sync history yet.
                    </td>
                  </tr>
                ) : logs.map((log) => (
                  <React.Fragment key={log._id}>
                    <tr>
                      <td>
                        {log.changes?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sub)' }}
                          >
                            {expandedLog === log._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.userId?.name?.split(' ')[0] || '—'}</td>
                      <td style={{ fontSize: '13px' }}>{formatDate(log.syncedAt)}</td>
                      <td><span className="admin-badge" style={{ background: 'rgba(76,175,80,0.15)', color: '#4CAF50' }}>+{log.summary?.added ?? 0}</span></td>
                      <td><span className="admin-badge" style={{ background: 'rgba(33,150,243,0.15)', color: '#2196F3' }}>{log.summary?.updated ?? 0}</span></td>
                      <td><span className="admin-badge" style={{ background: 'rgba(255,77,77,0.15)', color: '#FF4D4D' }}>-{log.summary?.removed ?? 0}</span></td>
                      <td>{log.summary?.total ?? 0}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{log.device || '—'}</td>
                    </tr>
                    {expandedLog === log._id && log.changes?.length > 0 && (
                      <tr>
                        <td colSpan={8} style={{ background: 'var(--chat-bg)', padding: '12px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                            {log.changes.map((ch, i) => (
                              <div key={`${ch.deviceContactId}-${i}`} style={{ display: 'flex', gap: '8px' }}>
                                <span className="admin-badge" style={{
                                  textTransform: 'capitalize',
                                  background: ch.action === 'added' ? 'rgba(76,175,80,0.15)' : ch.action === 'removed' ? 'rgba(255,77,77,0.15)' : 'rgba(33,150,243,0.15)',
                                  color: ch.action === 'added' ? '#4CAF50' : ch.action === 'removed' ? '#FF4D4D' : '#2196F3',
                                }}>
                                  {ch.action}
                                </span>
                                <span>{ch.displayName || ch.deviceContactId}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '16px' }}>
            <button type="button" className="admin-btn secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span style={{ alignSelf: 'center', fontSize: '13px', color: 'var(--text-sub)' }}>Page {page} of {totalPages}</span>
            <button type="button" className="admin-btn secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsManager;
