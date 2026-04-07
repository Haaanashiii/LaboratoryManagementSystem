import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, FileText, Clock3, CheckCircle2, RotateCcw, XCircle, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import BanterLoader from '@/components/ui/BanterLoader';
import { format } from 'date-fns';

const STATUS_TABS = [
  { key: 'all',      label: 'All Requests', statuses: null,                                             icon: Layers,       color: 'border-slate-300 bg-slate-100 text-slate-900',   dot: '#475569' },
  { key: 'pending',  label: 'Pending',      statuses: ['Pending Lecturer', 'Pending Head'],          icon: Clock3,       color: 'border-amber-300 bg-amber-50 text-amber-900',    dot: '#d97706' },
  { key: 'approved', label: 'Approved',     statuses: ['Approved', 'Ready for pickup', 'Borrowed'],  icon: CheckCircle2, color: 'border-blue-300 bg-blue-50 text-blue-900',      dot: '#2563eb' },
  { key: 'returned', label: 'Returned',     statuses: ['Returned'],                                  icon: RotateCcw,    color: 'border-emerald-300 bg-emerald-50 text-emerald-900', dot: '#059669' },
  { key: 'rejected', label: 'Rejected',     statuses: ['Rejected'],                                  icon: XCircle,      color: 'border-red-300 bg-red-50 text-red-900',         dot: '#dc2626' },
];

const PAGE_SIZE = 10;

export default function AllRequests() {
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list('-created_date'),
  });

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.statuses
      ? requests.filter((r) => tab.statuses.includes(r.status)).length
      : requests.length;
    return acc;
  }, {});

  const selectedTab = STATUS_TABS.find((tab) => tab.key === activeStatus) || STATUS_TABS[0];

  const pendingCount  = statusCounts['pending']  || 0;
  const approvedCount = statusCounts['approved'] || 0;
  const returnedCount = statusCounts['returned'] || 0;

  // Reset page when filters change
  React.useEffect(() => { setCurrentPage(1); }, [search, activeStatus]);

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      request.borrower_name?.toLowerCase().includes(search.toLowerCase()) ||
      request.borrower_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !selectedTab.statuses || selectedTab.statuses.includes(request.status);
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 relative">
        <BanterLoader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto space-y-4 py-4 px-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">All Requests</h1>
          <p className="mt-0.5 text-sm text-slate-500">Complete list of all equipment borrowing requests.</p>
        </div>
        <Card className="border-slate-200 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <FileText className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-sm font-medium text-slate-900">Unable to load requests</p>
            <p className="text-xs text-slate-500 max-w-sm">
              {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 py-4 px-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">All Requests</h1>
        <p className="mt-0.5 text-sm text-slate-500">Complete list of all equipment borrowing requests.</p>
      </div>

      <hr className="border-slate-200" />

      {/* Quick Stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
          <div className="flex items-center gap-2 text-amber-700">
            <Clock3 className="w-4 h-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Pending Queue</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-900">{pendingCount}</p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3">
          <div className="flex items-center gap-2 text-blue-700">
            <CheckCircle2 className="w-4 h-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Approved Flow</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-900">{approvedCount}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <RotateCcw className="w-4 h-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Returned</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{returnedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          {STATUS_TABS.map((tab) => {
            const isActive = tab.key === activeStatus;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveStatus(tab.key)}
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
                  <p className="text-xs text-slate-500 truncate">{tab.label}</p>
                  <p className="text-lg font-semibold leading-tight text-slate-900">{statusCounts[tab.key] || 0}</p>
                </div>
              </button>
            );
          })}
      </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search by equipment or borrower..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
          <p className="text-sm font-medium text-slate-700">Showing {filteredRequests.length} requests</p>
          <Badge variant="secondary" className="text-xs">{selectedTab.label}</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-xs font-medium text-slate-500">Equipment</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Borrower</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Borrow Date</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Return Date</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-20">
                    <div className="text-center">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-600">No requests found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search or filter.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">{request.equipment_name}</p>
                      <p className="text-xs text-slate-400">Qty: {request.quantity}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">{request.borrower_name}</p>
                      <p className="text-xs text-slate-400">{request.borrower_email}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {request.borrow_date && format(new Date(request.borrow_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {request.return_date && format(new Date(request.return_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {request.created_date && format(new Date(request.created_date), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}