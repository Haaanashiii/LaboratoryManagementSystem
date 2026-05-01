import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Package, Calendar, CheckCircle, XCircle, Loader2, Search, ShieldCheck, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, User, Clock, Hash, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useLang } from '@/components/i18n/LangContext';
import { HeadFinalApprovalSkeleton } from '@/skeleton-framework/head of lab';

const PAGE_SIZE = 10;

export default function HeadApproval() {
  const { t } = useLang();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewingRequest, setViewingRequest] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [action, setAction] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateSort, setDateSort] = useState('desc');

  const queryClient = useQueryClient();

  const hasExplicitTime = (value) => {
    return typeof value === 'string' && (value.includes('T') || value.includes(':'));
  };

  const formatBorrowReturn = (value) => {
    return format(new Date(value), hasExplicitTime(value) ? 'MMM d, yyyy h:mm a' : 'MMM d, yyyy');
  };

  const getRequestTimestamp = (request) => {
    return new Date(
      request?.created_date ||
      request?.createdAt ||
      request?.updatedAt ||
      request?.borrow_date ||
      0
    ).getTime();
  };

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['pendingHeadRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'pending_head' }),
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
    return eq?.image_url || null;
  };

  const actionMutation = useMutation({
    mutationFn: ({ id, action, remarks }) => api.entities.BorrowRequest.headAction(id, action, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingHeadRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      closeDialog();
    }
  });

  const openApproveDialog = (request) => {
    setSelectedRequest(request);
    setAction('approve');
    setRemarks('');
  };

  const openRejectDialog = (request) => {
    setSelectedRequest(request);
    setAction('reject');
    setRemarks('');
  };

  const closeDialog = () => {
    setSelectedRequest(null);
    setAction(null);
    setRemarks('');
  };

  const handleSubmit = () => {
    actionMutation.mutate({
      id: selectedRequest.id,
      action: action,
      remarks: remarks.trim()
    });
  };

  const orderedRequests = [...requests].sort((a, b) => {
    const diff = getRequestTimestamp(a) - getRequestTimestamp(b);
    return dateSort === 'desc' ? -diff : diff;
  });

  const filteredRequests = orderedRequests.filter(r =>
    r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.borrower_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) return <HeadFinalApprovalSkeleton />;

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Hero Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-green-50 border-green-200">
            <ShieldCheck className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{t('finalApprovals')}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-green-100 bg-green-50 px-4 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-100">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold leading-none tabular-nums text-green-700">{requests.length}</p>
              <p className="mt-0.5 text-[10px] font-medium text-green-500">awaiting final approval{requests.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <Card className="overflow-hidden border-slate-200 shadow-none">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
            <p className="text-sm font-medium text-slate-800">Requires your final approval</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {filteredRequests.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs px-3 text-slate-600 border-slate-200"
              onClick={() => { setCurrentPage(1); setDateSort(s => s === 'desc' ? 'asc' : 'desc'); }}
            >
              {dateSort === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
              {dateSort === 'desc' ? 'Newest first' : 'Oldest first'}
            </Button>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search equipment or borrower..."
                value={search}
                onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-800">{t('unableLoadRequests')}</p>
              <p className="max-w-xs text-center text-xs text-slate-500">
                {error?.message || t('failedConnectServer')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="text-xs font-medium text-slate-500">Equipment</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Borrower</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Borrow Period</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Purpose</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Lecturer Remarks</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Requested</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-20">
                        <div className="text-center">
                          <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-600">{t('allCaughtUp')}</p>
                          <p className="text-xs text-slate-400">
                            {search ? 'No results match your search.' : t('noPendingRequestsRequireApproval')}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRequests.map((request) => (
                      <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setViewingRequest(request)}
                              className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200 hover:border-green-300 transition-colors"
                            >
                              {getEquipmentImage(request) ? (
                                <img
                                  src={getEquipmentImage(request)}
                                  alt={request.equipment_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                            <div>
                              <button
                                type="button"
                                onClick={() => setViewingRequest(request)}
                                className="text-sm font-medium text-slate-800 hover:text-green-700 hover:underline underline-offset-2 transition-colors text-left leading-tight"
                              >
                                {request.equipment_name}
                              </button>
                              <p className="text-xs text-slate-400">{t('qty')}: {request.quantity}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{request.borrower_name}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-300 flex-shrink-0" />
                            <span>{formatBorrowReturn(request.borrow_date)} – {formatBorrowReturn(request.return_date)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[160px]">
                          {request.purpose ? (
                            <span className="truncate block" title={request.purpose}>{request.purpose}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[160px]">
                          {request.lecturer_remarks ? (
                            <span className="truncate block" title={request.lecturer_remarks}>{request.lecturer_remarks}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          {request.created_date ? format(new Date(request.created_date), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 px-2.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              onClick={() => openRejectDialog(request)}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              {t('reject')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 px-2.5 text-xs font-medium text-slate-500 hover:text-green-700 hover:bg-green-50 rounded-lg"
                              onClick={() => openApproveDialog(request)}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              {t('approve')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length}
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
                        className={`h-7 w-7 text-xs ${currentPage === page ? 'bg-green-700 hover:bg-green-800 text-white' : ''}`}
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

      {/* ── View Request Detail Modal ── */}
      <Dialog open={!!viewingRequest} onOpenChange={() => setViewingRequest(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl bg-white text-slate-900 overflow-hidden p-0 gap-0">

          {/* ── Hero ── */}
          {(() => {
            const img = viewingRequest ? getEquipmentImage(viewingRequest) : null;
            return img ? (
              <div className="relative h-48 w-full overflow-hidden">
                <img src={img} alt={viewingRequest?.equipment_name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute top-3 right-3 rounded-full bg-black/30 backdrop-blur-sm px-2.5 py-0.5">
                  <span className="text-[10px] font-medium text-white/80 tracking-wide uppercase">Borrow Request</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-8">
                  <p className="text-lg font-bold text-white leading-snug">{viewingRequest?.equipment_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Hash className="h-2.5 w-2.5" />
                      Qty {viewingRequest?.quantity}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-400/90 px-2 py-0.5 text-[10px] font-semibold text-green-900">
                      Pending Final Approval
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 px-6 py-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
                  <Package className="h-6 w-6 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Borrow Request</p>
                  <p className="text-base font-bold text-slate-900 leading-tight truncate">{viewingRequest?.equipment_name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Qty {viewingRequest?.quantity}</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">Pending Final Approval</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogTitle className="sr-only">Borrow Request — {viewingRequest?.equipment_name}</DialogTitle>

          {/* ── Body ── */}
          <div className="px-6 pt-5 pb-6 space-y-3">

            {/* Borrower + Date row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Borrower</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <User className="h-2.5 w-2.5 text-blue-500" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate">{viewingRequest?.borrower_name || '—'}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Submitted</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100">
                    <Clock className="h-2.5 w-2.5 text-violet-500" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    {viewingRequest?.created_date ? format(new Date(viewingRequest.created_date), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Borrow Period */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Borrow Period</p>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 rounded-lg bg-white border border-slate-200 px-3.5 py-2.5">
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">From</p>
                  <p className="text-xs font-semibold text-slate-800">
                    {viewingRequest?.borrow_date ? formatBorrowReturn(viewingRequest.borrow_date) : '—'}
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="h-px w-4 bg-slate-200" />
                  <div className="mx-0.5 h-1.5 w-1.5 rotate-45 border-t border-r border-slate-300" />
                </div>
                <div className="flex-1 rounded-lg bg-white border border-slate-200 px-3.5 py-2.5">
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Until</p>
                  <p className="text-xs font-semibold text-slate-800">
                    {viewingRequest?.return_date ? formatBorrowReturn(viewingRequest.return_date) : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Purpose */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Purpose</p>
              {viewingRequest?.purpose ? (
                <p className="text-xs text-slate-700 leading-relaxed">{viewingRequest.purpose}</p>
              ) : (
                <p className="text-xs italic text-slate-300">No purpose provided.</p>
              )}
            </div>

            {/* Lecturer Remarks */}
            {viewingRequest?.lecturer_remarks && (
              <div className="rounded-xl border border-green-100 bg-green-50/60 px-4 py-3.5">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-green-500 mb-1.5">Lecturer Remarks</p>
                <p className="text-xs text-slate-700 leading-relaxed">{viewingRequest.lecturer_remarks}</p>
              </div>
            )}
          </div>

          {/* ── Footer Actions ── */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              onClick={() => setViewingRequest(null)}
            >
              Close
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-xl text-xs font-semibold text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300"
              onClick={() => { setViewingRequest(null); openRejectDialog(viewingRequest); }}
            >
              <ThumbsDown className="h-3 w-3 mr-1.5" />
              {t('reject')}
            </Button>
            <Button
              size="sm"
              className="h-9 rounded-xl text-xs font-semibold bg-green-700 hover:bg-green-800 text-white shadow-sm"
              onClick={() => { setViewingRequest(null); openApproveDialog(viewingRequest); }}
            >
              <ThumbsUp className="h-3 w-3 mr-1.5" />
              {t('approve')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Approve / Reject Dialog ── */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${action === 'approve' ? 'bg-green-50' : 'bg-red-50'}`}>
                {action === 'approve'
                  ? <ThumbsUp className="h-4 w-4 text-green-700" />
                  : <ThumbsDown className="h-4 w-4 text-red-500" />
                }
              </div>
              {action === 'approve' ? t('finalApproval') : t('rejectRequest')}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              {action === 'approve'
                ? <>Give final approval for <span className="font-medium text-slate-700">{selectedRequest?.borrower_name}</span>'s request for <span className="font-medium text-slate-700">{selectedRequest?.equipment_name}</span>. This will allow the lab assistant to prepare the equipment.</>
                : <>Reject <span className="font-medium text-slate-700">{selectedRequest?.borrower_name}</span>'s request for <span className="font-medium text-slate-700">{selectedRequest?.equipment_name}</span>. The borrower will be notified.</>
              }
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                {t('remarks')}
                {action === 'reject' && <span className="ml-1 text-slate-400 text-[10px] font-normal">(optional)</span>}
              </Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={action === 'approve' ? t('optionalAddNotes') : t('provideRejectionReason')}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={closeDialog} className="text-xs">
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={actionMutation.isPending}
              className={`text-xs text-white ${action === 'approve' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {actionMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t('processing')}</>
              ) : action === 'approve' ? (
                t('approveRequest')
              ) : (
                t('rejectRequest')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}