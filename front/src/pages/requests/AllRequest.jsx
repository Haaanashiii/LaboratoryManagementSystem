import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, FileText, Clock3, CheckCircle2, RotateCcw, XCircle, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format } from 'date-fns';

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: 'all',      label: 'All',      statuses: null,                                              color: 'bg-slate-50 text-slate-700 border-slate-200',   dot: '#64748b', icon: Layers },
  { key: 'pending',  label: 'Pending',  statuses: ['Pending Lecturer', 'Pending Head'],              color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: '#f59e0b', icon: Clock3 },
  { key: 'approved', label: 'Approved', statuses: ['Approved', 'Ready for pickup', 'Borrowed'],      color: 'bg-blue-50 text-blue-700 border-blue-200',      dot: '#3b82f6', icon: CheckCircle2 },
  { key: 'returned', label: 'Returned', statuses: ['Returned'],                                      color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#22c55e', icon: RotateCcw },
  { key: 'rejected', label: 'Rejected', statuses: ['Rejected'],                                      color: 'bg-red-50 text-red-700 border-red-200',         dot: '#ef4444', icon: XCircle },
];

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
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">All Requests</h1>
          <p className="mt-0.5 text-sm text-slate-500">Complete list of all equipment borrowing requests.</p>
        </div>
        <Card className="border-slate-200 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <FileText className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-sm font-medium text-slate-800">Unable to load requests</p>
            <p className="max-w-xs text-center text-xs text-slate-500">
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
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">All Requests</h1>
        <p className="mt-0.5 text-sm text-slate-500">{requests.length} total borrowing requests</p>
      </div>

      {/* Status filter pills */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.key;
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

      {/* Table card */}
      <Card className="border-slate-200 shadow-none overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selectedTab.dot }} />
            <p className="text-sm font-medium text-slate-800">{selectedTab.label}</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {filteredRequests.length}
            </span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by equipment or borrower..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="text-xs font-medium text-slate-500">Equipment</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">Borrower</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">Borrow Date</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">Return Date</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                          <FileText className="h-4 w-4 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500">No requests found</p>
                        <p className="text-xs text-slate-400">Try adjusting your search or filter.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRequests.map((request) => (
                    <TableRow key={request.id} className="border-slate-50 hover:bg-slate-50/50">
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length} requests
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
                      className={`h-7 w-7 text-xs ${currentPage === page ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
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
        </CardContent>
      </Card>
    </div>
  );
}