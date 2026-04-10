import React, { useEffect, useMemo, useState } from 'react';
import { ReportsSkeleton } from '@/skeleton-framework/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileSpreadsheet, FileText, BarChart3, RefreshCw,
  ChevronLeft, ChevronRight, PackageCheck, AlertTriangle, XCircle, Search,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { api } from '@/api/apiClient';

const REPORT_TYPES = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const CONDITION_CONFIG = [
  { value: 'all',     label: 'All Records',     color: 'bg-slate-50 text-slate-700 border-slate-200',       dot: '#64748b', icon: BarChart3 },
  { value: 'good',    label: 'Good Condition',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#22c55e', icon: PackageCheck },
  { value: 'damaged', label: 'Damaged',         color: 'bg-red-50 text-red-700 border-red-200',             dot: '#ef4444', icon: AlertTriangle },
  { value: 'lost',    label: 'Lost',            color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: '#f59e0b', icon: XCircle },
];

const PAGE_SIZE = 15;

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString();
};

const getConditionBadgeClass = (condition) => {
  const normalized = String(condition || '').toLowerCase();
  if (normalized === 'damaged') return 'bg-red-50 text-red-700 border-red-200';
  if (normalized === 'lost') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
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

export default function Reports() {
  const [type, setType] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [activeCondition, setActiveCondition] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({ totalBorrowed: 0, good: 0, damaged: 0, lost: 0 });
  const [records, setRecords] = useState([]);

  const loadReports = async () => {
    setLoading(true);
    setError('');

    try {
      const filters = { type };
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const reportApi = api?.entities?.Reports || api?.service?.Reports;
      if (!reportApi?.borrowing) {
        throw new Error('Reports API is not available in apiClient.');
      }

      const response = await reportApi.borrowing(filters);

      setSummary(response.summary || { totalBorrowed: 0, good: 0, damaged: 0, lost: 0 });
      setRecords(Array.isArray(response.records) ? response.records : []);
    } catch (err) {
      setSummary({ totalBorrowed: 0, good: 0, damaged: 0, lost: 0 });
      setRecords([]);
      setError(err.message || 'Failed to fetch report records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, startDate, endDate]);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime());
  }, [records]);

  const conditionRecords = useMemo(() => {
    return sortedRecords.filter((record) => {
      const condition = String(record.condition || '').toLowerCase();
      return condition === 'good' || condition === 'damaged' || condition === 'lost';
    });
  }, [sortedRecords]);

  const recordsByCondition = useMemo(() =>
    CONDITION_CONFIG.reduce((acc, cfg) => {
      acc[cfg.value] = cfg.value === 'all'
        ? sortedRecords
        : sortedRecords.filter((r) => String(r.condition || '').toLowerCase() === cfg.value);
      return acc;
    }, {}),
  [sortedRecords]);

  const filteredRecords = useMemo(() => {
    const base = recordsByCondition[activeCondition] || sortedRecords;
    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter((r) =>
      (r.studentName || '').toLowerCase().includes(q) ||
      (r.studentId || '').toLowerCase().includes(q) ||
      (r.itemName || '').toLowerCase().includes(q) ||
      (r.itemId || '').toLowerCase().includes(q)
    );
  }, [recordsByCondition, activeCondition, sortedRecords, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleConditionChange = (value) => {
    setActiveCondition(value);
    setCurrentPage(1);
  };

  const exportCsv = (mode) => {
    const dateTag = new Date().toISOString().slice(0, 10);

    if (mode === 'overall') {
      const rows = [
        ['Metric', 'Value'],
        ['Total Returned Borrowings', summary.totalBorrowed],
        ['Good Condition', summary.good],
        ['Damaged', summary.damaged],
        ['Lost', summary.lost],
        [],
        ['Student Name', 'Student ID', 'Item Name', 'Item ID', 'Borrow Date', 'Return Date', 'Condition'],
        ...sortedRecords.map((record) => [
          record.studentName || '',
          record.studentId || '',
          record.itemName || '',
          record.itemId || '',
          formatDate(record.borrowDate),
          formatDate(record.returnDate),
          record.condition || 'Good',
        ]),
      ];
      const csvText = rows.map((row) => row.map(toCsvCell).join(',')).join('\n');
      triggerDownload(new Blob([csvText], { type: 'text/csv;charset=utf-8;' }), `overall-student-borrowing-report-${dateTag}.csv`);
      return;
    }

    if (mode === 'condition') {
      const headers = ['Student Name', 'Student ID', 'Item Name', 'Item ID', 'Return Date', 'Condition'];
      const rows = conditionRecords.map((record) => [
        record.studentName || '',
        record.studentId || '',
        record.itemName || '',
        record.itemId || '',
        formatDate(record.returnDate),
        record.condition || 'Good',
      ]);
      const csvText = [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
      triggerDownload(new Blob([csvText], { type: 'text/csv;charset=utf-8;' }), `return-condition-report-${dateTag}.csv`);
      return;
    }

    const headers = ['Student Name', 'Student ID', 'Item Name', 'Item ID', 'Borrow Date', 'Return Date', 'Condition'];
    const rows = sortedRecords.map((record) => [
      record.studentName || '',
      record.studentId || '',
      record.itemName || '',
      record.itemId || '',
      formatDate(record.borrowDate),
      formatDate(record.returnDate),
      record.condition || 'Good',
    ]);
    const csvText = [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
    triggerDownload(new Blob([csvText], { type: 'text/csv;charset=utf-8;' }), `borrowing-history-report-${dateTag}.csv`);
  };

  const exportPdf = (mode) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const rangeLabel = `Date Range: ${startDate || 'Default Start'} – ${endDate || 'Today'}`;
    const dateTag = new Date().toISOString().slice(0, 10);

    if (mode === 'overall') {
      doc.setFontSize(16);
      doc.text('Overall Student Borrowing Report', 14, 16);
      doc.setFontSize(10);
      doc.text(rangeLabel, 14, 24);
      autoTable(doc, {
        startY: 30,
        head: [['Metric', 'Value']],
        body: [
          ['Total Returned Borrowings', summary.totalBorrowed],
          ['Good Condition', summary.good],
          ['Damaged', summary.damaged],
          ['Lost', summary.lost],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [15, 118, 110] },
      });
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Student Name', 'Student ID', 'Item Name', 'Item ID', 'Borrow Date', 'Return Date', 'Condition']],
        body: sortedRecords.map((r) => [r.studentName || '-', r.studentId || '-', r.itemName || '-', r.itemId || '-', formatDate(r.borrowDate), formatDate(r.returnDate), r.condition || 'Good']),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      });
      doc.save(`overall-student-borrowing-report-${dateTag}.pdf`);
      return;
    }

    if (mode === 'condition') {
      doc.setFontSize(16);
      doc.text('Returned Condition Report', 14, 16);
      doc.setFontSize(10);
      doc.text(rangeLabel, 14, 24);
      autoTable(doc, {
        startY: 30,
        head: [['Condition', 'Count']],
        body: [['Good', summary.good], ['Damaged', summary.damaged], ['Lost', summary.lost]],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [180, 83, 9] },
      });
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Student Name', 'Student ID', 'Item Name', 'Item ID', 'Return Date', 'Condition']],
        body: conditionRecords.map((r) => [r.studentName || '-', r.studentId || '-', r.itemName || '-', r.itemId || '-', formatDate(r.returnDate), r.condition || 'Good']),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [217, 119, 6] },
      });
      doc.save(`return-condition-report-${dateTag}.pdf`);
      return;
    }

    doc.setFontSize(16);
    doc.text('Borrowing History Report', 14, 16);
    doc.setFontSize(10);
    doc.text(rangeLabel, 14, 24);
    doc.text(`Total Borrowed: ${summary.totalBorrowed}`, 14, 32);
    doc.text(`Good: ${summary.good}`, 70, 32);
    doc.text(`Damaged: ${summary.damaged}`, 110, 32);
    doc.text(`Lost: ${summary.lost}`, 160, 32);
    autoTable(doc, {
      startY: 38,
      head: [['Student Name', 'Student ID', 'Item Name', 'Item ID', 'Borrow Date', 'Return Date', 'Condition']],
      body: sortedRecords.map((r) => [r.studentName || '-', r.studentId || '-', r.itemName || '-', r.itemId || '-', formatDate(r.borrowDate), formatDate(r.returnDate), r.condition || 'Good']),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`borrowing-history-report-${dateTag}.pdf`);
  };

  const h = new Date().getHours();
  const gc =
    h < 12 ? { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' } :
    h < 18 ? { color: '#f97316', bg: '#fff7ed', border: '#fed7aa' } :
             { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };

  const activeConditionConfig = CONDITION_CONFIG.find((c) => c.value === activeCondition) || CONDITION_CONFIG[0];

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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Reports</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <BarChart3 className="h-3.5 w-3.5 text-slate-600" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold leading-none tabular-nums text-slate-700">{summary.totalBorrowed}</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-500">returned borrowing{summary.totalBorrowed !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={loadReports}
            disabled={loading}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Report Type</p>
          <div className="flex gap-2">
            {REPORT_TYPES.map((opt) => (
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
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Start Date</p>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            className="h-8 w-36 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">End Date</p>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            className="h-8 w-36 text-xs"
          />
        </div>
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => { setStartDate(''); setEndDate(''); setCurrentPage(1); }}
            className="mb-0.5 self-end text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* ── Condition stat cards ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CONDITION_CONFIG.map((cfg) => {
          const count = cfg.value === 'all' ? summary.totalBorrowed : (summary[cfg.value] ?? 0);
          const isActive = activeCondition === cfg.value;
          const CfgIcon = cfg.icon;
          return (
            <button
              key={cfg.value}
              type="button"
              onClick={() => handleConditionChange(cfg.value)}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? `${cfg.color} shadow-sm`
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`rounded-lg p-1.5 ${isActive ? 'bg-white/60' : 'bg-slate-100'}`}>
                <CfgIcon className="h-4 w-4" style={isActive ? { color: cfg.dot } : { color: '#64748b' }} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-slate-500">{cfg.label}</p>
                <p className="text-lg font-semibold leading-tight text-slate-900">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Export Section ── */}
      <Card className="border-slate-200 shadow-none">
        <div className="border-b border-slate-100 bg-white px-4 py-3">
          <p className="text-sm font-medium text-slate-800">Export Reports</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Download borrowing history, condition breakdown, or an all-in-one report.
          </p>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-sm font-semibold text-slate-800">Borrowing History</p>
              <p className="mt-1 text-xs text-slate-500">
                Full returned borrowing history with student, item, dates and condition.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="h-7 gap-1.5 bg-blue-600 text-xs hover:bg-blue-700"
                  onClick={() => exportPdf('history')}
                  disabled={loading || sortedRecords.length === 0}
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => exportCsv('history')}
                  disabled={loading || sortedRecords.length === 0}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-sm font-semibold text-slate-800">Returned Condition</p>
              <p className="mt-1 text-xs text-slate-500">
                Condition-focused with good / damaged / lost breakdown and item details.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="h-7 gap-1.5 bg-amber-600 text-xs hover:bg-amber-700"
                  onClick={() => exportPdf('condition')}
                  disabled={loading || conditionRecords.length === 0}
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => exportCsv('condition')}
                  disabled={loading || conditionRecords.length === 0}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="text-sm font-semibold text-slate-800">Overall (All-in-One)</p>
              <p className="mt-1 text-xs text-slate-500">
                Complete package with summary metrics and full detail table in one file.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="h-7 gap-1.5 bg-teal-600 text-xs hover:bg-teal-700"
                  onClick={() => exportPdf('overall')}
                  disabled={loading || sortedRecords.length === 0}
                >
                  <FileText className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => exportCsv('overall')}
                  disabled={loading || sortedRecords.length === 0}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Detailed Records Table ── */}
      <Card className="overflow-hidden border-slate-200 shadow-none">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {activeCondition !== 'all' && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeConditionConfig.dot }} />
            )}
            <p className="text-sm font-medium text-slate-800">{activeConditionConfig.label}</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {filteredRecords.length}
            </span>
            {activeCondition !== 'all' && (
              <button
                onClick={() => handleConditionChange('all')}
                className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              >
                clear
              </button>
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search student, item..."
              value={search}
              onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {error && (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <BarChart3 className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-800">Failed to load records</p>
              <p className="max-w-xs text-center text-xs text-slate-500">{error}</p>
            </div>
          )}

          {!error && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="text-xs font-medium text-slate-500">Student Name</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Student ID</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Item Name</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Item ID</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Borrow Date</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Return Date</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Condition</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <BarChart3 className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">No records found for the selected filters.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRecords.map((record, index) => (
                      <TableRow
                        key={`${record.itemId || 'item'}-${record.studentId || 'student'}-${index}`}
                        className="border-slate-50 hover:bg-slate-50/50"
                      >
                        <TableCell className="text-sm font-medium text-slate-900">{record.studentName || '-'}</TableCell>
                        <TableCell className="text-xs text-slate-500">{record.studentId || '-'}</TableCell>
                        <TableCell className="text-sm text-slate-900">{record.itemName || '-'}</TableCell>
                        <TableCell className="text-xs text-slate-500">{record.itemId || '-'}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-slate-500">{formatDate(record.borrowDate)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-slate-500">{formatDate(record.returnDate)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${getConditionBadgeClass(record.condition)}`}>
                            {record.condition || 'Good'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length} records
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="icon"
                        className={`h-7 w-7 text-xs ${currentPage === page ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
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
    </div>
  );
}
