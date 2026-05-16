import React, { useMemo, useState } from 'react';

const getPaginationRange = (current, total, delta = 2) => {
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);
  const range = [1];
  if (left > 2) range.push('...');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push('...');
  if (total > 1) range.push(total);
  return range;
};

import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  Search, Download, LayoutList, AlertTriangle,
  CheckCircle2, Shield,
} from 'lucide-react';
import { AdminAuditLogsSkeleton } from '@/skeleton-framework/admin';
import { useLang } from '@/components/i18n/LangContext';
import { format } from 'date-fns';
import '@/styles/equimon-admin.css';

const PAGE_SIZE = 15;

const ACTION_PILL = {
  login_success:   'p-ok',
  login_failed:    'p-bad',
  borrow_created:  'p-info',
  borrow_released: 'p-gold',
  borrow_returned: 'p-ok',
  damage_verified: 'p-warn',
};

const NORMAL_ACTIONS = new Set(['login_success', 'login_failed', 'borrow_created', 'borrow_released', 'borrow_returned']);

const AVATAR_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];
const getAvatarColor = (str) => {
  if (!str) return '#94a3b8';
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const getInitials = (name, email) => {
  if (name) {
    const p = name.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name[0].toUpperCase();
  }
  return email ? email[0].toUpperCase() : '?';
};

const normalizeIp = (v) => {
  if (!v) return '-';
  const ip = String(v).trim();
  if (ip === '::1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip || '-';
};

// ─── Shared button style for pagination ──────────────────────────────────────

const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 28, height: 28, padding: '0 6px', borderRadius: 6,
  border: '1px solid var(--a-rule)', background: 'var(--a-surface)',
  fontSize: 12, color: 'var(--a-ink)', cursor: 'pointer',
};
const btnActive = { ...btnBase, background: 'var(--a-navy)', color: '#fff', borderColor: 'var(--a-navy)' };

function Pager({ page, total, onPage }) {
  if (total <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button style={btnBase} onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>Prev</button>
      {getPaginationRange(page, total).map((item, idx) =>
        item === '...' ? (
          <span key={`e-${idx}`} style={{ padding: '0 4px', fontSize: 12, color: 'var(--a-mute)' }}>…</span>
        ) : (
          <button key={item} style={page === item ? btnActive : btnBase} onClick={() => onPage(item)}>{item}</button>
        )
      )}
      <button style={btnBase} onClick={() => onPage(Math.min(total, page + 1))} disabled={page === total}>Next</button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminAuditLogs() {
  const { t } = useLang();
  const [isExporting, setIsExporting]       = useState(false);
  const [searchInput, setSearchInput]       = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput]     = useState('');
  const [appliedSearch, setAppliedSearch]   = useState('');
  const [appliedStart, setAppliedStart]     = useState('');
  const [appliedEnd, setAppliedEnd]         = useState('');
  const [activeFilter, setActiveFilter]     = useState('all');
  const [currentPage, setCurrentPage]       = useState(1);

  const queryFilters = useMemo(() => {
    const f = { limit: 1000 };
    if (appliedSearch.trim()) f.user = appliedSearch.trim();
    if (appliedStart) f.start_date = appliedStart;
    if (appliedEnd)   f.end_date   = appliedEnd;
    return f;
  }, [appliedSearch, appliedStart, appliedEnd]);

  const { data, isLoading } = useQuery({
    queryKey: ['adminAuditLogs', queryFilters],
    queryFn: () => api.entities.AuditLogs.list(queryFilters),
  });

  const allLogs = data?.data || [];

  const counts = useMemo(() => ({
    all:           allLogs.length,
    login_success: allLogs.filter(l => l.action_type === 'login_success').length,
    login_failed:  allLogs.filter(l => l.action_type === 'login_failed').length,
    sensitive:     allLogs.filter(l => !NORMAL_ACTIONS.has(l.action_type)).length,
  }), [allLogs]);

  const displayedLogs = useMemo(() => {
    if (activeFilter === 'login_success') return allLogs.filter(l => l.action_type === 'login_success');
    if (activeFilter === 'login_failed')  return allLogs.filter(l => l.action_type === 'login_failed');
    if (activeFilter === 'sensitive')     return allLogs.filter(l => !NORMAL_ACTIONS.has(l.action_type));
    return allLogs;
  }, [allLogs, activeFilter]);

  const totalPages    = Math.max(1, Math.ceil(displayedLogs.length / PAGE_SIZE));
  const paginatedLogs = displayedLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleApplyFilter = () => {
    setAppliedSearch(searchInput);
    setAppliedStart(startDateInput);
    setAppliedEnd(endDateInput);
    setCurrentPage(1);
  };

  const handleStatClick = (key) => {
    setActiveFilter(key);
    setCurrentPage(1);
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const blob = await api.entities.AuditLogs.exportPdf({ ...queryFilters, limit: 5000 });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'audit_logs.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || t('failedExportAuditPdf'));
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return <AdminAuditLogsSkeleton />;

  const KPI_TABS = [
    { key: 'all',           label: 'All Logs',         count: counts.all,           Icon: LayoutList   },
    { key: 'login_success', label: 'Login Success',     count: counts.login_success, Icon: CheckCircle2 },
    { key: 'login_failed',  label: 'Login Failed',      count: counts.login_failed,  Icon: AlertTriangle },
    { key: 'sensitive',     label: 'Sensitive Actions', count: counts.sensitive,     Icon: Shield       },
  ];

  return (
    <div className="eq-admin" style={{ paddingBottom: 40 }}>

      {/* ── Title Strip ── */}
      <div className="a-titlestrip">
        <div style={{ flex: 1 }}>
          <div className="a-eyebrow">Security &amp; Compliance · Audit</div>
          <h1>System Audit Trail</h1>
          <p className="a-deck">Review and export comprehensive activity logs for security and compliance.</p>
        </div>
        <div className="a-right">
          <button className="a-btn gold" onClick={handleExportPdf} disabled={isExporting}>
            <Download style={{ width: 14, height: 14 }} />
            {isExporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>

        {/* ── KPI Tab Strip ── */}
        <div className="a-tabs" style={{ marginTop: 20, gridTemplateColumns: `repeat(${KPI_TABS.length}, 1fr)` }}>
          {KPI_TABS.map(({ key, label, count, Icon }) => (
            <button
              key={key}
              type="button"
              className={`a-tab${activeFilter === key ? ' active' : ''}`}
              onClick={() => handleStatClick(key)}
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '12px 20px', minWidth: 130 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon style={{ width: 13, height: 13 }} />
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              </div>
              <span style={{ fontSize: 24, fontFamily: 'var(--serif)', fontWeight: 700, lineHeight: 1, marginTop: 2 }}>
                {count.toLocaleString()}
              </span>
            </button>
          ))}
        </div>

        {/* ── Filter Panel ── */}
        <div className="a-panel" style={{ marginTop: 16 }}>
          <div className="a-filters" style={{ padding: '14px 18px' }}>
            <div className="a-field" style={{ flex: '1 1 220px' }}>
              <label>Search User</label>
              <div className="a-search">
                <Search style={{ width: 14, height: 14 }} />
                <input
                  placeholder="Email or user ID…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                />
              </div>
            </div>
            <div className="a-field">
              <label>From</label>
              <input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} />
            </div>
            <div className="a-field">
              <label>To</label>
              <input type="date" value={endDateInput} onChange={(e) => setEndDateInput(e.target.value)} />
            </div>
            <div className="a-field" style={{ justifyContent: 'flex-end' }}>
              <button className="a-btn primary" onClick={handleApplyFilter}>
                Apply Filter
              </button>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="a-panel" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--a-rule)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>Log Entries</span>
              <span className="a-pill p-mute">{displayedLogs.length.toLocaleString()}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--a-mute)', fontFamily: 'var(--mono)' }}>
              Showing {PAGE_SIZE} per page
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="a-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Entity</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {displayedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 56, color: 'var(--a-mute)', fontSize: 13 }}>
                      {t('noLogsFoundForFilters')}
                    </td>
                  </tr>
                ) : paginatedLogs.map((log) => {
                  const name       = log.user?.name  || log.user_name  || '';
                  const email      = log.user?.email || log.user_email || '';
                  const initials   = getInitials(name, email);
                  const avatarColor = getAvatarColor(email || name);
                  const pillClass  = ACTION_PILL[log.action_type] || 'p-mute';
                  const isSuccess  = log.status === 'success';
                  const d          = new Date(log.createdAt);

                  return (
                    <tr key={log._id}>
                      {/* Timestamp */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', fontFamily: 'var(--mono)' }}>
                          {format(d, 'MMM d, yyyy')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--a-mute)', fontFamily: 'var(--mono)' }}>
                          {format(d, 'HH:mm:ss')}
                        </div>
                      </td>

                      {/* User */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: avatarColor, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff',
                          }}>
                            {initials}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                              {name || 'Unknown'}
                            </div>
                            {email && (
                              <div style={{ fontSize: 11, color: 'var(--a-mute)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{email}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td>
                        <span className={`a-pill ${pillClass}`} style={{ whiteSpace: 'nowrap' }}>
                          {log.action_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: isSuccess ? 'var(--a-ok)' : 'var(--a-warn)' }}>
                          {isSuccess
                            ? <CheckCircle2 style={{ width: 13, height: 13, flexShrink: 0 }} />
                            : <AlertTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />
                          }
                          {isSuccess ? 'Success' : (log.status || 'Failed')}
                        </div>
                      </td>

                      {/* Entity */}
                      <td style={{ fontSize: 12, color: 'var(--a-ink-2)' }}>{log.entity_type || '-'}</td>

                      {/* IP */}
                      <td style={{ fontSize: 12, color: 'var(--a-mute)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                        {normalizeIp(log.ip_address)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {displayedLogs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--a-rule)' }}>
              <span style={{ fontSize: 12, color: 'var(--a-mute)' }}>
                Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, displayedLogs.length)}–{Math.min(currentPage * PAGE_SIZE, displayedLogs.length)} of {displayedLogs.length.toLocaleString()} entries
              </span>
              <Pager page={currentPage} total={totalPages} onPage={setCurrentPage} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
