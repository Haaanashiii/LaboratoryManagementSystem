import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Package, Calendar, CheckCircle, XCircle, Loader2, Search, ClipboardList, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format } from 'date-fns';
import { useLang } from '@/components/i18n/LangContext';

const PAGE_SIZE = 10;

export default function LecturerApprovals() {
  const { t } = useLang();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [action, setAction] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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
    queryKey: ['pendingLecturerRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'pending_lecturer' }, '-created_date'),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, remarks }) => api.entities.BorrowRequest.lecturerAction(id, action, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingLecturerRequests'] });
      queryClient.invalidateQueries({ queryKey: ['lecturerRequests'] });
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

  const orderedRequests = [...requests].sort((a, b) => getRequestTimestamp(a) - getRequestTimestamp(b));

  const filteredRequests = orderedRequests.filter(r =>
    r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.borrower_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 relative">
        <BanterLoader />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{t('pendingApprovals')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('pendingApprovalsDesc')}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
            <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">{requests.length} Pending</span>
          </div>
        </div>
      </div>

      {/* Card with Table */}
      <Card className="overflow-hidden border-slate-200 shadow-none">

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <p className="text-sm font-medium text-slate-800">Awaiting your review</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {filteredRequests.length}
            </span>
          </div>
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
                    <TableHead className="text-xs font-medium text-slate-500">Requested</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-20">
                        <div className="text-center">
                          <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-600">{t('allCaughtUp')}</p>
                          <p className="text-xs text-slate-400">
                            {search ? 'No results match your search.' : t('noPendingRequestsRequireVerification')}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRequests.map((request) => (
                      <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <Package className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 leading-tight">{request.equipment_name}</p>
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
                        <TableCell className="text-xs text-slate-500 max-w-[180px]">
                          {request.purpose ? (
                            <span className="truncate block" title={request.purpose}>{request.purpose}</span>
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
                              className="h-7 gap-1.5 px-2.5 text-xs font-medium text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                              onClick={() => openApproveDialog(request)}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              {t('verify')}
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
          )}
        </CardContent>
      </Card>

      {/* Approve / Reject Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl overflow-hidden p-0">

          {/* Illustration area */}
          <div className={`flex flex-col items-center px-6 pt-7 pb-5 ${action === 'approve' ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ring-4 ${action === 'approve' ? 'bg-white ring-emerald-100' : 'bg-white ring-red-100'}`}>
              {action === 'approve'
                ? <ThumbsUp className="h-6 w-6 text-emerald-500" />
                : <ThumbsDown className="h-6 w-6 text-red-500" />
              }
            </div>
            <DialogTitle className="mt-3 text-sm font-semibold text-slate-900">
              {action === 'approve' ? t('verifyRequest') : t('rejectRequest')}
            </DialogTitle>
            <p className="mt-1 text-center text-xs text-slate-500 leading-relaxed">
              {action === 'approve'
                ? <>Verify <span className="font-medium text-slate-700">{selectedRequest?.borrower_name}</span>'s request for <span className="font-medium text-slate-700">{selectedRequest?.equipment_name}</span>. This forwards to the Head of Lab.</>
                : <>Reject <span className="font-medium text-slate-700">{selectedRequest?.borrower_name}</span>'s request for <span className="font-medium text-slate-700">{selectedRequest?.equipment_name}</span>. The borrower will be notified.</>
              }
            </p>
          </div>

          {/* Remarks */}
          <div className="px-5 py-4 bg-white space-y-1.5">
            <label className="text-xs font-medium text-slate-600">
              {t('remarks')}
              {action === 'reject' && <span className="ml-1 text-red-500">*</span>}
            </label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={action === 'approve' ? t('optionalAddNotesInstructions') : t('provideRejectionReason')}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 bg-white px-5 pb-5">
            <Button
              variant="outline"
              className="h-9 flex-1 rounded-lg text-xs"
              onClick={closeDialog}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={actionMutation.isPending || (action === 'reject' && !remarks.trim())}
              className={`h-9 flex-1 rounded-lg text-xs text-white ${action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {actionMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t('processing')}</>
              ) : action === 'approve' ? (
                t('verifyAndForward')
              ) : (
                t('rejectRequest')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}