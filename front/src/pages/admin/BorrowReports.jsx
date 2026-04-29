import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/ui/StatusBadge';
import BorrowRequestReportModal from '@/components/BorrowRequestReportModal';
import {
  Search, Printer, FileText,
  ChevronLeft, ChevronRight,
  Layers, Clock3, CheckCircle2, RotateCcw, XCircle, FileDown,
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'all',      label: 'All',      statuses: null,                                           icon: Layers,       dot: '#475569', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { key: 'pending',  label: 'Pending',  statuses: ['pending_lecturer', 'pending_head'],           icon: Clock3,       dot: '#d97706', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'active',   label: 'Active',   statuses: ['head_approved', 'ready_pickup', 'borrowed'],  icon: CheckCircle2, dot: '#2563eb', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'returned', label: 'Returned', statuses: ['returned'],                                   icon: RotateCcw,    dot: '#059669', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected'],                                   icon: XCircle,      dot: '#dc2626', color: 'bg-red-50 text-red-700 border-red-200' },
];

const PAGE_SIZE = 15;

export default function BorrowReports() {
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [reportRequestId, setReportRequestId] = useState(null);

  const { data: requests = [], isLoading, isError } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list('-created_date'),
  });

  React.useEffect(() => { setCurrentPage(1); }, [search, activeStatus]);

  const selectedTab = STATUS_TABS.find((t) => t.key === activeStatus) || STATUS_TABS[0];

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.statuses
      ? requests.filter((r) => tab.statuses.includes(r.status)).length
      : requests.length;
    return acc;
  }, {});

  const filtered = requests.filter((r) => {
    const matchStatus = !selectedTab.statuses || selectedTab.statuses.includes(r.status);
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      (r.equipment_name || '').toLowerCase().includes(q) ||
      (r.borrower_name || '').toLowerCase().includes(q) ||
      (r.student_email || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="w-full space-y-4 px-2 py-2">

        {/* ── Hero ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
              <FileDown className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Borrow Request Reports</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate and export pre-filled PDF reports for student borrow requests
              </p>
            </div>
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {STATUS_TABS.map((tab) => {
            const isActive = activeStatus === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveStatus(activeStatus === tab.key && tab.key !== 'all' ? 'all' : tab.key)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  isActive
                    ? `${tab.color} shadow-sm`
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`rounded-lg p-1.5 ${isActive ? 'bg-white/60' : 'bg-slate-100'}`}>
                  <TabIcon className="h-4 w-4" style={isActive ? { color: tab.dot } : { color: '#64748b' }} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-500">{tab.label}</p>
                  <p className="text-lg font-semibold leading-tight text-slate-900">{statusCounts[tab.key] || 0}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Table Card ── */}
        <Card className="overflow-hidden border-slate-200 shadow-none">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {selectedTab.key !== 'all' && (
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selectedTab.dot }} />
              )}
              <p className="text-sm font-medium text-slate-800">{selectedTab.label}</p>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                {filtered.length}
              </span>
              {activeStatus !== 'all' && (
                <button
                  onClick={() => setActiveStatus('all')}
                  className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by equipment or borrower..."
                value={search}
                onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                  <FileText className="h-5 w-5 text-red-400" />
                </div>
                <p className="text-sm text-slate-800">Unable to load requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                      <TableHead className="text-xs font-medium text-slate-500">Equipment</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">Borrower</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">Borrow Date</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">Return Date</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500">Submitted</TableHead>
                      <TableHead className="text-xs font-medium text-slate-500 text-center">PDF Report</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                              <FileText className="h-4 w-4 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500">No requests found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((request) => (
                        <TableRow key={request.id} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell>
                            <p className="text-sm font-medium text-slate-900">{request.equipment_name}</p>
                            <p className="text-xs text-slate-400">Qty: {request.quantity}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium text-slate-900">{request.borrower_name}</p>
                            <p className="text-xs text-slate-400">{request.student_email || request.borrower_email}</p>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {request.borrow_date && format(new Date(request.borrow_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {request.return_date && format(new Date(request.return_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={request.status} />
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {request.created_date && format(new Date(request.created_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 border-blue-200 bg-blue-50 px-2.5 text-xs text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                              onClick={() => setReportRequestId(request.id)}
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Report
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                    <p className="text-xs text-slate-500">
                      Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} requests
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline" size="icon" className="h-7 w-7"
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
                        variant="outline" size="icon" className="h-7 w-7"
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

      {reportRequestId && (
        <BorrowRequestReportModal
          requestId={reportRequestId}
          onClose={() => setReportRequestId(null)}
        />
      )}
    </>
  );
}
