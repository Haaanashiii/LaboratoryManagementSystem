import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, History, CheckCircle, XCircle, Package, LayoutList } from 'lucide-react';
import { format } from 'date-fns';
import { LecturerApprovalHistorySkeleton } from '@/skeleton-framework/lecturer';

const STATUS_FILTERS = [
  { key: 'all',       label: 'All',       statuses: null,        color: 'bg-slate-50 text-slate-700 border-slate-200',    dot: '#64748b', activeBg: 'bg-slate-50',   activeText: 'text-slate-700',   activeBorder: 'border-slate-300',   icon: LayoutList,    iconColor: '#64748b',   iconBg: 'bg-slate-100' },
  { key: 'forwarded', label: 'Forwarded', statuses: ['pending_head', 'head_approved', 'ready_pickup', 'borrowed', 'returned'], color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#22c55e', activeBg: 'bg-emerald-50', activeText: 'text-emerald-700', activeBorder: 'border-emerald-300', icon: CheckCircle, iconColor: '#22c55e', iconBg: 'bg-emerald-100' },
  { key: 'rejected',  label: 'Rejected',  statuses: ['rejected'], color: 'bg-red-50 text-red-700 border-red-200',          dot: '#ef4444', activeBg: 'bg-red-50',     activeText: 'text-red-700',     activeBorder: 'border-red-300',     icon: XCircle,       iconColor: '#ef4444',   iconBg: 'bg-red-100' },
];

export default function LecturerApprovalHistory() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: allEquipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
    staleTime: 5 * 60 * 1000,
  });

  const equipmentMap = useMemo(() => {
    const map = {};
    allEquipment.forEach(eq => { map[eq.id] = eq; map[eq._id] = eq; });
    return map;
  }, [allEquipment]);

  const getEquipmentImage = (request) => {
    const eqId = request?.equipment?._id || request?.equipment?.id || request?.equipment;
    const eq = eqId ? equipmentMap[eqId] : null;
    return eq?.images_urls?.[0] || eq?.image_url || null;
  };

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['lecturerApprovalHistory', user?.email],
    queryFn: () => api.entities.BorrowRequest.filter({ lecturer_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const activeFilter = STATUS_FILTERS.find(f => f.key === statusFilter) ?? STATUS_FILTERS[0];

  const filteredRequests = requests
    .filter(r => !activeFilter.statuses || activeFilter.statuses.includes(r.status))
    .filter(r =>
      r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.borrower_name?.toLowerCase().includes(search.toLowerCase())
    );

  const getCount = (filter) =>
    filter.statuses ? requests.filter(r => filter.statuses.includes(r.status)).length : requests.length;

  const activeFilterConfig = STATUS_FILTERS.find(f => f.key === statusFilter) ?? STATUS_FILTERS[0];

  if (isLoading) return <LecturerApprovalHistorySkeleton />;

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Hero Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-violet-50 border-violet-200">
            <History className="h-6 w-6 text-violet-500" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Approval History</h1>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-violet-100 bg-violet-50 px-4 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100">
            <History className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold leading-none tabular-nums text-violet-700">{requests.length}</p>
            <p className="mt-0.5 text-[10px] font-medium text-violet-500">total record{requests.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* ── Status Stat Pills ── */}
      <div className="grid grid-cols-3 gap-2">
        {STATUS_FILTERS.map((filter) => {
          const count = getCount(filter);
          const isActive = statusFilter === filter.key;
          const FilterIcon = filter.icon;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatusFilter(statusFilter === filter.key ? 'all' : filter.key)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? `${filter.color} shadow-sm`
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`rounded-lg p-1.5 ${isActive ? 'bg-white/60' : 'bg-slate-100'}`}>
                <FilterIcon className="h-4 w-4" style={isActive ? { color: filter.dot } : { color: '#64748b' }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">{filter.label}</p>
                <p className="text-lg font-semibold leading-tight text-slate-900">{count}</p>
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
            {activeFilterConfig.key !== 'all' && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeFilterConfig.dot }} />
            )}
            <p className="text-sm font-medium text-slate-800">
              {activeFilterConfig.label}
            </p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {filteredRequests.length}
            </span>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              >
                clear
              </button>
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search equipment or borrower..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <History className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-800">Unable to load history</p>
              <p className="max-w-xs text-center text-xs text-slate-500">
                {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
              </p>
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
                    <TableHead className="text-xs font-medium text-slate-500">Your Remarks</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            {requests.length === 0
                              ? <Package className="h-4 w-4 text-slate-400" />
                              : <History className="h-4 w-4 text-slate-400" />
                            }
                          </div>
                          <p className="text-sm text-slate-500">
                            {requests.length === 0 ? 'No reviews yet' : 'No results found'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {requests.length === 0 ? 'Requests you review will appear here.' : 'Try a different filter or search term.'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id} className="border-slate-50 hover:bg-slate-50/50">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 overflow-hidden">
                              {getEquipmentImage(request) ? (
                                <img
                                  src={getEquipmentImage(request)}
                                  alt={request.equipment_name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{request.equipment_name}</p>
                              <p className="text-xs text-slate-400">Qty: {request.quantity}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{request.borrower_name}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {request.borrow_date ? format(new Date(request.borrow_date), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {request.return_date ? format(new Date(request.return_date), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[200px]">
                          {request.lecturer_remarks ? (
                            <span className="truncate block" title={request.lecturer_remarks}>
                              {request.lecturer_remarks}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={request.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {filteredRequests.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Showing {filteredRequests.length} of {requests.length} record{requests.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
