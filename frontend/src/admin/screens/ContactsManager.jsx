import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Contact, Search, Download, RefreshCw, Users, Smartphone,
  ChevronDown, ChevronUp, History, Clock, Phone,
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

const formatDuration = (secs) => {
  const s = Math.max(0, parseInt(secs, 10) || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
};

const CALL_TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
  { value: 'missed', label: 'Missed' },
];

const ContactsManager = () => {
  const toast = useToast();
  const [tab, setTab] = useState('contacts');
  const [stats, setStats] = useState([]);
  const [callStats, setCallStats] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [callEntries, setCallEntries] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [callTypeFilter, setCallTypeFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [daysWindow, setDaysWindow] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLog, setExpandedLog] = useState(null);

  const resolveUserId = useCallback((role) => {
    if (!role) return '';
    const match = stats.find((s) => s.role === role) || callStats.find((s) => s.role === role);
    return match?.userId || '';
  }, [stats, callStats]);

  useEffect(() => {
    setUserIdFilter(resolveUserId(roleFilter));
    setPage(1);
  }, [roleFilter, resolveUserId]);

  const loadStats = useCallback(async () => {
    try {
      const [contactRes, callRes] = await Promise.all([
        api.getContactStats(),
        api.getCallLogStats(),
      ]);
      setStats(contactRes.stats || []);
      setCallStats(callRes.stats || []);
      setDaysWindow(callRes.daysWindow || 10);
    } catch (err) {
      console.error('Failed to load stats:', err);
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

  const loadCallEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (userIdFilter) params.set('userId', userIdFilter);
      if (callTypeFilter) params.set('callType', callTypeFilter);
      const res = await api.getCallLogs(params.toString());
      setCallEntries(res.entries || []);
      setTotalPages(res.pages || 1);
      if (res.daysWindow) setDaysWindow(res.daysWindow);
    } catch (err) {
      console.error('Failed to load call logs:', err);
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
    }
  }, [page, search, userIdFilter, callTypeFilter, toast]);

  const loadCallSyncHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (userIdFilter) params.set('userId', userIdFilter);
      const res = await api.getCallLogHistory(params.toString());
      setCallLogs(res.logs || []);
      setTotalPages(res.pages || 1);
    } catch (err) {
      console.error('Failed to load call sync history:', err);
      toast.error('Failed to load call sync history');
    } finally {
      setLoading(false);
    }
  }, [page, userIdFilter, toast]);

  const refresh = useCallback(async () => {
    await loadStats();
    if (tab === 'contacts') await loadContacts();
    else if (tab === 'history') await loadHistory();
    else if (tab === 'calls') await loadCallEntries();
    else if (tab === 'call-sync') await loadCallSyncHistory();
  }, [tab, loadStats, loadContacts, loadHistory, loadCallEntries, loadCallSyncHistory]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab !== 'contacts' && tab !== 'calls') return undefined;
    const timer = setTimeout(() => {
      if (tab === 'contacts') loadContacts();
      else loadCallEntries();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [tab, page, userIdFilter, search, callTypeFilter, loadContacts, loadCallEntries]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
    if (tab === 'call-sync') loadCallSyncHistory();
  }, [tab, page, userIdFilter, loadHistory, loadCallSyncHistory]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '500' });
      if (search.trim()) params.set('search', search.trim());
      if (userIdFilter) params.set('userId', userIdFilter);
      if (tab === 'calls') {
        if (callTypeFilter) params.set('callType', callTypeFilter);
        const res = await api.getCallLogs(params.toString());
        const blob = new Blob([JSON.stringify(res.entries || [], null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'call_history_export.json';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Call history exported!');
        return;
      }
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
  const maleCalls = callStats.find((s) => s.role === 'male');
  const femaleCalls = callStats.find((s) => s.role === 'female');

  const showCallStats = tab === 'calls' || tab === 'call-sync';

  return (
    <div>
      <div className="admin-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Contacts &amp; Calls</h2>
          <p>Synced address books and last {daysWindow} days of call history from both partners.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={refresh}
          className="admin-btn secondary"
        >
          <RefreshCw size={16} /> Refresh
        </motion.button>
      </div>

      <div className="admin-stat-grid" style={{ marginBottom: '24px' }}>
        {showCallStats ? (
          <>
            <StatCard icon={Phone} label={maleCalls?.name ? `${maleCalls.name.split(' ')[0]}'s calls` : 'His calls'} value={maleCalls?.total ?? '—'} color="#D3E4F4" delay={0} />
            <StatCard icon={Phone} label={femaleCalls?.name ? `${femaleCalls.name.split(' ')[0]}'s calls` : 'Her calls'} value={femaleCalls?.total ?? '—'} color="#FFB7C5" delay={0.05} />
            <StatCard icon={Clock} label="Missed (him)" value={maleCalls?.missed ?? '—'} color="#FF5252" delay={0.1} />
            <StatCard icon={Clock} label="Missed (her)" value={femaleCalls?.missed ?? '—'} color="#9c27b0" delay={0.15} />
          </>
        ) : (
          <>
            <StatCard icon={Users} label={maleStat?.name ? `${maleStat.name.split(' ')[0]}'s contacts` : 'His contacts'} value={maleStat?.total ?? '—'} color="#D3E4F4" delay={0} />
            <StatCard icon={Smartphone} label={femaleStat?.name ? `${femaleStat.name.split(' ')[0]}'s contacts` : 'Her contacts'} value={femaleStat?.total ?? '—'} color="#FFB7C5" delay={0.05} />
            <StatCard icon={Clock} label="Last sync (him)" value={maleStat?.lastSyncedAt ? formatDate(maleStat.lastSyncedAt).split(',')[0] : 'Never'} color="#4CAF50" delay={0.1} />
            <StatCard icon={Clock} label="Last sync (her)" value={femaleStat?.lastSyncedAt ? formatDate(femaleStat.lastSyncedAt).split(',')[0] : 'Never'} color="#9c27b0" delay={0.15} />
          </>
        )}
      </div>

      <div className="admin-tab-bar">
        {[
          { id: 'contacts', label: 'Contacts', icon: Contact },
          { id: 'history', label: 'Contact Sync', icon: History },
          { id: 'calls', label: 'Call History', icon: Phone },
          { id: 'call-sync', label: 'Call Sync', icon: History },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setPage(1); }}
            className={`admin-btn ${tab === t.id ? '' : 'secondary'}`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div className="admin-card" style={{ marginBottom: '16px', padding: '16px 20px' }}>
        <div className="admin-toolbar">
          {(tab === 'contacts' || tab === 'calls') && (
            <div className="admin-search-wrap">
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder={tab === 'calls' ? 'Search name or number...' : 'Search name, phone, email...'}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          )}

          <div className="admin-toolbar-filters">
            {tab === 'calls' && (
              <div className="admin-filter-group">
                {CALL_TYPE_FILTERS.map((f) => (
                  <button
                    key={f.value || 'all-types'}
                    type="button"
                    onClick={() => { setCallTypeFilter(f.value); setPage(1); }}
                    className={`admin-btn chip ${callTypeFilter === f.value ? 'is-active-dark' : 'secondary'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            <div className="admin-filter-group">
              {USER_FILTERS.map((f) => (
                <button
                  key={f.value || 'all'}
                  type="button"
                  onClick={() => setRoleFilter(f.value)}
                  className={`admin-btn chip ${roleFilter === f.value ? 'is-active' : 'secondary'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {(tab === 'contacts' || tab === 'calls') && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleExport}
                className="admin-btn secondary"
              >
                <Download size={16} /> Export
              </motion.button>
            )}
          </div>
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
        ) : tab === 'history' ? (
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
        ) : tab === 'calls' ? (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Number</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>When</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {callEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      No call history yet. Ask partners to sync from Profile → Sync Call History in the mobile app.
                    </td>
                  </tr>
                ) : callEntries.map((e) => (
                  <tr key={e._id}>
                    <td style={{ fontWeight: 600 }}>{e.contactName || '—'}</td>
                    <td style={{ fontSize: '13px' }}>{e.phoneNumber || '—'}</td>
                    <td>
                      <span className="admin-badge" style={{
                        textTransform: 'capitalize',
                        background: e.callType === 'missed' ? 'rgba(255,77,77,0.15)' : e.callType === 'incoming' ? 'rgba(76,175,80,0.15)' : 'rgba(33,150,243,0.15)',
                        color: e.callType === 'missed' ? '#FF4D4D' : e.callType === 'incoming' ? '#4CAF50' : '#2196F3',
                      }}>
                        {e.callType || 'unknown'}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px' }}>{formatDuration(e.durationSecs)}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{formatDate(e.calledAt)}</td>
                    <td>
                      <span className="admin-badge pink">{e.userId?.name?.split(' ')[0] || e.userId?.role || '—'}</span>
                    </td>
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
                  <th>User</th>
                  <th>Synced At</th>
                  <th>Window</th>
                  <th>Added</th>
                  <th>Updated</th>
                  <th>Pruned</th>
                  <th>Total</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {callLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      No call sync history yet.
                    </td>
                  </tr>
                ) : callLogs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontWeight: 600 }}>{log.userId?.name?.split(' ')[0] || '—'}</td>
                    <td style={{ fontSize: '13px' }}>{formatDate(log.syncedAt)}</td>
                    <td>{log.daysWindow ?? daysWindow}d</td>
                    <td><span className="admin-badge" style={{ background: 'rgba(76,175,80,0.15)', color: '#4CAF50' }}>+{log.summary?.added ?? 0}</span></td>
                    <td><span className="admin-badge" style={{ background: 'rgba(33,150,243,0.15)', color: '#2196F3' }}>{log.summary?.updated ?? 0}</span></td>
                    <td><span className="admin-badge" style={{ background: 'rgba(255,77,77,0.15)', color: '#FF4D4D' }}>-{log.summary?.pruned ?? 0}</span></td>
                    <td>{log.summary?.total ?? 0}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{log.device || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '16px', alignItems: 'center' }}>
            <button type="button" className="admin-btn secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span style={{ fontSize: '13px', color: 'var(--text-sub)', fontWeight: 600 }}>Page {page} of {totalPages}</span>
            <button type="button" className="admin-btn secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsManager;
