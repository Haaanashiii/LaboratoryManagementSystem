import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, FileText, Clock3, CheckCircle2, RotateCcw, XCircle, Layers, ChevronLeft, ChevronRight, BarChart3, Printer } from 'lucide-react';
import { AllRequestsSkeleton } from '@/skeleton-framework/admin';
import { format } from 'date-fns';
import EquimonPageHeader from '@/components/ui/equimon/EquimonPageHeader';
import { printItsReceipt } from '@/utils/printItsReceipt';

const STATUS_TABS = [
  { key: 'all',      label: 'ALL',      statuses: null,                                           icon: Layers,       color: '#475569' },
  { key: 'pending',  label: 'PENDING',  statuses: ['Pending Lecturer', 'Pending Head'],           icon: Clock3,       color: '#d97706' },
  { key: 'approved', label: 'APPROVED', statuses: ['Approved', 'Ready for pickup', 'Borrowed'],  icon: CheckCircle2, color: '#059669' },
  { key: 'returned', label: 'RETURNED', statuses: ['Returned'],                                  icon: RotateCcw,    color: '#2563eb' },
  { key: 'rejected', label: 'REJECTED', statuses: ['Rejected'],                                  icon: XCircle,      color: '#dc2626' },
];

const CAT_COLORS = { Measurement: '#f97316', Microcontroller: '#3b82f6', Tools: '#ef4444', Power: '#8b5cf6', Optics: '#22c55e' };
const getCatColor = (cat) => CAT_COLORS[cat] || '#64748b';

const avatarColors = ['#f97316','#2563eb','#7c3aed','#059669','#dc2626','#0891b2','#d97706'];
const getAvatarColor = (name = '') => avatarColors[name.charCodeAt(0) % avatarColors.length];

const PAGE_SIZE = 10;

export default function AllRequests() {
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list('-created_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: allEquipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
    staleTime: 5 * 60 * 1000,
  });

  const equipmentMap = React.useMemo(() => {
    const map = {};
    allEquipment.forEach(eq => { map[eq.id] = eq; map[eq._id] = eq; });
    return map;
  }, [allEquipment]);

  const getEquipmentImage = (request) => {
    const eqId = request?.equipment?._id || request?.equipment?.id || request?.equipment;
    const eq = eqId ? equipmentMap[eqId] : null;
    return eq?.image_url || eq?.images_urls?.[0]
      || request.equipment_image_url
      || request.equipment?.image_url
      || null;
  };

  const accent = '#7c3aed';

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.statuses
      ? requests.filter((r) => tab.statuses.includes(r.status)).length
      : requests.length;
    return acc;
  }, {});

  const selectedTab = STATUS_TABS.find((tab) => tab.key === activeStatus) || STATUS_TABS[0];

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

  if (isLoading) return <AllRequestsSkeleton />;

  return (
    <div className="w-full space-y-5 px-2 py-3">

      {/* ── Hero Banner ── */}
      <EquimonPageHeader
        accent={accent}
        icon={BarChart3}
        title="All Requests"
        badgeCount={requests.length}
        badge="total"
        sub="Complete history of all equipment borrow requests."
      />

      {/* ── Status Filter Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setCurrentPage(1); setActiveStatus(activeStatus === tab.key && tab.key !== 'all' ? 'all' : tab.key); }}
              className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                isActive ? 'border-slate-300 bg-white shadow-md' : 'border-slate-200/70 bg-white shadow-sm'
              }`}
            >
              {isActive && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-slate-900" />}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${tab.color}15` }}>
                <TabIcon className="w-5 h-5" style={{ color: tab.color }} />
              </div>
              <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-slate-400 mb-1">{tab.label}</div>
              <div className="text-[32px] font-extrabold leading-none" style={{ color: isActive ? tab.color : '#0f172a' }}>
                {statusCounts[tab.key] || 0}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Search + Table Card ── */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by equipment, borrower, or ID..."
              value={search}
              onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
              className="pl-9 h-9 rounded-xl text-sm"
            />
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-bold transition-colors shrink-0"
            style={{ background: accent }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>

        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <FileText className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-800">Unable to load requests</p>
              <p className="max-w-xs text-center text-xs text-slate-500">{error?.message || 'Failed to connect to the server.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="pl-5 text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">Equipment</TableHead>
                    <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">Borrower</TableHead>
                    <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">Period</TableHead>
                    <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">Status</TableHead>
                    <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">Created</TableHead>
                    <TableHead className="pr-5 text-right text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <FileText className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">No requests found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRequests.map((request) => {
                      const catColor = getCatColor(request.category || request.equipment_category);
                      const initials = (request.borrower_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                      const avatarColor = getAvatarColor(request.borrower_name || '');
                      const reqId = `REQ-${new Date().getFullYear()}-${String(request.id).padStart(4, '0')}`;
                      const createdRaw = request.created_date || request.createdAt;
                      const equipImgUrl = getEquipmentImage(request);
                      return (
                        <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50/60">
                          {/* Equipment */}
                          <TableCell className="pl-5 py-4">
                            <div className="flex items-center gap-3">
                              {equipImgUrl ? (
                                <img src={equipImgUrl} alt={request.equipment_name} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-100" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${catColor}15` }}>
                                  <FileText className="w-4 h-4" style={{ color: catColor }} />
                                </div>
                              )}
                              <div>
                                <p className="text-[13px] font-bold text-slate-900 leading-tight">{request.equipment_name}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Qty: {request.quantity} · {reqId}</p>
                              </div>
                            </div>
                          </TableCell>
                          {/* Borrower */}
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ background: avatarColor }}>
                                {initials}
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-slate-800 leading-tight">{request.borrower_name || '—'}</p>
                                <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{request.student_email || request.borrower_email || '—'}</p>
                              </div>
                            </div>
                          </TableCell>
                          {/* Period */}
                          <TableCell className="py-4">
                            <p className="text-[12px] text-slate-700 leading-relaxed">
                              {request.borrow_date ? format(new Date(request.borrow_date), 'MMM d, yyyy') : '—'}
                            </p>
                            {request.return_date && (
                              <p className="text-[11px] text-slate-400">→ {format(new Date(request.return_date), 'MMM d, yyyy')}</p>
                            )}
                          </TableCell>
                          {/* Status */}
                          <TableCell className="py-4">
                            <StatusBadge status={request.status} />
                          </TableCell>
                          {/* Created */}
                          <TableCell className="py-4">
                            {createdRaw ? (
                              <>
                                <p className="text-[12px] text-slate-700">{format(new Date(createdRaw), 'EEE, MMM d')}</p>
                                <p className="text-[11px] text-slate-400">{format(new Date(createdRaw), 'HH:mm')}</p>
                              </>
                            ) : '—'}
                          </TableCell>
                          {/* Actions */}
                          <TableCell className="pr-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => printItsReceipt(request)}
                                className="px-3 py-1.5 rounded-lg text-white text-[12px] font-bold transition-colors"
                                style={{ background: accent }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                              >
                                Review
                              </button>
                              <button
                                onClick={() => printItsReceipt(request)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                                title="Print receipt"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                  <p className="text-xs text-slate-500">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length} requests
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="icon"
                        className={`h-7 w-7 text-xs ${currentPage === page ? 'text-white' : ''}`}
                        style={currentPage === page ? { background: accent } : {}}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
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
