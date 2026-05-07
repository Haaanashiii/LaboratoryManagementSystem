import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, CheckCircle, Loader2, Search, ChevronLeft, ChevronRight, ClipboardList, User, Hash, FileText } from 'lucide-react';
import { EquipmentPreparationSkeleton } from '@/skeleton-framework/admin';
import { format } from 'date-fns';
import { useLang } from '@/components/i18n/LangContext';

const PAGE_SIZE = 10;

const SECTION_CONFIG = [
  { key: 'all',     labelKey: 'all',             color: 'bg-slate-100 text-slate-700 border-slate-300',   dot: '#475569', icon: ClipboardList },
  { key: 'prepare', labelKey: 'needsPreparation', color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: '#d97706', icon: Package },
  { key: 'release', labelKey: 'readyPickup',      color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: '#6366f1', icon: CheckCircle },
];

const STATUS_COLOR = {
  head_approved: 'bg-amber-50 text-amber-700 border-amber-200',
  ready_pickup:  'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const STATUS_LABEL_KEY = {
  head_approved: 'needsPreparation',
  ready_pickup:  'readyPickup',
};

export default function EquipmentPrep() {
  const { t } = useLang();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dialogAction, setDialogAction] = useState(null);
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: approvedRequests = [], isLoading: loadingApproved, isError: errorApproved, error: errorMsgApproved } = useQuery({
    queryKey: ['approvedRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'head_approved' }, '-created_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: readyRequests = [], isLoading: loadingReady, isError: errorReady, error: errorMsgReady } = useQuery({
    queryKey: ['readyRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'ready_pickup' }, '-created_date'),
  });

  const prepareMutation = useMutation({
    mutationFn: (id) => api.entities.BorrowRequest.prepare(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['readyRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (id) => api.entities.BorrowRequest.release(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readyRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
    },
  });

  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  const openPrepareDialog = (request) => { setSelectedRequest(request); setDialogAction('prepare'); };
  const openReleaseDialog = (request) => { setSelectedRequest(request); setDialogAction('release'); };
  const closeDialog = () => { setSelectedRequest(null); setDialogAction(null); };

  const handlePreviewPdf = async (request) => {
    if (!request?.id) return;
    setPdfLoadingId(request.id);
    try {
      const blob = await api.entities.BorrowRequest.getPdfBlob(request.id, true);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error('PDF preview failed:', err);
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleConfirm = () => {
    if (dialogAction === 'prepare') prepareMutation.mutate(selectedRequest.id);
    else releaseMutation.mutate(selectedRequest.id);
  };

  const handleSectionChange = (key) => { setActiveSection(key); setCurrentPage(1); };

  const isPending = prepareMutation.isPending || releaseMutation.isPending;
  const isLoading = loadingApproved || loadingReady;
  const isError = errorApproved || errorReady;
  const error = errorMsgApproved || errorMsgReady;

  const allRequests = [
    ...approvedRequests.map((r) => ({ ...r, _section: 'prepare' })),
    ...readyRequests.map((r) => ({ ...r, _section: 'release' })),
  ];

  const sectionCounts = {
    all: allRequests.length,
    prepare: approvedRequests.length,
    release: readyRequests.length,
  };

  const sectionFiltered = activeSection === 'all'
    ? allRequests
    : allRequests.filter((r) => r._section === activeSection);

  const filtered = sectionFiltered.filter((r) =>
    !search || r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.borrower_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeConfig = SECTION_CONFIG.find((c) => c.key === activeSection) || SECTION_CONFIG[0];

  const h = new Date().getHours();
  const gc =
    h < 12 ? { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' } :
    h < 18 ? { color: '#f97316', bg: '#fff7ed', border: '#fed7aa' } :
             { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Hero Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
            style={{ backgroundColor: gc.bg, borderColor: gc.border }}
          >
            <CheckCircle className="h-6 w-6" style={{ color: gc.color }} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{t('equipmentPreparation')}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SECTION_CONFIG.map((cfg) => {
          const count = sectionCounts[cfg.key] ?? 0;
          const isActive = activeSection === cfg.key;
          const CfgIcon = cfg.icon;
          return (
            <button
              key={cfg.key}
              type="button"
              onClick={() => handleSectionChange(cfg.key)}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? `${cfg.color} shadow-sm`
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`rounded-lg p-1.5 ${isActive ? 'bg-white/60' : 'bg-slate-100'}`}>
                <CfgIcon className="h-4 w-4" style={isActive ? { color: cfg.dot } : { color: '#64748b' }} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-slate-500">{t(cfg.labelKey)}</p>
                <p className="text-lg font-semibold leading-tight text-slate-900">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden border-slate-200 shadow-none">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {activeSection !== 'all' && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeConfig.dot }} />
            )}
            <p className="text-sm font-medium text-slate-800">{t(activeConfig.labelKey)}</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {filtered.length}
            </span>
            {activeSection !== 'all' && (
              <button
                onClick={() => handleSectionChange('all')}
                className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              >
                {t('clear')}
              </button>
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t('searchEquipmentOrBorrower')}
              value={search}
              onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <EquipmentPreparationSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <Package className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-800">{t('unableLoadEquipmentRequests')}</p>
              <p className="max-w-xs text-center text-xs text-slate-500">
                {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="text-xs font-medium text-slate-500">{t('equipment')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('borrower')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('qty')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('borrowDate')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('status')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('preview')}</TableHead>
                    <TableHead className="text-right text-xs font-medium text-slate-500">{t('action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <td colSpan={7} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <Package className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">{t('noEquipmentToPrepare')}</p>
                          <p className="text-xs text-slate-400">{t('allEquipmentPreparedAndDistributed')}</p>
                        </div>
                      </td>
                    </TableRow>
                  ) : (
                    paginated.map((request) => {
                      const statusColor = STATUS_COLOR[request.status] ?? 'bg-slate-100 text-slate-500 border-slate-200';
                      const statusLabel = t(STATUS_LABEL_KEY[request.status] ?? request.status);
                      return (
                        <TableRow key={request.id} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell>
                            <span className="text-sm font-medium text-slate-900">{request.equipment_name}</span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{request.borrower_name}</TableCell>
                          <TableCell className="text-xs text-slate-500">{request.quantity}</TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {format(new Date(request.borrow_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 px-2.5 text-xs font-medium text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                              onClick={() => handlePreviewPdf(request)}
                              disabled={pdfLoadingId === request.id}
                            >
                              {pdfLoadingId === request.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileText className="h-3.5 w-3.5" />
                              )}
                              PDF
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            {request._section === 'prepare' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1.5 px-2.5 text-xs font-medium text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                                onClick={() => openPrepareDialog(request)}
                                disabled={isPending}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                {t('markReady')}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1.5 px-2.5 text-xs font-medium text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
                                onClick={() => openReleaseDialog(request)}
                                disabled={isPending}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                {t('confirmPickup')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    {t('showing')} {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} {t('ofLabel')} {filtered.length}
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
                        className={`h-7 w-7 text-xs ${currentPage === page ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
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

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${dialogAction === 'prepare' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                <CheckCircle className={`h-4 w-4 ${dialogAction === 'prepare' ? 'text-amber-600' : 'text-indigo-600'}`} />
              </div>
              {dialogAction === 'prepare' ? t('markEquipmentReady') : t('confirmPickup')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('equipment')}</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedRequest?.equipment_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('borrower')}</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedRequest?.borrower_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Hash className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{t('quantity')}</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedRequest?.quantity}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              {dialogAction === 'prepare' ? t('reserveEquipmentMessage') : t('confirmPickupMessage')}
            </p>
          </div>
          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={closeDialog} className="text-xs">
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isPending}
              className={`text-xs text-white ${dialogAction === 'prepare' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t('processing')}</>
              ) : dialogAction === 'prepare' ? (
                t('markAsReady')
              ) : (
                t('confirmPickup')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}