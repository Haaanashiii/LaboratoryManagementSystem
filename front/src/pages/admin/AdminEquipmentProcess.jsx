import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Activity, Search, ChevronLeft, ChevronRight, ChevronDown,
  Layers, Clock3, CheckCircle2, RotateCcw, XCircle, Laptop,
  FilePlus2, UserCheck, BadgeCheck, PackageCheck, X, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

/* ─── Status filter cards ─────────────────────────────────────────────────── */
const STATUS_TABS = [
  { key: 'all',      label: 'All',        statuses: null,                                                          icon: Layers,       dot: '#475569', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { key: 'pending',  label: 'Pending',    statuses: ['pending_lecturer', 'pending_head'],                          icon: Clock3,       dot: '#d97706', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'approved', label: 'Approved',   statuses: ['head_approved', 'ready_pickup'],                             icon: CheckCircle2, dot: '#2563eb', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'borrowed', label: 'Borrowed',   statuses: ['borrowed'],                                                  icon: Laptop,       dot: '#7c3aed', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'returned', label: 'Returned',   statuses: ['returned'],                                                  icon: RotateCcw,    dot: '#059669', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'rejected', label: 'Rejected',   statuses: ['rejected'],                                                  icon: XCircle,      dot: '#dc2626', color: 'bg-red-50 text-red-700 border-red-200' },
];

/* ─── Journey steps ───────────────────────────────────────────────────────── */
const JOURNEY_STEPS = [
  { key: 'pending_lecturer', label: 'Submitted'     },
  { key: 'pending_head',     label: 'Lec. Approved' },
  { key: 'head_approved',    label: 'Head Approved' },
  { key: 'ready_pickup',     label: 'Ready Pickup'  },
  { key: 'borrowed',         label: 'Borrowed'      },
  { key: 'returned',         label: 'Returned'      },
];

const PAGE_SIZE = 15;

/* ─── Inline progress tracker ─────────────────────────────────────────────── */
function ProgressTracker({ status }) {
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
        <X className="h-3.5 w-3.5 flex-shrink-0" />
        Request was rejected
      </div>
    );
  }

  const currentStep = Math.max(1, JOURNEY_STEPS.findIndex(s => s.key === status) + 1);
  const progress    = (currentStep / JOURNEY_STEPS.length) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">Progress</span>
        <span className="text-xs text-slate-400">Step {currentStep} of {JOURNEY_STEPS.length}</span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid grid-cols-6 gap-1">
        {JOURNEY_STEPS.map((step, idx) => {
          const num       = idx + 1;
          const isDone    = currentStep > num;
          const isCurrent = currentStep === num;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1 text-center">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                isDone    ? 'bg-blue-600 text-white' :
                isCurrent ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' :
                            'bg-slate-200 text-slate-400'
              }`}>{num}</div>
              <span className={`text-[9px] leading-tight ${isDone || isCurrent ? 'text-slate-700' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function AdminEquipmentProcess() {
  const [search, setSearch]         = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [currentPage, setCurrentPage]   = useState(1);
  const [expandedId, setExpandedId]     = useState(null);

  const { data: requests = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list('-created_date'),
  });

  React.useEffect(() => { setCurrentPage(1); }, [search, activeStatus]);

  /* ── derived ── */
  const selectedTab = STATUS_TABS.find(t => t.key === activeStatus) ?? STATUS_TABS[0];

  const statusCounts = useMemo(() =>
    STATUS_TABS.reduce((acc, tab) => {
      acc[tab.key] = tab.statuses
        ? requests.filter(r => tab.statuses.includes(r.status)).length
        : requests.length;
      return acc;
    }, {}),
  [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter(r => {
      const matchStatus = !selectedTab.statuses || selectedTab.statuses.includes(r.status);
      const matchSearch = !q ||
        (r.equipment_name || '').toLowerCase().includes(q) ||
        (r.borrower_name  || '').toLowerCase().includes(q) ||
        (r.student_email  || '').toLowerCase().includes(q) ||
        (r.borrower_email || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [requests, selectedTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* ── time-based icon colour (same pattern as AdminAuditLogs) ── */
  const h = new Date().getHours();
  const gc =
    h < 12 ? { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' } :
    h < 18 ? { color: '#f97316', bg: '#fff7ed', border: '#fed7aa' } :
             { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };

  /* ── loading skeleton ── */
  if (isLoading) {
    return (
      <div className="w-full space-y-4 px-2 py-2">
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white h-24 shadow-sm" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white h-16" />
          ))}
        </div>
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white h-64" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Hero banner ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
            style={{ backgroundColor: gc.bg, borderColor: gc.border }}
          >
            <Activity className="h-6 w-6" style={{ color: gc.color }} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Equipment Process</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor the ongoing progress of all borrow requests system-wide
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* ── Status stat cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STATUS_TABS.map(tab => {
          const isActive = activeStatus === tab.key;
          const TabIcon  = tab.icon;
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
                <p className="text-lg font-semibold leading-tight text-slate-900">{statusCounts[tab.key] ?? 0}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Table card ─────────────────────────────────────────────── */}
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
              placeholder="Search equipment or borrower…"
              value={search}
              onChange={e => { setCurrentPage(1); setSearch(e.target.value); }}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-800">Unable to load requests</p>
              <p className="max-w-xs text-center text-xs text-slate-500">
                {error?.message || 'Failed to connect to the server.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="w-8" />
                    <TableHead className="text-xs font-medium text-slate-500">Equipment</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Borrower</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Borrow Date</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Return Date</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <Activity className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">No requests found</p>
                          <p className="text-xs text-slate-400">Try adjusting the filter or search above.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map(request => {
                      const id        = request._id || request.id;
                      const isExpanded = expandedId === id;
                      return (
                        <React.Fragment key={id}>
                          <TableRow
                            className="cursor-pointer border-slate-50 hover:bg-slate-50/50"
                            onClick={() => setExpandedId(isExpanded ? null : id)}
                          >
                            <TableCell className="pl-4 pr-2">
                              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium text-slate-900">{request.equipment_name}</p>
                              <p className="text-xs text-slate-400">Qty: {request.quantity}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium text-slate-900">{request.borrower_name || '—'}</p>
                              <p className="text-xs text-slate-400">{request.student_email || request.borrower_email || ''}</p>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {request.borrow_date ? format(new Date(request.borrow_date), 'MMM d, yyyy') : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {request.return_date ? format(new Date(request.return_date), 'MMM d, yyyy') : '—'}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={request.status} />
                            </TableCell>
                            <TableCell className="text-xs text-slate-400">
                              {request.created_date
                                ? format(new Date(request.created_date), 'MMM d, yyyy')
                                : request.createdAt
                                ? format(new Date(request.createdAt), 'MMM d, yyyy')
                                : '—'}
                            </TableCell>
                          </TableRow>

                          {/* Expandable progress row */}
                          {isExpanded && (
                            <TableRow className="border-slate-50 bg-slate-50/40 hover:bg-slate-50/40">
                              <TableCell colSpan={7} className="px-6 py-4">
                                <ProgressTracker status={request.status} />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} requests
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={safePage === page ? 'default' : 'outline'}
                        size="icon"
                        className={`h-7 w-7 text-xs ${safePage === page ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
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
