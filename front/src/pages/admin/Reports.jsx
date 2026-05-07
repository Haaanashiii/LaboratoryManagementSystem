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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  FileSpreadsheet, FileText, BarChart3, RefreshCw,
  ChevronLeft, ChevronRight, Search, Users, Package,
  ChevronDown, ChevronUp, CalendarDays, Layers, ClipboardList,
  PackagePlus,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { api } from '@/api/apiClient';
import { useLang } from '@/components/i18n/LangContext';

// ─── Constants ───────────────────────────────────────────────────────────────

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
  pending:          { bg: '#fef9c3', color: '#854d0e', labelKey: 'pending' },
  pending_lecturer: { bg: '#fef9c3', color: '#854d0e', labelKey: 'pendingLecturer' },
  pending_head:     { bg: '#fef9c3', color: '#854d0e', labelKey: 'pendingHeadApproval' },
  head_approved:    { bg: '#dcfce7', color: '#166534', labelKey: 'headapproved' },
  approved:         { bg: '#dcfce7', color: '#166534', labelKey: 'approved' },
  ready_pickup:     { bg: '#dbeafe', color: '#1e40af', labelKey: 'readyPickup' },
  borrowed:         { bg: '#ede9fe', color: '#5b21b6', labelKey: 'borrowed' },
  returned:         { bg: '#f0fdf4', color: '#15803d', labelKey: 'returned' },
  rejected:         { bg: '#fee2e2', color: '#991b1b', labelKey: 'rejected' },
};

function StatusBadge({ status }) {
  const { t } = useLang();
  const s = STATUS_COLORS[status] || { bg: '#f1f5f9', color: '#475569' };
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {s.labelKey ? t(s.labelKey) : (status?.replace(/_/g, ' ') || status)}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-3"
      style={{ borderColor: accent + '33', backgroundColor: accent + '0d' }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: accent + '1a' }}>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold leading-tight tabular-nums text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function LecturerGroupRow({ group, isExpanded, onToggle, t }) {
  return (
    <>
      <TableRow
        className="cursor-pointer border-slate-100 bg-slate-50/80 hover:bg-slate-100/60"
        onClick={onToggle}
      >
        <TableCell colSpan={2} className="py-2.5 pl-4">
          <div className="flex items-center gap-2">
            {isExpanded
              ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
              : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
            <span className="text-sm font-semibold text-slate-800">{group.lecturerName}</span>
            {group.lecturerEmail && (
              <span className="hidden text-xs text-slate-400 sm:inline">({group.lecturerEmail})</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-xs text-slate-500">{group.lecturerEmail || '—'}</TableCell>
        <TableCell />
        <TableCell className="text-center text-sm font-semibold text-blue-700">
          {group.totalReleased}
        </TableCell>
        <TableCell className="text-center text-sm font-semibold text-emerald-700">
          {group.totalQuantity}
        </TableCell>
        <TableCell />
        <TableCell />
      </TableRow>
      {isExpanded && group.releases.map((rec, idx) => (
        <TableRow key={idx} className="border-slate-50 bg-white hover:bg-slate-50/50">
          <TableCell className="pl-10 text-xs text-slate-400">#{idx + 1}</TableCell>
          <TableCell className="text-sm font-medium text-slate-900">
            {rec.studentName}
            {rec.studentId && <span className="ml-1.5 text-xs text-slate-400">({rec.studentId})</span>}
          </TableCell>
          <TableCell className="text-xs text-slate-500">{rec.studentEmail || '—'}</TableCell>
          <TableCell className="text-sm text-slate-800">{rec.equipmentName}</TableCell>
          <TableCell className="text-center text-sm text-slate-700">{rec.quantity}</TableCell>
          <TableCell />
          <TableCell className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(rec.releasedAt)}</TableCell>
          <TableCell>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(rec.status)}`}>
              {STATUS_COLORS[rec.status] ? t(STATUS_COLORS[rec.status].labelKey) : (rec.status?.replace(/_/g, ' ') || '—')}
            </span>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function statusBadge(status) {
  switch (status) {
    case 'borrowed':     return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'returned':     return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'ready_pickup': return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'head_approved':return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    default:             return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function inventoryActionBadge(action) {
  switch (action) {
    case 'added':            return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'deleted':          return 'border-red-200 bg-red-50 text-red-700';
    case 'quantity_changed': return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'published':        return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'unpublished':      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:                 return 'border-slate-200 bg-slate-50 text-slate-600';
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

// ─── Export helpers ───────────────────────────────────────────────────────────

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
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    `lecturer-releases-${dateTag()}.csv`
  );
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
          i === 0 ? wk.weekStart      : '',
          i === 0 ? wk.totalReleased  : '',
          i === 0 ? wk.totalQuantity  : '',
          l.lecturerName, l.totalReleased, l.totalQuantity,
        ]);
      });
    }
  });
  const csv = [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    `weekly-lecturer-summary-${dateTag()}.csv`
  );
}

function exportPdfAll(records, summary, startDate, endDate) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const range = `${startDate || 'Default Start'} – ${endDate || 'Today'}`;

  doc.setFontSize(16);
  doc.text('Equipment Release Report – By Lecturer', 14, 16);
  doc.setFontSize(10);
  doc.text(`Date Range: ${range}`, 14, 24);
  doc.text(`Total Releases: ${summary.totalReleases}   Total Quantity: ${summary.totalQuantity}   Lecturers: ${summary.totalLecturers}`, 14, 31);

  autoTable(doc, {
    startY: 36,
    head: [[
      'Lecturer', 'Student', 'Student ID',
      'Equipment', 'Qty', 'Released At', 'Status',
    ]],
    body: records.map((r) => [
      r.lecturerName,
      r.studentName,
      r.studentId || '—',
      r.equipmentName,
      r.quantity,
      formatDateTime(r.releasedAt),
      r.status?.replace(/_/g, ' ') || '—',
    ]),
    styles:     { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`lecturer-releases-${dateTag()}.pdf`);
}

function exportPdfWeekly(weeklySummary, summary, startDate, endDate) {
  const doc = new jsPDF({ orientation: 'portrait' });
  const range = `${startDate || 'Default Start'} – ${endDate || 'Today'}`;

  doc.setFontSize(16);
  doc.text('Weekly Equipment Release Summary – By Lecturer', 14, 16);
  doc.setFontSize(10);
  doc.text(`Date Range: ${range}`, 14, 24);

  const body = [];
  weeklySummary.forEach((wk) => {
    const lecturers = Object.values(wk.byLecturer);
    if (lecturers.length === 0) {
      body.push([wk.weekStart, '—', wk.totalReleased, wk.totalQuantity]);
    } else {
      lecturers.forEach((l, i) => {
        body.push([
          i === 0 ? wk.weekStart : '',
          l.lecturerName,
          l.totalReleased,
          l.totalQuantity,
        ]);
      });
      body.push(['', 'Week Total', wk.totalReleased, wk.totalQuantity]);
    }
  });

  autoTable(doc, {
    startY: 30,
    head:   [['Week Start', 'Lecturer', 'Releases', 'Total Qty']],
    body,
    styles:     { fontSize: 9 },
    headStyles: { fillColor: [5, 150, 105] },
    didParseCell: (data) => {
      // Bold "Week Total" rows
      if (data.row.raw[1] === 'Week Total') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  doc.save(`weekly-lecturer-summary-${dateTag()}.pdf`);
}

function exportCsvInventory(records) {
  const headers = ['Date & Time', 'Equipment', 'Category', 'Action', 'Details', 'Done By'];
  const rows = records.map((r) => [
    formatDateTime(r.createdAt),
    r.equipmentName,
    r.category,
    inventoryActionLabel(r.action),
    inventoryDetails(r),
    r.performedByName,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    `inventory-changes-${dateTag()}.csv`
  );
}

function exportPdfInventory(records, summary, startDate, endDate) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const range = `${startDate || 'Default Start'} – ${endDate || 'Today'}`;

  doc.setFontSize(16);
  doc.text('Equipment Inventory Changes Report', 14, 16);
  doc.setFontSize(10);
  doc.text(`Date Range: ${range}`, 14, 24);
  doc.text(
    `Added: ${summary.totalAdded}   Deleted: ${summary.totalDeleted}   Qty Changes: ${summary.totalQuantityChanges}`,
    14, 31
  );

  autoTable(doc, {
    startY: 36,
    head: [['Date & Time', 'Equipment', 'Category', 'Action', 'Details', 'Done By']],
    body: records.map((r) => [
      formatDateTime(r.createdAt),
      r.equipmentName,
      r.category,
      inventoryActionLabel(r.action),
      inventoryDetails(r),
      r.performedByName,
    ]),
    styles:     { fontSize: 8 },
    headStyles: { fillColor: [245, 158, 11] },
    alternateRowStyles: { fillColor: [255, 251, 235] },
  });

  doc.save(`inventory-changes-${dateTag()}.pdf`);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Reports() {
  const { t } = useLang();
  const [activeTab, setActiveTab]       = useState('lecturer'); // 'lecturer' | 'weekly' | 'borrow'
  const [type, setType]                 = useState('monthly');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [lecturerFilter, setLecturerFilter] = useState('');
  const [search, setSearch]             = useState('');
  const [currentPage, setCurrentPage]   = useState(1);
  const [weekPage, setWeekPage]           = useState(1);
  const [expandedLecturers, setExpandedLecturers] = useState({});

  // Borrow requests tab state
  const [borrowSearch, setBorrowSearch]         = useState('');
  const [borrowStatusFilter, setBorrowStatusFilter] = useState('');
  const [borrowPage, setBorrowPage]             = useState(1);

  // Inventory changes tab state
  const [inventoryPage, setInventoryPage]                 = useState(1);
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
      if (startDate) filters.startDate = startDate;
      if (endDate)   filters.endDate   = endDate;
      if (lecturerFilter) filters.lecturerId = lecturerFilter;
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

  // ── Borrow Requests (all) for admin report tab ─────────────────────────
  const {
    data: borrowRequests = [],
    isLoading: borrowLoading,
  } = useQuery({
    queryKey: ['adminBorrowRequests'],
    queryFn: () => api.entities.BorrowRequest.list(),
  });

  // ── Inventory Changes tab ───────────────────────────────────────────────
  const {
    data: inventoryData,
    isLoading: inventoryLoading,
  } = useQuery({
    queryKey: ['equipmentChanges', type, startDate, endDate, inventoryActionFilter],
    queryFn: () =>
      api.entities.Reports.equipmentChanges({
        type,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(inventoryActionFilter && { action: inventoryActionFilter }),
      }),
    refetchOnWindowFocus: false,
  });

  const inventorySummary = inventoryData?.summary ?? { totalAdded: 0, totalDeleted: 0, totalQuantityChanges: 0, totalPublished: 0, totalUnpublished: 0 };
  const inventoryRecords = inventoryData?.records ?? [];

  // All unique lecturers for filter dropdown
  const lecturerOptions = useMemo(() => {
    const seen = new Set();
    return lecturerGroups
      .filter((g) => { const k = g.lecturerId || g.lecturerName; if (seen.has(k)) return false; seen.add(k); return true; })
      .map((g) => ({ id: g.lecturerId, name: g.lecturerName }));
  }, [lecturerGroups]);

  // Filtered flat records for search / pagination (used in flat-table mode)
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return allRecords;
    const q = search.trim().toLowerCase();
    return allRecords.filter((r) =>
      (r.lecturerName   || '').toLowerCase().includes(q) ||
      (r.studentName    || '').toLowerCase().includes(q) ||
      (r.studentId      || '').toLowerCase().includes(q) ||
      (r.equipmentName  || '').toLowerCase().includes(q)
    );
  }, [allRecords, search]);

  // Filtered lecturer groups for grouped view
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
      .filter((g) =>
        g.releases.length > 0 ||
        (g.lecturerName || '').toLowerCase().includes(q)
      );
  }, [lecturerGroups, search]);

  const toggleLecturerExpand = (key) =>
    setExpandedLecturers((prev) => ({ ...prev, [key]: !prev[key] }));

  // Borrow requests filtering + pagination
  const filteredBorrowRequests = useMemo(() => {
    let list = borrowRequests;
    if (borrowStatusFilter) list = list.filter((r) => r.status === borrowStatusFilter);
    if (borrowSearch.trim()) {
      const q = borrowSearch.trim().toLowerCase();
      list = list.filter((r) =>
        (r.borrower_name || '').toLowerCase().includes(q) ||
        (r.student_id    || '').toLowerCase().includes(q) ||
        (r.equipment?.name || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [borrowRequests, borrowStatusFilter, borrowSearch]);

  const totalBorrowPages = Math.max(1, Math.ceil(filteredBorrowRequests.length / PAGE_SIZE));
  const paginatedBorrowRequests = filteredBorrowRequests.slice(
    (borrowPage - 1) * PAGE_SIZE,
    borrowPage * PAGE_SIZE
  );

  const totalInventoryPages = Math.max(1, Math.ceil(inventoryRecords.length / PAGE_SIZE));
  const paginatedInventoryRecords = inventoryRecords.slice(
    (inventoryPage - 1) * PAGE_SIZE,
    inventoryPage * PAGE_SIZE
  );

  const totalGroupPages = Math.max(1, Math.ceil(filteredGroups.length / GROUP_PAGE_SIZE));
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * GROUP_PAGE_SIZE, currentPage * GROUP_PAGE_SIZE);

  const totalWeekPages = Math.max(1, Math.ceil(weeklySummary.length / PAGE_SIZE));
  const paginatedWeeks = weeklySummary.slice((weekPage - 1) * PAGE_SIZE, weekPage * PAGE_SIZE);

  const h = new Date().getHours();
  const gc =
    h < 12 ? { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' } :
    h < 18 ? { color: '#f97316', bg: '#fff7ed', border: '#fed7aa' } :
             { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };

  if (loading) return <ReportsSkeleton />;

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Hero Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
            style={{ backgroundColor: gc.bg, borderColor: gc.border }}
          >
            <BarChart3 className="h-6 w-6" style={{ color: gc.color }} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{t('equipmentReleaseReports')}</h1>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => loadReports()}
          disabled={isFetching}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('refresh')}
        </Button>
      </div>

      {/* ── Summary stat cards ── */}
      <div className={`grid grid-cols-1 gap-3 ${activeTab === 'inventory' ? 'sm:grid-cols-5' : 'sm:grid-cols-3'}`}>
        {activeTab === 'inventory' ? (
          <>
            <StatCard icon={Package}     label="Items Added"      value={inventorySummary.totalAdded}           accent="#10b981" />
            <StatCard icon={Package}     label="Items Deleted"    value={inventorySummary.totalDeleted}         accent="#ef4444" />
            <StatCard icon={Layers}      label="Qty Changes"      value={inventorySummary.totalQuantityChanges} accent="#f59e0b" />
            <StatCard icon={Package}     label="Published"        value={inventorySummary.totalPublished}       accent="#3b82f6" />
            <StatCard icon={Package}     label="Unpublished"      value={inventorySummary.totalUnpublished}     accent="#94a3b8" />
          </>
        ) : (
          <>
            <StatCard icon={Package}     label={t('totalReleases')}     value={summary.totalReleases}   accent="#3b82f6" />
            <StatCard icon={Layers}      label={t('totalQtyReleased')}  value={summary.totalQuantity}   accent="#10b981" />
            <StatCard icon={Users}       label={t('lecturersInvolved')} value={summary.totalLecturers}  accent="#8b5cf6" />
          </>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        {/* Report type */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('reportPeriod')}</p>
          <div className="flex gap-2">
            {REPORT_TYPE_KEYS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setType(opt.value); setCurrentPage(1); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  type === opt.value
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('startDate')}</p>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            className="h-8 w-36 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('endDate')}</p>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            className="h-8 w-36 text-xs"
          />
        </div>

        {/* Lecturer filter */}
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('lecturer')}</p>
          <select
            value={lecturerFilter}
            onChange={(e) => { setLecturerFilter(e.target.value); setCurrentPage(1); }}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">{t('allLecturers')}</option>
            {lecturerOptions.map((l) => (
              <option key={l.id || l.name} value={l.id || ''}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {(startDate || endDate || lecturerFilter) && (
          <button
            type="button"
            onClick={() => { setStartDate(''); setEndDate(''); setLecturerFilter(''); setCurrentPage(1); }}
            className="self-end text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
          >
            {t('clearFilters')}
          </button>
        )}
      </div>

      {/* ── Export Section ── */}
      <Card className="border-slate-200 shadow-none">
        <div className="border-b border-slate-100 bg-white px-4 py-3">
          <p className="text-sm font-medium text-slate-800">{t('exportReports')}</p>
          <p className="mt-0.5 text-xs text-slate-500">{t('exportReportsDesc')}</p>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {/* Full release report */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-sm font-semibold text-slate-800">{t('fullReleaseReport')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('fullReleaseReportDesc')}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="h-7 gap-1.5 bg-blue-600 text-xs hover:bg-blue-700"
                  onClick={() => exportPdfAll(allRecords, summary, startDate, endDate)}
                  disabled={isFetching || allRecords.length === 0}
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => exportCsvAll(allRecords, startDate, endDate)}
                  disabled={isFetching || allRecords.length === 0}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel / CSV
                </Button>
              </div>
            </div>

            {/* Weekly summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-sm font-semibold text-slate-800">{t('weeklySummaryTab')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('weeklySummaryTabDesc')}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="h-7 gap-1.5 bg-emerald-600 text-xs hover:bg-emerald-700"
                  onClick={() => exportPdfWeekly(weeklySummary, summary, startDate, endDate)}
                  disabled={isFetching || weeklySummary.length === 0}
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => exportCsvWeekly(weeklySummary)}
                  disabled={isFetching || weeklySummary.length === 0}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel / CSV
                </Button>
              </div>
            </div>

            {/* Inventory changes report */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex items-center gap-1.5">
                <PackagePlus className="h-3.5 w-3.5 text-amber-600" />
                <p className="text-sm font-semibold text-slate-800">Inventory Changes Report</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                All equipment additions, deletions, quantity changes, and publish/unpublish actions — including who performed each action.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="h-7 gap-1.5 bg-amber-500 text-xs hover:bg-amber-600"
                  onClick={() => exportPdfInventory(inventoryRecords, inventorySummary, startDate, endDate)}
                  disabled={inventoryLoading || inventoryRecords.length === 0}
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => exportCsvInventory(inventoryRecords)}
                  disabled={inventoryLoading || inventoryRecords.length === 0}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel / CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tab switcher ── */}
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => { setActiveTab('lecturer'); setCurrentPage(1); }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'lecturer'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="h-3.5 w-3.5" /> {t('groupedByLecturer')}
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('weekly'); setWeekPage(1); }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'weekly'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" /> {t('weeklySummaryTab')}
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('borrow'); setBorrowPage(1); }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'borrow'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" /> {t('allBorrowRequests')}
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('inventory'); setInventoryPage(1); }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'inventory'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <PackagePlus className="h-3.5 w-3.5" /> Inventory Changes
        </button>
      </div>

      {/* ── Error state ── */}
      {error && (
        <Card className="border-red-200 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-14">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <BarChart3 className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-sm font-medium text-slate-800">{t('failedLoadRecords')}</p>
            <p className="max-w-xs text-center text-xs text-slate-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ TAB: LECTURER GROUPED ═══════════════ */}
      {!error && activeTab === 'lecturer' && (
        <Card className="overflow-hidden border-slate-200 shadow-none">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-800">{t('releaseRecords')}</p>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                {filteredGroups.reduce((s, g) => s + g.releases.length, 0)}
              </span>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t('searchLecturerStudentItem')}
                value={search}
                onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="w-8 text-xs font-medium text-slate-500">#</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('studentOrLecturer')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('email')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('equipment')}</TableHead>
                    <TableHead className="text-center text-xs font-medium text-slate-500">{t('releases')}</TableHead>
                    <TableHead className="text-center text-xs font-medium text-slate-500">{t('totalUnits')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('releasedBy')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <Users className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">{t('noReleaseRecordsFound')}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedGroups.map((group) => {
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
                    })
                  )}
                </TableBody>
              </Table>

              {totalGroupPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    {t('showing')} {(currentPage - 1) * GROUP_PAGE_SIZE + 1}–{Math.min(currentPage * GROUP_PAGE_SIZE, filteredGroups.length)} {t('ofLabel')} {filteredGroups.length} {t('lecturers').toLowerCase()}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {getPaginationRange(currentPage, totalGroupPages).map((item, idx) =>
                      item === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                      ) : (
                        <Button
                          key={item}
                          variant={currentPage === item ? 'default' : 'outline'}
                          size="icon"
                          className={`h-7 w-7 text-xs ${currentPage === item ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                          onClick={() => setCurrentPage(item)}
                        >
                          {item}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => setCurrentPage((p) => Math.min(totalGroupPages, p + 1))}
                      disabled={currentPage === totalGroupPages}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ TAB: WEEKLY SUMMARY ═══════════════ */}
      {!error && activeTab === 'weekly' && (
        <Card className="overflow-hidden border-slate-200 shadow-none">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-medium text-slate-800">{t('weeklySummaryTab')}</p>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                {weeklySummary.length} week{weeklySummary.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <CardContent className="p-0">
            {weeklySummary.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">{t('noWeeklyData')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {paginatedWeeks.map((wk) => {
                  const weekEnd = (() => {
                    try {
                      const d = parseISO(wk.weekStart);
                      return format(endOfWeek(d, { weekStartsOn: 1 }), 'MMM d');
                    } catch { return ''; }
                  })();
                  const weekStartFmt = (() => {
                    try { return format(parseISO(wk.weekStart), 'MMM d, yyyy'); } catch { return wk.weekStart; }
                  })();

                  return (
                    <div key={wk.weekStart} className="px-4 py-4">
                      {/* Week header */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            {weekStartFmt}{weekEnd ? ` – ${weekEnd}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span><span className="font-semibold text-blue-700">{wk.totalReleased}</span> {t('releases').toLowerCase()}</span>
                          <span><span className="font-semibold text-emerald-700">{wk.totalQuantity}</span> {t('qty').toLowerCase()}</span>
                        </div>
                      </div>

                      {/* Per-lecturer breakdown */}
                      <div className="overflow-x-auto rounded-lg border border-slate-100">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                              <th className="py-2 pl-4 pr-2 text-left font-medium text-slate-500">{t('lecturer')}</th>
                              <th className="px-3 py-2 text-right font-medium text-slate-500">{t('releases')}</th>
                              <th className="py-2 pl-3 pr-4 text-right font-medium text-slate-500">{t('totalUnits')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.values(wk.byLecturer).map((l, i) => (
                              <tr
                                key={i}
                                className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                              >
                                <td className="py-2 pl-4 pr-2 text-slate-800">{l.lecturerName}</td>
                                <td className="px-3 py-2 text-right font-medium text-blue-700">{l.totalReleased}</td>
                                <td className="py-2 pl-3 pr-4 text-right font-medium text-emerald-700">{l.totalQuantity}</td>
                              </tr>
                            ))}
                            {/* Week total row */}
                            <tr className="bg-slate-100/60 font-semibold">
                              <td className="py-2 pl-4 pr-2 text-slate-700">{t('weekTotal')}</td>
                              <td className="px-3 py-2 text-right text-blue-800">{wk.totalReleased}</td>
                              <td className="py-2 pl-3 pr-4 text-right text-emerald-800">{wk.totalQuantity}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
                {totalWeekPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                    <p className="text-xs text-slate-500">
                      Showing {(weekPage - 1) * PAGE_SIZE + 1}–{Math.min(weekPage * PAGE_SIZE, weeklySummary.length)} of {weeklySummary.length} week{weeklySummary.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => setWeekPage((p) => Math.max(1, p - 1))}
                        disabled={weekPage === 1}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      {getPaginationRange(weekPage, totalWeekPages).map((item, idx) =>
                        item === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                        ) : (
                          <Button
                            key={item}
                            variant={weekPage === item ? 'default' : 'outline'}
                            size="icon"
                            className={`h-7 w-7 text-xs ${weekPage === item ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}`}
                            onClick={() => setWeekPage(item)}
                          >
                            {item}
                          </Button>
                        )
                      )}
                      <Button
                        variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => setWeekPage((p) => Math.min(totalWeekPages, p + 1))}
                        disabled={weekPage === totalWeekPages}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ TAB: BORROW REQUESTS ═══════════════ */}
      {activeTab === 'borrow' && (
        <Card className="overflow-hidden border-slate-200 shadow-none">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-slate-800">{t('allBorrowRequests')}</p>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                {filteredBorrowRequests.length}
              </span>
              {/* Status filter pills */}
              <div className="flex gap-1.5 flex-wrap">
                {['', 'pending', 'approved', 'rejected', 'borrowed', 'returned'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setBorrowStatusFilter(s); setBorrowPage(1); }}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
                      borrowStatusFilter === s
                        ? 'border-violet-200 bg-violet-50 text-violet-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {s === '' ? 'All' : STATUS_COLORS[s]?.label || s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t('searchBorrowerEquipment')}
                  value={borrowSearch}
                  onChange={(e) => { setBorrowPage(1); setBorrowSearch(e.target.value); }}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs shrink-0"
                onClick={() => {
                  const rows = filteredBorrowRequests.map((r) => [
                    r.borrower_name || '—',
                    r.student_id || '—',
                    r.equipment?.name || '—',
                    r.serial_number || '—',
                    formatDate(r.borrow_date),
                    formatDate(r.return_date),
                    STATUS_COLORS[r.status]?.label || r.status,
                    formatDate(r.createdAt),
                  ]);
                  const headers = ['Borrower', 'Student ID', 'Equipment', 'Serial No.', 'Borrow Date', 'Return Date', 'Status', 'Submitted'];
                  const csv = [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
                  triggerDownload(new Blob([csv], { type: 'text/csv' }), `borrow-requests-${dateTag()}.csv`);
                }}
                disabled={filteredBorrowRequests.length === 0}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 shrink-0"
                onClick={() => {
                  const doc = new jsPDF({ orientation: 'landscape' });
                  doc.setFontSize(14);
                  doc.text('Borrow Request Report', 14, 16);
                  doc.setFontSize(9);
                  doc.setTextColor(120);
                  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
                  autoTable(doc, {
                    startY: 26,
                    head: [['Borrower', 'Student ID', 'Equipment', 'Serial No.', 'Borrow Date', 'Return Date', 'Status', 'Submitted']],
                    body: filteredBorrowRequests.map((r) => [
                      r.borrower_name || '—',
                      r.student_id || '—',
                      r.equipment?.name || '—',
                      r.serial_number || '—',
                      formatDate(r.borrow_date),
                      formatDate(r.return_date),
                      STATUS_COLORS[r.status]?.label || r.status,
                      formatDate(r.createdAt),
                    ]),
                    headStyles: { fillColor: [109, 40, 217], fontSize: 8 },
                    bodyStyles: { fontSize: 8 },
                    alternateRowStyles: { fillColor: [245, 243, 255] },
                  });
                  doc.save(`borrow-requests-${dateTag()}.pdf`);
                }}
                disabled={filteredBorrowRequests.length === 0}
              >
                <FileText className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </div>

          <CardContent className="p-0">
            {borrowLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-slate-400">{t('loadingBorrowRequests')}</div>
            ) : paginatedBorrowRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16">
                <ClipboardList className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">{t('noBorrowRequestsFound')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                      <TableHead className="text-xs font-semibold text-slate-500">{t('borrower')}</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">{t('studentId')}</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">{t('equipment')}</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">{t('serialNo')}</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">{t('borrowDate')}</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">{t('returnDate')}</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">{t('status')}</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">{t('submitted')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBorrowRequests.map((r) => (
                      <TableRow key={r._id || r.id} className="border-slate-50 hover:bg-slate-50/50">
                        <TableCell className="text-xs font-medium text-slate-800">{r.borrower_name || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-600">{r.student_id || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-600">{r.equipment?.name || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono">{r.serial_number || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-600">{formatDate(r.borrow_date)}</TableCell>
                        <TableCell className="text-xs text-slate-600">{formatDate(r.return_date)}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-xs text-slate-500">{formatDate(r.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalBorrowPages > 1 && (
              <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 px-4 py-3">
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setBorrowPage((p) => Math.max(1, p - 1))}
                  disabled={borrowPage === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {getPaginationRange(borrowPage, totalBorrowPages).map((item, idx) =>
                  item === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                  ) : (
                    <Button
                      key={item}
                      variant={borrowPage === item ? 'default' : 'outline'}
                      size="icon"
                      className={`h-7 w-7 text-xs ${borrowPage === item ? 'bg-violet-600 text-white hover:bg-violet-700' : ''}`}
                      onClick={() => setBorrowPage(item)}
                    >
                      {item}
                    </Button>
                  )
                )}
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setBorrowPage((p) => Math.min(totalBorrowPages, p + 1))}
                  disabled={borrowPage === totalBorrowPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════ TAB: INVENTORY CHANGES ═══════════════ */}
      {activeTab === 'inventory' && (
        <Card className="overflow-hidden border-slate-200 shadow-none">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <PackagePlus className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium text-slate-800">Inventory Changes</p>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                {inventoryRecords.length}
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { value: '',                 label: 'All' },
                  { value: 'added',            label: 'Added' },
                  { value: 'deleted',          label: 'Deleted' },
                  { value: 'quantity_changed', label: 'Qty Changed' },
                  { value: 'published',        label: 'Published' },
                  { value: 'unpublished',      label: 'Unpublished' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setInventoryActionFilter(opt.value); setInventoryPage(1); }}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
                      inventoryActionFilter === opt.value
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => exportCsvInventory(inventoryRecords)}
                disabled={inventoryRecords.length === 0}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs bg-amber-500 hover:bg-amber-600"
                onClick={() => exportPdfInventory(inventoryRecords, inventorySummary, startDate, endDate)}
                disabled={inventoryRecords.length === 0}
              >
                <FileText className="h-3.5 w-3.5" /> PDF
              </Button>
            </div>
          </div>

          <CardContent className="p-0">
            {inventoryLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading...</div>
            ) : paginatedInventoryRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16">
                <PackagePlus className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">No inventory changes found for this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                      <TableHead className="text-xs font-semibold text-slate-500">#</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Date & Time</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Equipment</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Category</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Action</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Details</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500">Done By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInventoryRecords.map((r, idx) => (
                      <TableRow key={r._id || idx} className="border-slate-50 hover:bg-slate-50/50">
                        <TableCell className="text-xs text-slate-400">
                          {(inventoryPage - 1) * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-slate-500">
                          {formatDateTime(r.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-800">{r.equipmentName || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-500">{r.category || '—'}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${inventoryActionBadge(r.action)}`}>
                            {inventoryActionLabel(r.action)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{inventoryDetails(r)}</TableCell>
                        <TableCell className="text-xs text-slate-500">{r.performedByName || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalInventoryPages > 1 && (
              <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 px-4 py-3">
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}
                  disabled={inventoryPage === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {getPaginationRange(inventoryPage, totalInventoryPages).map((item, idx) =>
                  item === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                  ) : (
                    <Button
                      key={item}
                      variant={inventoryPage === item ? 'default' : 'outline'}
                      size="icon"
                      className={`h-7 w-7 text-xs ${inventoryPage === item ? 'bg-amber-500 text-white hover:bg-amber-600' : ''}`}
                      onClick={() => setInventoryPage(item)}
                    >
                      {item}
                    </Button>
                  )
                )}
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setInventoryPage((p) => Math.min(totalInventoryPages, p + 1))}
                  disabled={inventoryPage === totalInventoryPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
