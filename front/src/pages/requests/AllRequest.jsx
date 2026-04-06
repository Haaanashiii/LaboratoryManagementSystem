import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText, Clock3, CheckCircle2, RotateCcw } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format } from 'date-fns';

const STATUS_TABS = [
  { key: 'all', label: 'All Requests', statuses: null },
  { key: 'pending', label: 'Pending', statuses: ['Pending Lecturer', 'Pending Head'] },
  { key: 'approved', label: 'Approved', statuses: ['Approved', 'Ready for pickup', 'Borrowed'] },
  { key: 'returned', label: 'Returned', statuses: ['Returned'] },
  { key: 'rejected', label: 'Rejected', statuses: ['Rejected'] },
];

export default function AllRequests() {
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list('-created_date'),
  });

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    if (!tab.statuses) {
      acc[tab.key] = requests.length;
      return acc;
    }

    acc[tab.key] = requests.filter((request) => tab.statuses.includes(request.status)).length;
    return acc;
  }, {});

  const selectedTab = STATUS_TABS.find((tab) => tab.key === activeStatus) || STATUS_TABS[0];

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      request.borrower_name?.toLowerCase().includes(search.toLowerCase()) ||
      request.borrower_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !selectedTab.statuses || selectedTab.statuses.includes(request.status);
    return matchesSearch && matchesStatus;
  });

  const pendingCount = statusCounts.pending || 0;
  const approvedCount = statusCounts.approved || 0;
  const returnedCount = statusCounts.returned || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 relative">
        <BanterLoader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto space-y-5 py-4 px-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">All Requests</h1>
          <p className="mt-0.5 text-sm text-slate-500">Complete list of all equipment borrowing requests.</p>
        </div>
        <hr className="border-slate-200" />
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm font-medium text-slate-900">Unable to load requests</p>
            <p className="text-xs text-slate-500 max-w-sm">
              {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 py-4 px-4">

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
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveStatus(tab.key)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                activeStatus === tab.key
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeStatus === tab.key ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {statusCounts[tab.key] || 0}
              </span>
            </button>
          ))}
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