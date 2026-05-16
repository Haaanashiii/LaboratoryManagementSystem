import React, { useEffect, useMemo, useState } from 'react';

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
import { ReportsSkeleton } from '@/skeleton-framework/admin';
import {
  FileSpreadsheet, FileText, RefreshCw,
  ChevronLeft, ChevronRight, Search,
  ChevronDown, ChevronUp, CalendarDays,
  ClipboardList, PackagePlus, Users,
} from 'lucide-react';
import { format, endOfWeek, parseISO } from 'date-fns';
import { api } from '@/api/apiClient';
import { useLang } from '@/components/i18n/LangContext';
import { useAuth } from '@/components/hooks/useAuth.js';
import {
  printFullReleaseReport,
  printWeeklySummaryReport,
  printInventoryChangesReport,
  printBorrowRequestsReport,
} from '@/utils/printEquimonReport';
import '@/styles/equimon-admin.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const REPORT_TYPE_KEYS = [
  { labelKey: 'weekly',  value: 'weekly'  },
  { labelKey: 'monthly', value: 'monthly' },
];

const PAGE_SIZE = 12;
const GROUP_PAGE_SIZE = 5;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const toCsvCell = (value) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const dateTag = () => new Date().toISOString().slice(0, 10);

const STATUS_COLORS = {
  pending:          { labelKey: 'pending' },
  pending_lecturer: { labelKey: 'pendingLecturer' },
  pending_head:     { labelKey: 'pendingHeadApproval' },
  head_approved:    { labelKey: 'headapproved' },
  approved:         { labelKey: 'approved' },
  ready_pickup:     { labelKey: 'readyPickup' },
  borrowed:         { labelKey: 'borrowed' },
  returned:         { labelKey: 'returned' },
  rejected:         { labelKey: 'rejected' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function statusPillClass(status) {
  switch (status) {
    case 'returned':
    case 'approved':     return 'p-ok';
    case 'pending':
    case 'pending_lecturer':
    case 'pending_head': return 'p-warn';
    case 'rejected':     return 'p-bad';
    case 'borrowed':
    case 'ready_pickup': return 'p-info';
    case 'head_approved':return 'p-gold';
    default:             return 'p-mute';
  }
}

function StatusBadge({ status }) {
  const { t } = useLang();
  return (
    <span className={`a-pill ${statusPillClass(status)}`}>
      {STATUS_COLORS[status]?.labelKey ? t(STATUS_COLORS[status].labelKey) : (status?.replace(/_/g, ' ') || status)}
    </span>
  );
}

function LecturerGroupRow({ group, isExpanded, onToggle, t }) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer', background: 'rgba(15,42,74,0.04)' }}>
        <td colSpan={2} style={{ padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isExpanded
              ? <ChevronUp style={{ width: 14, height: 14, color: 'var(--a-mute)', flexShrink: 0 }} />
              : <ChevronDown style={{ width: 14, height: 14, color: 'var(--a-mute)', flexShrink: 0 }} />}
            <span style={{ fontFamily: 'var(--serif)', fontWeight: 600, color: 'var(--a-navy)' }}>{group.lecturerName}</span>
            {group.lecturerEmail && (
              <span style={{ fontSize: 11, color: 'var(--a-mute)' }}>({group.lecturerEmail})</span>
            )}
          </div>
        </td>
        <td style={{ fontSize: 12, color: 'var(--a-ink-2)' }}>{group.lecturerEmail || '—'}</td>
        <td />
        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--a-navy)' }}>{group.totalReleased}</td>
        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--a-ok)' }}>{group.totalQuantity}</td>
        <td />
        <td />
      </tr>
      {isExpanded && group.releases.map((rec, idx) => (
        <tr key={idx}>
          <td style={{ paddingLeft: 40, color: 'var(--a-mute)', fontSize: 12 }}>#{idx + 1}</td>
          <td>
            <span style={{ fontWeight: 500, color: 'var(--a-ink)' }}>{rec.studentName}</span>
            {rec.studentId && (
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--a-mute)' }}>({rec.studentId})</span>
            )}
          </td>
          <td style={{ fontSize: 12, color: 'var(--a-ink-2)' }}>{rec.studentEmail || '—'}</td>
          <td style={{ color: 'var(--a-ink)' }}>{rec.equipmentName}</td>
          <td style={{ textAlign: 'center' }}>{rec.quantity}</td>
          <td />
          <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--a-ink-2)' }}>{formatDateTime(rec.releasedAt)}</td>
          <td>
            <span className={`a-pill ${statusPillClass(rec.status)}`}>
              {STATUS_COLORS[rec.status]?.labelKey ? t(STATUS_COLORS[rec.status].labelKey) : (rec.status?.replace(/_/g, ' ') || '—')}
            </span>
          </td>
        </tr>
      ))}
    </>
  );
}

function inventoryActionPill(action) {
  switch (action) {
    case 'added':            return 'p-ok';
    case 'deleted':          return 'p-bad';
    case 'quantity_changed': return 'p-warn';
    case 'published':        return 'p-info';
    case 'unpublished':      return 'p-mute';
    default:                 return 'p-mute';
  }
}

function inventoryActionLabel(action) {
  switch (action) {
    case 'added':            return 'Added';
    case 'deleted':          return 'Deleted';
    case 'quantity_changed': return 'Qty Changed';
    case 'published':        return 'Published';
    case 'unpublished':      return 'Unpublished';
    default:                 return action || '—';
  }
}

function inventoryDetails(record) {
  if (record.action === 'added')            return `Initial qty: ${record.newQuantity ?? '—'}`;
  if (record.action === 'deleted')          return `Had qty: ${record.previousQuantity ?? '—'}`;
  if (record.action === 'quantity_changed') return `${record.previousQuantity ?? '—'} → ${record.newQuantity ?? '—'}`;
  if (record.action === 'published')        return 'Visible to students';
  if (record.action === 'unpublished')      return 'Hidden from students';
  return '—';
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function exportCsvAll(records, startDate, endDate) {
  const headers = [
    'Lecturer Name', 'Lecturer Email',
    'Student Name', 'Student ID', 'Student Email',
    'Equipment Name', 'Category', 'Quantity',
    'Borrow Date', 'Return Date', 'Released At', 'Status',
  ];
  const rows = records.map((r) => [
    r.lecturerName, r.lecturerEmail,
    r.studentName, r.studentId, r.studentEmail,
    r.equipmentName, r.equipmentCategory, r.quantity,
    formatDate(r.borrowDate), formatDate(r.returnDate),
    formatDateTime(r.releasedAt), r.status,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `lecturer-releases-${dateTag()}.csv`);
}

function exportCsvWeekly(weeklySummary) {
  const headers = ['Week Start', 'Total Releases', 'Total Quantity', 'Lecturer', 'Lecturer Releases', 'Lecturer Quantity'];
  const rows = [];
  weeklySummary.forEach((wk) => {
    const lecturers = Object.values(wk.byLecturer);
    if (lecturers.length === 0) {
      rows.push([wk.weekStart, wk.totalReleased, wk.totalQuantity, '', '', '']);
    } else {
      lecturers.forEach((l, i) => {
        rows.push([
          i === 0 ? wk.weekStart     : '',
          i === 0 ? wk.totalReleased : '',
          i === 0 ? wk.totalQuantity : '',
          l.lecturerName, l.totalReleased, l.totalQuantity,
        ]);
      });
    }
  });
  const csv = [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `weekly-lecturer-summary-${dateTag()}.csv`);
}

function exportCsvInventory(records) {
  const headers = ['Date & Time', 'Equipment', 'Category', 'Action', 'Details', 'Done By'];
  const rows = records.map((r) => [
    formatDateTime(r.createdAt), r.equipmentName, r.category,
    inventoryActionLabel(r.action), inventoryDetails(r), r.performedByName,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `inventory-changes-${dateTag()}.csv`);
}

// ─── Pager ────────────────────────────────────────────────────────────────────

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
      <button style={btnBase} onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>
        <ChevronLeft style={{ width: 13, height: 13 }} />
      </button>
      {getPaginationRange(page, total).map((item, idx) =>
        item === '...' ? (
          <span key={`e-${idx}`} style={{ padding: '0 4px', fontSize: 12, color: 'var(--a-mute)' }}>…</span>
        ) : (
          <button key={item} style={page === item ? btnActive : btnBase} onClick={() => onPage(item)}>
            {item}
          </button>
        )
      )}
      <button style={btnBase} onClick={() => onPage(Math.min(total, page + 1))} disabled={page === total}>
        <ChevronRight style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
}

// ─── Filter chip button ───────────────────────────────────────────────────────

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        fontFamily: 'var(--mono)', cursor: 'pointer', transition: 'all .15s',
        border: `1px solid ${active ? 'var(--a-gold)' : 'var(--a-rule)'}`,
        background: active ? 'rgba(200,162,70,0.12)' : 'transparent',
        color: active ? 'var(--a-gold)' : 'var(--a-mute)',
      }}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Reports() {
  const { t } = useLang();
  const { user } = useAuth();

  const [activeTab, setActiveTab]               = useState('lecturer');
  const [type, setType]                         = useState('monthly');
  const [startDate, setStartDate]               = useState('');
  const [endDate, setEndDate]                   = useState('');
  const [lecturerFilter, setLecturerFilter]     = useState('');
  const [search, setSearch]                     = useState('');
  const [currentPage, setCurrentPage]           = useState(1);
  const [weekPage, setWeekPage]                 = useState(1);
  const [expandedLecturers, setExpandedLecturers] = useState({});
  const [borrowSearch, setBorrowSearch]         = useState('');
  const [borrowStatusFilter, setBorrowStatusFilter] = useState('');
  const [borrowPage, setBorrowPage]             = useState(1);
  const [inventoryPage, setInventoryPage]       = useState(1);
  const [inventoryActionFilter, setInventoryActionFilter] = useState('');

  const {
    data: reportData,
    isLoading: loading,
    isFetching,
    error: reportError,
    refetch: loadReports,
  } = useQuery({
    queryKey: ['lecturerReleases', type, startDate, endDate, lecturerFilter],
    queryFn: async () => {
      const filters = { type };
      if (startDate)      filters.startDate   = startDate;
      if (endDate)        filters.endDate     = endDate;
      if (lecturerFilter) filters.lecturerId  = lecturerFilter;
      const reportsApi = api?.entities?.Reports;
      if (!reportsApi?.lecturerReleases) throw new Error('Reports API is not available.');
      return reportsApi.lecturerReleases(filters);
    },
    refetchOnWindowFocus: false,
  });

  const summary        = reportData?.summary        ?? { totalReleases: 0, totalQuantity: 0, totalLecturers: 0 };
  const lecturerGroups = reportData?.lecturerGroups ?? [];
  const weeklySummary  = reportData?.weeklySummary  ?? [];
  const allRecords     = reportData?.records        ?? [];
  const error          = reportError?.message       ?? '';

  useEffect(() => { setCurrentPage(1); }, [type, startDate, endDate, lecturerFilter]);
  useEffect(() => {
    if (lecturerGroups.length > 0) {
      setExpandedLecturers(
        Object.fromEntries(lecturerGroups.map((g) => [g.lecturerId || g.lecturerName, false]))
      );
    }
  }, [lecturerGroups]);

  const { data: borrowRequests = [], isLoading: borrowLoading } = useQuery({
    queryKey: ['adminBorrowRequests'],
    queryFn: () => api.entities.BorrowRequest.list(),
  });

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['equipmentChanges', type, startDate, endDate, inventoryActionFilter],
    queryFn: () =>
      api.entities.Reports.equipmentChanges({
        type,
        ...(startDate && { startDate }),
        ...(endDate   && { endDate }),
        ...(inventoryActionFilter && { action: inventoryActionFilter }),
      }),
    refetchOnWindowFocus: false,
  });

  const inventorySummary = inventoryData?.summary ?? { totalAdded: 0, totalDeleted: 0, totalQuantityChanges: 0, totalPublished: 0, totalUnpublished: 0 };
  const inventoryRecords = inventoryData?.records ?? [];

  const lecturerOptions = useMemo(() => {
    const seen = new Set();
    return lecturerGroups
      .filter((g) => { const k = g.lecturerId || g.lecturerName; if (seen.has(k)) return false; seen.add(k); return true; })
      .map((g) => ({ id: g.lecturerId, name: g.lecturerName }));
  }, [lecturerGroups]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return lecturerGroups;
    const q = search.trim().toLowerCase();
    return lecturerGroups
      .map((g) => ({
        ...g,
        releases: g.releases.filter((r) =>
          (r.lecturerName  || '').toLowerCase().includes(q) ||
          (r.studentName   || '').toLowerCase().includes(q) ||
          (r.studentId     || '').toLowerCase().includes(q) ||
          (r.equipmentName || '').toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.releases.length > 0 || (g.lecturerName || '').toLowerCase().includes(q));
  }, [lecturerGroups, search]);

  const toggleLecturerExpand = (key) =>
    setExpandedLecturers((prev) => ({ ...prev, [key]: !prev[key] }));

  const filteredBorrowRequests = useMemo(() => {
    let list = borrowRequests;
    if (borrowStatusFilter) list = list.filter((r) => r.status === borrowStatusFilter);
    if (borrowSearch.trim()) {
      const q = borrowSearch.trim().toLowerCase();
      list = list.filter((r) =>
        (r.borrower_name      || '').toLowerCase().includes(q) ||
        (r.student_id         || '').toLowerCase().includes(q) ||
        (r.equipment?.name    || '').toLowerCase().includes(q) ||
        (r.status             || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [borrowRequests, borrowStatusFilter, borrowSearch]);

  const totalBorrowPages        = Math.max(1, Math.ceil(filteredBorrowRequests.length / PAGE_SIZE));
  const paginatedBorrowRequests = filteredBorrowRequests.slice((borrowPage - 1) * PAGE_SIZE, borrowPage * PAGE_SIZE);

  const totalInventoryPages       = Math.max(1, Math.ceil(inventoryRecords.length / PAGE_SIZE));
  const paginatedInventoryRecords = inventoryRecords.slice((inventoryPage - 1) * PAGE_SIZE, inventoryPage * PAGE_SIZE);

  const totalGroupPages = Math.max(1, Math.ceil(filteredGroups.length / GROUP_PAGE_SIZE));
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * GROUP_PAGE_SIZE, currentPage * GROUP_PAGE_SIZE);

  const totalWeekPages = Math.max(1, Math.ceil(weeklySummary.length / PAGE_SIZE));
  const paginatedWeeks = weeklySummary.slice((weekPage - 1) * PAGE_SIZE, weekPage * PAGE_SIZE);

  if (loading) return <ReportsSkeleton />;

  const TABS = [
    { key: 'lecturer',  label: t('groupedByLecturer'), icon: <Users style={{ width: 14, height: 14 }} /> },
    { key: 'weekly',    label: t('weeklySummaryTab'),  icon: <CalendarDays style={{ width: 14, height: 14 }} /> },
    { key: 'borrow',    label: t('allBorrowRequests'), icon: <ClipboardList style={{ width: 14, height: 14 }} /> },
    { key: 'inventory', label: 'Inventory Changes',    icon: <PackagePlus style={{ width: 14, height: 14 }} /> },
  ];

  const statCards = activeTab === 'inventory'
    ? [
        { label: 'Items Added',    value: inventorySummary.totalAdded },
        { label: 'Items Deleted',  value: inventorySummary.totalDeleted },
        { label: 'Qty Changes',    value: inventorySummary.totalQuantityChanges },
        { label: 'Published',      value: inventorySummary.totalPublished },
        { label: 'Unpublished',    value: inventorySummary.totalUnpublished },
      ]
    : [
        { label: t('totalReleases'),     value: summary.totalReleases },
        { label: t('totalQtyReleased'),  value: summary.totalQuantity },
        { label: t('lecturersInvolved'), value: summary.totalLecturers },
      ];

  return (
    <div className="eq-admin" style={{ paddingBottom: 40 }}>

      {/* ── Title Strip ── */}
      <div className="a-titlestrip">
        <div style={{ flex: 1 }}>
          <div className="a-eyebrow">Inventory &amp; Lending · Reports</div>
          <h1>{t('equipmentReleaseReports')}</h1>
          <p className="a-deck">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="a-right">
          <button className="a-btn" onClick={() => loadReports()} disabled={isFetching}>
            <RefreshCw style={{ width: 13, height: 13 }} />
            {t('refresh')}
          </button>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>

        {/* ── Stat Cards ── */}
        <div className="a-cards" style={{ marginTop: 20 }}>
          {statCards.map((c) => (
            <div key={c.label} className="a-card gold-edge">
              <div style={{ fontSize: 11, color: 'var(--a-mute)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--mono)', marginBottom: 6 }}>
                {c.label}
              </div>
              <div style={{ fontSize: 30, fontFamily: 'var(--serif)', fontWeight: 700, color: 'var(--a-navy)', lineHeight: 1 }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="a-panel" style={{ marginTop: 16 }}>
          <div className="a-filters">
            <div className="a-field">
              <label>{t('reportPeriod')}</label>
              <div className="a-seg">
                {REPORT_TYPE_KEYS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setType(opt.value); setCurrentPage(1); }}
                    className={`s${type === opt.value ? ' on' : ''}`}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="a-field">
              <label>{t('startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }} />
            </div>

            <div className="a-field">
              <label>{t('endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }} />
            </div>

            <div className="a-field">
              <label>{t('lecturer')}</label>
              <select value={lecturerFilter} onChange={(e) => { setLecturerFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">{t('allLecturers')}</option>
                {lecturerOptions.map((l) => (
                  <option key={l.id || l.name} value={l.id || ''}>{l.name}</option>
                ))}
              </select>
            </div>

            {(startDate || endDate || lecturerFilter) && (
              <div className="a-field" style={{ justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  style={{ ...btnBase, fontSize: 12 }}
                  onClick={() => { setStartDate(''); setEndDate(''); setLecturerFilter(''); setCurrentPage(1); }}
                >
                  {t('clearFilters')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Export Section ── */}
        <div className="a-panel" style={{ marginTop: 16 }}>
          <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--a-rule)' }}>
            <span style={{ fontFamily: 'var(--serif)', fontWeight: 600, color: 'var(--a-navy)', fontSize: 14 }}>{t('exportReports')}</span>
            <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--a-mute)' }}>{t('exportReportsDesc')}</span>
          </div>
          <div className="a-export">
            <div className="e focus">
              <div className="e-title">{t('fullReleaseReport')}</div>
              <div className="e-desc">{t('fullReleaseReportDesc')}</div>
              <div className="e-actions">
                <button className="a-btn gold" onClick={() => printFullReleaseReport(allRecords, summary, { startDate, endDate, lecturerFilter }, user)} disabled={isFetching || allRecords.length === 0}>
                  <FileText style={{ width: 13, height: 13 }} /> PDF
                </button>
                <button className="a-btn" onClick={() => exportCsvAll(allRecords, startDate, endDate)} disabled={isFetching || allRecords.length === 0}>
                  <FileSpreadsheet style={{ width: 13, height: 13 }} /> CSV
                </button>
              </div>
            </div>

            <div className="e">
              <div className="e-title">{t('weeklySummaryTab')}</div>
              <div className="e-desc">{t('weeklySummaryTabDesc')}</div>
              <div className="e-actions">
                <button className="a-btn gold" onClick={() => printWeeklySummaryReport(weeklySummary, summary, { startDate, endDate }, user)} disabled={isFetching || weeklySummary.length === 0}>
                  <FileText style={{ width: 13, height: 13 }} /> PDF
                </button>
                <button className="a-btn" onClick={() => exportCsvWeekly(weeklySummary)} disabled={isFetching || weeklySummary.length === 0}>
                  <FileSpreadsheet style={{ width: 13, height: 13 }} /> CSV
                </button>
              </div>
            </div>

            <div className="e">
              <div className="e-title">Inventory Changes Report</div>
              <div className="e-desc">All equipment additions, deletions, quantity changes, and publish/unpublish actions.</div>
              <div className="e-actions">
                <button className="a-btn gold" onClick={() => printInventoryChangesReport(inventoryRecords, inventorySummary, { startDate, endDate }, user)} disabled={inventoryLoading || inventoryRecords.length === 0}>
                  <FileText style={{ width: 13, height: 13 }} /> PDF
                </button>
                <button className="a-btn" onClick={() => exportCsvInventory(inventoryRecords)} disabled={inventoryLoading || inventoryRecords.length === 0}>
                  <FileSpreadsheet style={{ width: 13, height: 13 }} /> CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Switcher ── */}
        <div className="a-subnav" style={{ marginTop: 20 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`s${activeTab === tab.key ? ' on' : ''}`}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === 'lecturer')  setCurrentPage(1);
                if (tab.key === 'weekly')    setWeekPage(1);
                if (tab.key === 'borrow')    setBorrowPage(1);
                if (tab.key === 'inventory') setInventoryPage(1);
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="a-panel" style={{ marginTop: 12, padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--a-bad)', fontWeight: 600, marginBottom: 4 }}>{t('failedLoadRecords')}</p>
            <p style={{ fontSize: 13, color: 'var(--a-mute)' }}>{error}</p>
          </div>
        )}

        {/* ═══ TAB: LECTURER GROUPED ═══ */}
        {!error && activeTab === 'lecturer' && (
          <div className="a-panel" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--a-rule)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{t('releaseRecords')}</span>
                <span className="a-pill p-mute">{filteredGroups.reduce((s, g) => s + g.releases.length, 0)}</span>
              </div>
              <div className="a-search" style={{ width: 240 }}>
                <Search style={{ width: 14, height: 14 }} />
                <input
                  placeholder={t('searchLecturerStudentItem')}
                  value={search}
                  onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="a-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('studentOrLecturer')}</th>
                    <th>{t('email')}</th>
                    <th>{t('equipment')}</th>
                    <th style={{ textAlign: 'center' }}>{t('releases')}</th>
                    <th style={{ textAlign: 'center' }}>{t('totalUnits')}</th>
                    <th>{t('releasedBy')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 56, color: 'var(--a-mute)', fontSize: 13 }}>
                        {t('noReleaseRecordsFound')}
                      </td>
                    </tr>
                  ) : paginatedGroups.map((group) => {
                    const key = group.lecturerId || group.lecturerName;
                    return (
                      <LecturerGroupRow
                        key={key}
                        group={group}
                        isExpanded={!!expandedLecturers[key]}
                        onToggle={() => toggleLecturerExpand(key)}
                        t={t}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalGroupPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--a-rule)' }}>
                <span style={{ fontSize: 12, color: 'var(--a-mute)' }}>
                  {t('showing')} {(currentPage - 1) * GROUP_PAGE_SIZE + 1}–{Math.min(currentPage * GROUP_PAGE_SIZE, filteredGroups.length)} {t('ofLabel')} {filteredGroups.length}
                </span>
                <Pager page={currentPage} total={totalGroupPages} onPage={setCurrentPage} />
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: WEEKLY SUMMARY ═══ */}
        {!error && activeTab === 'weekly' && (
          <div className="a-panel" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--a-rule)' }}>
              <CalendarDays style={{ width: 15, height: 15, color: 'var(--a-gold)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{t('weeklySummaryTab')}</span>
              <span className="a-pill p-mute">{weeklySummary.length} week{weeklySummary.length !== 1 ? 's' : ''}</span>
            </div>

            {weeklySummary.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 56, fontSize: 13, color: 'var(--a-mute)' }}>{t('noWeeklyData')}</div>
            ) : (
              <>
                {paginatedWeeks.map((wk) => {
                  const weekStartFmt = (() => { try { return format(parseISO(wk.weekStart), 'MMM d, yyyy'); } catch { return wk.weekStart; } })();
                  const weekEnd      = (() => { try { return format(endOfWeek(parseISO(wk.weekStart), { weekStartsOn: 1 }), 'MMM d'); } catch { return ''; } })();
                  return (
                    <div key={wk.weekStart} style={{ padding: 16, borderBottom: '1px solid var(--a-hair)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span className="a-pill p-gold" style={{ fontSize: 12 }}>
                          {weekStartFmt}{weekEnd ? ` – ${weekEnd}` : ''}
                        </span>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--a-mute)' }}>
                          <span><strong style={{ color: 'var(--a-navy)' }}>{wk.totalReleased}</strong> {t('releases').toLowerCase()}</span>
                          <span><strong style={{ color: 'var(--a-navy)' }}>{wk.totalQuantity}</strong> {t('qty').toLowerCase()}</span>
                        </div>
                      </div>
                      <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid var(--a-rule)' }}>
                        <table className="a-table" style={{ fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th style={{ width: '60%' }}>{t('lecturer')}</th>
                              <th style={{ textAlign: 'right' }}>{t('releases')}</th>
                              <th style={{ textAlign: 'right' }}>{t('totalUnits')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(wk.byLecturer).map((l, i) => (
                              <tr key={i}>
                                <td style={{ fontFamily: 'var(--serif)', fontWeight: 600, color: 'var(--a-navy)' }}>{l.lecturerName}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.totalReleased}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.totalQuantity}</td>
                              </tr>
                            ))}
                            <tr style={{ background: 'rgba(15,42,74,0.04)' }}>
                              <td style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-ink-2)' }}>{t('weekTotal')}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--a-navy)' }}>{wk.totalReleased}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--a-navy)' }}>{wk.totalQuantity}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
                {totalWeekPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--a-rule)' }}>
                    <span style={{ fontSize: 12, color: 'var(--a-mute)' }}>
                      Showing {(weekPage - 1) * PAGE_SIZE + 1}–{Math.min(weekPage * PAGE_SIZE, weeklySummary.length)} of {weeklySummary.length} week{weeklySummary.length !== 1 ? 's' : ''}
                    </span>
                    <Pager page={weekPage} total={totalWeekPages} onPage={setWeekPage} />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ TAB: BORROW REQUESTS ═══ */}
        {activeTab === 'borrow' && (
          <div className="a-panel" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--a-rule)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{t('allBorrowRequests')}</span>
                <span className="a-pill p-mute">{filteredBorrowRequests.length}</span>
                {['', 'pending', 'approved', 'rejected', 'borrowed', 'returned'].map((s) => (
                  <Chip key={s} active={borrowStatusFilter === s} onClick={() => { setBorrowStatusFilter(s); setBorrowPage(1); }}>
                    {s === '' ? 'All' : STATUS_COLORS[s]?.labelKey || s}
                  </Chip>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="a-search" style={{ width: 220 }}>
                  <Search style={{ width: 14, height: 14 }} />
                  <input placeholder={t('searchBorrowerEquipment')} value={borrowSearch} onChange={(e) => { setBorrowPage(1); setBorrowSearch(e.target.value); }} />
                </div>
                <button
                  className="a-btn"
                  onClick={() => {
                    const headers = ['Borrower', 'Student ID', 'Equipment', 'Serial No.', 'Borrow Date', 'Return Date', 'Status', 'Submitted'];
                    const rows = filteredBorrowRequests.map((r) => [
                      r.borrower_name || '—', r.student_id || '—', r.equipment?.name || '—', r.serial_number || '—',
                      formatDate(r.borrow_date), formatDate(r.return_date), STATUS_COLORS[r.status]?.labelKey || r.status, formatDate(r.createdAt),
                    ]);
                    const csv = [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
                    triggerDownload(new Blob([csv], { type: 'text/csv' }), `borrow-requests-${dateTag()}.csv`);
                  }}
                  disabled={filteredBorrowRequests.length === 0}
                >
                  <FileSpreadsheet style={{ width: 13, height: 13 }} /> CSV
                </button>
                <button className="a-btn gold" onClick={() => printBorrowRequestsReport(filteredBorrowRequests, user)} disabled={filteredBorrowRequests.length === 0}>
                  <FileText style={{ width: 13, height: 13 }} /> PDF
                </button>
              </div>
            </div>

            {borrowLoading ? (
              <div style={{ textAlign: 'center', padding: 64, fontSize: 13, color: 'var(--a-mute)' }}>{t('loadingBorrowRequests')}</div>
            ) : paginatedBorrowRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 64, fontSize: 13, color: 'var(--a-mute)' }}>{t('noBorrowRequestsFound')}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>{t('borrower')}</th>
                      <th>{t('studentId')}</th>
                      <th>{t('equipment')}</th>
                      <th>{t('serialNo')}</th>
                      <th>{t('borrowDate')}</th>
                      <th>{t('returnDate')}</th>
                      <th>{t('status')}</th>
                      <th>{t('submitted')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBorrowRequests.map((r) => (
                      <tr key={r._id || r.id}>
                        <td style={{ fontWeight: 500, color: 'var(--a-ink)' }}>{r.borrower_name || '—'}</td>
                        <td style={{ color: 'var(--a-ink-2)' }}>{r.student_id || '—'}</td>
                        <td style={{ color: 'var(--a-ink-2)' }}>{r.equipment?.name || '—'}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--a-mute)' }}>{r.serial_number || '—'}</td>
                        <td style={{ fontSize: 12 }}>{formatDate(r.borrow_date)}</td>
                        <td style={{ fontSize: 12 }}>{formatDate(r.return_date)}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td style={{ fontSize: 12, color: 'var(--a-mute)' }}>{formatDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalBorrowPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px', borderTop: '1px solid var(--a-rule)' }}>
                <Pager page={borrowPage} total={totalBorrowPages} onPage={setBorrowPage} />
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: INVENTORY CHANGES ═══ */}
        {activeTab === 'inventory' && (
          <div className="a-panel" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--a-rule)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <PackagePlus style={{ width: 15, height: 15, color: 'var(--a-gold)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>Inventory Changes</span>
                <span className="a-pill p-mute">{inventoryRecords.length}</span>
                {[
                  { value: '', label: 'All' },
                  { value: 'added', label: 'Added' },
                  { value: 'deleted', label: 'Deleted' },
                  { value: 'quantity_changed', label: 'Qty Changed' },
                  { value: 'published', label: 'Published' },
                  { value: 'unpublished', label: 'Unpublished' },
                ].map((opt) => (
                  <Chip key={opt.value} active={inventoryActionFilter === opt.value} onClick={() => { setInventoryActionFilter(opt.value); setInventoryPage(1); }}>
                    {opt.label}
                  </Chip>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="a-btn" onClick={() => exportCsvInventory(inventoryRecords)} disabled={inventoryRecords.length === 0}>
                  <FileSpreadsheet style={{ width: 13, height: 13 }} /> CSV
                </button>
                <button className="a-btn gold" onClick={() => printInventoryChangesReport(inventoryRecords, inventorySummary, { startDate, endDate }, user)} disabled={inventoryRecords.length === 0}>
                  <FileText style={{ width: 13, height: 13 }} /> PDF
                </button>
              </div>
            </div>

            {inventoryLoading ? (
              <div style={{ textAlign: 'center', padding: 64, fontSize: 13, color: 'var(--a-mute)' }}>Loading…</div>
            ) : paginatedInventoryRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 64, fontSize: 13, color: 'var(--a-mute)' }}>No inventory changes found for this period.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date &amp; Time</th>
                      <th>Equipment</th>
                      <th>Category</th>
                      <th>Action</th>
                      <th>Details</th>
                      <th>Done By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInventoryRecords.map((r, idx) => (
                      <tr key={r._id || idx}>
                        <td style={{ color: 'var(--a-mute)', fontSize: 12 }}>{(inventoryPage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--a-ink-2)' }}>{formatDateTime(r.createdAt)}</td>
                        <td style={{ fontWeight: 500, color: 'var(--a-ink)' }}>{r.equipmentName || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--a-mute)' }}>{r.category || '—'}</td>
                        <td><span className={`a-pill ${inventoryActionPill(r.action)}`}>{inventoryActionLabel(r.action)}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--a-ink-2)' }}>{inventoryDetails(r)}</td>
                        <td style={{ fontSize: 12, color: 'var(--a-mute)' }}>{r.performedByName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalInventoryPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px', borderTop: '1px solid var(--a-rule)' }}>
                <Pager page={inventoryPage} total={totalInventoryPages} onPage={setInventoryPage} />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
