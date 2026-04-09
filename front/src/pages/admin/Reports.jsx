import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '@/api/apiClient';

const REPORT_TYPES = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' }
];

const formatDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString();
};

const getConditionBadgeClass = (condition) => {
  const normalized = String(condition || '').toLowerCase();
  if (normalized === 'damaged') return 'bg-red-100 text-red-700';
  if (normalized === 'lost') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
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
    return [...records].sort((a, b) => {
      const aTime = new Date(a.returnDate).getTime();
      const bTime = new Date(b.returnDate).getTime();
      return bTime - aTime;
    });
  }, [records]);

  const conditionRecords = useMemo(() => {
    return sortedRecords.filter((record) => {
      const condition = String(record.condition || '').toLowerCase();
      return condition === 'good' || condition === 'damaged' || condition === 'lost';
    });
  }, [sortedRecords]);

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
          record.condition || 'Good'
        ])
      ];

      const csvText = rows.map((row) => row.map(toCsvCell).join(',')).join('\n');
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      triggerDownload(blob, `overall-student-borrowing-report-${dateTag}.csv`);
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
        record.condition || 'Good'
      ]);

      const csvText = [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      triggerDownload(blob, `return-condition-report-${dateTag}.csv`);
      return;
    }

    const headers = [
      'Student Name',
      'Student ID',
      'Item Name',
      'Item ID',
      'Borrow Date',
      'Return Date',
      'Condition'
    ];

    const rows = sortedRecords.map((record) => [
      record.studentName || '',
      record.studentId || '',
      record.itemName || '',
      record.itemId || '',
      formatDate(record.borrowDate),
      formatDate(record.returnDate),
      record.condition || 'Good'
    ]);

    const csvText = [headers, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });

    triggerDownload(blob, `borrowing-history-report-${dateTag}.csv`);
  };

  const exportPdf = (mode) => {
    const doc = new jsPDF({ orientation: 'landscape' });

    const rangeLabel = `Date Range: ${startDate || 'Default Start'} - ${endDate || 'Today'}`;

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
          ['Lost', summary.lost]
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [15, 118, 110] }
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Student Name', 'Student ID', 'Item Name', 'Item ID', 'Borrow Date', 'Return Date', 'Condition']],
        body: sortedRecords.map((record) => [
          record.studentName || '-',
          record.studentId || '-',
          record.itemName || '-',
          record.itemId || '-',
          formatDate(record.borrowDate),
          formatDate(record.returnDate),
          record.condition || 'Good'
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] }
      });

      doc.save(`overall-student-borrowing-report-${new Date().toISOString().slice(0, 10)}.pdf`);
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
        body: [
          ['Good', summary.good],
          ['Damaged', summary.damaged],
          ['Lost', summary.lost]
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [180, 83, 9] }
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Student Name', 'Student ID', 'Item Name', 'Item ID', 'Return Date', 'Condition']],
        body: conditionRecords.map((record) => [
          record.studentName || '-',
          record.studentId || '-',
          record.itemName || '-',
          record.itemId || '-',
          formatDate(record.returnDate),
          record.condition || 'Good'
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [217, 119, 6] }
      });

      doc.save(`return-condition-report-${new Date().toISOString().slice(0, 10)}.pdf`);
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
      head: [[
        'Student Name',
        'Student ID',
        'Item Name',
        'Item ID',
        'Borrow Date',
        'Return Date',
        'Condition'
      ]],
      body: sortedRecords.map((record) => [
        record.studentName || '-',
        record.studentId || '-',
        record.itemName || '-',
        record.itemId || '-',
        formatDate(record.borrowDate),
        formatDate(record.returnDate),
        record.condition || 'Good'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`borrowing-history-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">Reports</h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Track who borrowed each item, when it was returned, and its condition upon return.
        </p>
      </div>

      <section className="rounded-xl border border-[hsl(var(--border))] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-medium text-[hsl(var(--foreground))]">Filters</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Report Type</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="w-full rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm"
            >
              {REPORT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Start Date (Optional)</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">End Date (Optional)</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-white p-4 shadow-sm">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Total Returned Borrowings</p>
          <p className="mt-2 text-3xl font-semibold text-[hsl(var(--foreground))]">{summary.totalBorrowed}</p>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-white p-4 shadow-sm">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Good Condition</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">{summary.good}</p>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-white p-4 shadow-sm">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Damaged</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">{summary.damaged}</p>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-white p-4 shadow-sm">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Lost</p>
          <p className="mt-2 text-3xl font-semibold text-amber-600">{summary.lost}</p>
        </div>
      </section>

      <section className="rounded-xl border border-[hsl(var(--border))] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-medium text-[hsl(var(--foreground))]">Export</h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Choose which report section to export: borrowing history, returned condition focus, or overall all-in-one.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-[hsl(var(--border))] p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Borrowing History Report</h3>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Full returned borrowing history: who borrowed, what item, when borrowed and returned, and return condition.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportPdf('history')}
                disabled={loading || sortedRecords.length === 0}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                type="button"
                onClick={() => exportCsv('history')}
                disabled={loading || sortedRecords.length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-xs font-medium text-[hsl(var(--foreground))] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[hsl(var(--border))] p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Returned Condition Report</h3>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Condition-focused report with good, damaged, and lost breakdown plus returned item condition details.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportPdf('condition')}
                disabled={loading || conditionRecords.length === 0}
                className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                type="button"
                onClick={() => exportCsv('condition')}
                disabled={loading || conditionRecords.length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-xs font-medium text-[hsl(var(--foreground))] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[hsl(var(--border))] p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Overall Report (All-in-One)</h3>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Complete report package with summary metrics and full detailed table in one export file.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportPdf('overall')}
                disabled={loading || sortedRecords.length === 0}
                className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                type="button"
                onClick={() => exportCsv('overall')}
                disabled={loading || sortedRecords.length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-white px-3 py-2 text-xs font-medium text-[hsl(var(--foreground))] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[hsl(var(--border))] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-medium text-[hsl(var(--foreground))]">Detailed Returned Records</h2>

        {loading && (
          <div className="mt-4 rounded-md border border-dashed border-[hsl(var(--border))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Loading report data...
          </div>
        )}

        {!loading && error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && sortedRecords.length === 0 && (
          <div className="mt-4 rounded-md border border-dashed border-[hsl(var(--border))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No returned borrowing records found for the selected filters.
          </div>
        )}

        {!loading && !error && sortedRecords.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-md border border-[hsl(var(--border))]">
            <table className="min-w-full divide-y divide-[hsl(var(--border))] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Student Name</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Student ID</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Item Name</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Item ID</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Borrow Date</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Return Date</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-700">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))] bg-white">
                {sortedRecords.map((record, index) => (
                  <tr key={`${record.itemId || 'item'}-${record.studentId || 'student'}-${index}`}>
                    <td className="px-3 py-2 text-[hsl(var(--foreground))]">{record.studentName || '-'}</td>
                    <td className="px-3 py-2 text-[hsl(var(--muted-foreground))]">{record.studentId || '-'}</td>
                    <td className="px-3 py-2 text-[hsl(var(--foreground))]">{record.itemName || '-'}</td>
                    <td className="px-3 py-2 text-[hsl(var(--muted-foreground))]">{record.itemId || '-'}</td>
                    <td className="px-3 py-2 text-[hsl(var(--foreground))]">{formatDate(record.borrowDate)}</td>
                    <td className="px-3 py-2 text-[hsl(var(--foreground))]">{formatDate(record.returnDate)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getConditionBadgeClass(record.condition)}`}>
                        {record.condition || 'Good'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
