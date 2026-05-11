import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, RotateCcw, AlertTriangle, Loader2, Search, ChevronLeft, ChevronRight, ClipboardList, CalendarClock, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { AssistantReturnsSkeleton } from '@/skeleton-framework/assistant';
import { useLang } from '@/components/i18n/LangContext';

const PAGE_SIZE = 10;

const SECTION_CONFIG = [
  { key: 'all',     labelKey: 'all',           color: 'bg-slate-100 text-slate-700 border-slate-300', dot: '#475569', icon: ClipboardList },
  { key: 'overdue', labelKey: 'overdue',        color: 'bg-red-50 text-red-700 border-red-200',        dot: '#ef4444', icon: AlertTriangle },
  { key: 'regular', labelKey: 'regularReturns', color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: '#3b82f6', icon: RotateCcw },
];

export default function Returns() {
  const { t } = useLang();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [damageDetails, setDamageDetails] = useState('');
  const [damageImage, setDamageImage] = useState(null);
  const [studentWillReplace, setStudentWillReplace] = useState('');
  const [replacementCompleted, setReplacementCompleted] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [extensionRequest, setExtensionRequest] = useState(null);
  const [extensionNote, setExtensionNote] = useState('');
  const [extensionAction, setExtensionAction] = useState(null);

  const queryClient = useQueryClient();

  const { data: borrowedRequests = [], isLoading, isError, error } = useQuery({
    queryKey: ['borrowedRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'borrowed' }, '-created_date'),
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, returnData }) => api.entities.BorrowRequest.return(id, returnData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
    }
  });

  const extensionMutation = useMutation({
    mutationFn: ({ id, action, note }) => api.entities.BorrowRequest.reviewExtension(id, action, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowedRequests'] });
      setExtensionRequest(null);
      setExtensionNote('');
      setExtensionAction(null);
    }
  });

  const openReturnDialog = (request) => {
    setSelectedRequest(request);
    setReturnCondition('Good');
    setReturnRemarks('');
    setDamageDetails('');
    setDamageImage(null);
    setStudentWillReplace('');
    setReplacementCompleted('');
  };

  const closeDialog = () => {
    setSelectedRequest(null);
  };

  const handleConditionChange = (value) => {
    setReturnCondition(value);

    if (value === 'Good') {
      setDamageDetails('');
      setDamageImage(null);
      setStudentWillReplace('');
      setReplacementCompleted('');
      return;
    }

    if (value === 'Damaged') {
      setStudentWillReplace('');
      setReplacementCompleted('');
      return;
    }

    if (value === 'Lost') {
      setDamageDetails('');
      setStudentWillReplace('yes');
      setReplacementCompleted('');
    }
  };

  const handleDamageImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setDamageImage(file);
  };

  const handleDamageDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) setDamageImage(file);
  };

  const handleStudentReplacementChange = (value) => {
    setStudentWillReplace(value);
    if (value !== 'yes') {
      setReplacementCompleted('');
    }
  };

  const handleReturn = (returnedEarly = false) => {
    const willReplace = returnCondition === 'Lost' ? true : studentWillReplace === 'yes';
    const hasReplacementTracking = returnCondition === 'Lost' || willReplace;

    returnMutation.mutate({
      id: selectedRequest.id,
      returnData: {
        return_condition: returnCondition,
        return_remarks: returnRemarks,
        damage_details: returnCondition === 'Damaged' ? damageDetails : '',
        damage_image: returnCondition === 'Damaged' ? damageImage : null,
        student_will_replace: returnCondition === 'Good' ? false : willReplace,
        replacement_completed: hasReplacementTracking ? replacementCompleted === 'yes' : false,
        returned_early: returnedEarly,
      }
    });
  };

  const shouldRequireRemarks = returnCondition !== 'Good';
  const shouldRequireDamageDetails = returnCondition === 'Damaged';
  const shouldRequireReplacementDecision = returnCondition === 'Damaged';
  const shouldTrackReplacement = returnCondition === 'Lost' || (returnCondition === 'Damaged' && studentWillReplace === 'yes');

  const isFormInvalid =
    (shouldRequireRemarks && !returnRemarks.trim()) ||
    (shouldRequireDamageDetails && !damageDetails.trim()) ||
    (shouldRequireReplacementDecision && studentWillReplace === '') ||
    (shouldTrackReplacement && replacementCompleted === '');

  const isOverdue = (returnDate) => new Date(returnDate) < new Date();

  const handleSectionChange = (key) => { setActiveSection(key); setCurrentPage(1); };

  const allRequests = [
    ...borrowedRequests
      .filter((r) => isOverdue(r.return_date))
      .sort((a, b) => new Date(a.return_date).getTime() - new Date(b.return_date).getTime())
      .map((r) => ({ ...r, _section: 'overdue' })),
    ...borrowedRequests
      .filter((r) => !isOverdue(r.return_date))
      .sort((a, b) => {
        const ts = (req) => new Date(req?.released_at || req?.borrow_date || req?.created_date || req?.createdAt || 0).getTime();
        return ts(a) - ts(b);
      })
      .map((r) => ({ ...r, _section: 'regular' })),
  ];

  const sectionCounts = {
    all: allRequests.length,
    overdue: allRequests.filter((r) => r._section === 'overdue').length,
    regular: allRequests.filter((r) => r._section === 'regular').length,
  };

  const sectionFiltered = activeSection === 'all'
    ? allRequests
    : allRequests.filter((r) => r._section === activeSection);

  const filtered = sectionFiltered.filter((r) =>
    !search ||
    r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.borrower_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeConfig = SECTION_CONFIG.find((c) => c.key === activeSection) || SECTION_CONFIG[0];

  const pendingExtensions = borrowedRequests.filter(
    (r) => r.extension_request?.status === 'pending' && r.extension_request?.requested_date
  );

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
            <RotateCcw className="h-6 w-6" style={{ color: gc.color }} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{t('equipmentReturns')}</h1>
          </div>
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

      {/* Extension Requests Section */}
      {pendingExtensions.length > 0 && (
        <Card className="overflow-hidden border-amber-200 shadow-none">
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3">
            <CalendarClock className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-800">{t('pendingExtensions')}</p>
            <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-xs font-medium text-amber-700">
              {pendingExtensions.length}
            </span>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-amber-100 bg-amber-50/50 hover:bg-amber-50/50">
                  <TableHead className="text-xs font-medium text-slate-500">{t('equipment')}</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">{t('borrower')}</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">{t('currentReturnDate')}</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">{t('requestedNewDate')}</TableHead>
                  <TableHead className="text-right text-xs font-medium text-slate-500">{t('action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingExtensions.map((req) => (
                  <TableRow key={`ext-${req.id}`} className="border-amber-50 hover:bg-amber-50/30">
                    <TableCell className="text-sm font-medium text-slate-900">{req.equipment_name}</TableCell>
                    <TableCell className="text-xs text-slate-500">{req.borrower_name}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(req.return_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-amber-700">
                      {format(new Date(req.extension_request.requested_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          onClick={() => { setExtensionRequest(req); setExtensionAction('approve'); setExtensionNote(''); }}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t('approveExtension')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          onClick={() => { setExtensionRequest(req); setExtensionAction('reject'); setExtensionNote(''); }}
                        >
                          <X className="h-3.5 w-3.5" />
                          {t('rejectExtension')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
            <AssistantReturnsSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <RotateCcw className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-800">{t('unableLoadBorrowedItems')}</p>
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
                    <TableHead className="text-xs font-medium text-slate-500">{t('dueDate')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('status')}</TableHead>
                    <TableHead className="text-right text-xs font-medium text-slate-500">{t('action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <td colSpan={6} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <RotateCcw className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">{t('noPendingReturns')}</p>
                          <p className="text-xs text-slate-400">{t('allEquipmentReturned')}</p>
                        </div>
                      </td>
                    </TableRow>
                  ) : (
                    paginated.map((request) => {
                      const overdue = request._section === 'overdue';
                      return (
                        <TableRow key={request.id} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell>
                            <span className="text-sm font-medium text-slate-900">{request.equipment_name}</span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{request.borrower_name}</TableCell>
                          <TableCell className="text-xs text-slate-500">{request.quantity}</TableCell>
                          <TableCell className="text-xs">
                            <span className={overdue ? 'font-medium text-red-600' : 'text-slate-500'}>
                              {format(new Date(request.return_date), 'MMM d, yyyy')}
                            </span>
                          </TableCell>
                          <TableCell>
                            {overdue ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                <AlertTriangle className="h-3 w-3" />
                                {t('overdue')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {t('borrowed')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 px-2.5 text-xs font-medium text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                              onClick={() => openReturnDialog(request)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              {t('processReturn')}
                            </Button>
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

      {/* Extension Review Dialog */}
      <Dialog open={!!extensionRequest} onOpenChange={() => { setExtensionRequest(null); setExtensionNote(''); setExtensionAction(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${extensionAction === 'approve' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {extensionAction === 'approve'
                  ? <Check className="h-4 w-4 text-emerald-600" />
                  : <X className="h-4 w-4 text-red-500" />}
              </div>
              {t('reviewExtensionTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1.5 text-xs">
              <p><span className="text-slate-500">{t('equipment')}:</span> <span className="font-medium text-slate-800">{extensionRequest?.equipment_name}</span></p>
              <p><span className="text-slate-500">{t('borrower')}:</span> <span className="text-slate-700">{extensionRequest?.borrower_name}</span></p>
              <p><span className="text-slate-500">{t('currentReturnDate')}:</span> <span className="text-slate-700">{extensionRequest?.return_date ? format(new Date(extensionRequest.return_date), 'MMM d, yyyy') : '—'}</span></p>
              <p><span className="text-slate-500">{t('requestedNewDate')}:</span> <span className="font-medium text-amber-700">{extensionRequest?.extension_request?.requested_date ? format(new Date(extensionRequest.extension_request.requested_date), 'MMM d, yyyy') : '—'}</span></p>
              {extensionRequest?.extension_request?.reason && (
                <p><span className="text-slate-500">{t('reasonOptional')}:</span> <span className="italic text-slate-600">{extensionRequest.extension_request.reason}</span></p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{t('extensionNote')}</label>
              <Textarea
                value={extensionNote}
                onChange={(e) => setExtensionNote(e.target.value)}
                placeholder={extensionAction === 'approve' ? 'e.g. Approved, please return by new date.' : 'e.g. Extension not allowed at this time.'}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setExtensionRequest(null); setExtensionNote(''); setExtensionAction(null); }}
              className="text-xs"
              disabled={extensionMutation.isPending}
            >
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={() => extensionMutation.mutate({ id: extensionRequest.id, action: extensionAction, note: extensionNote })}
              disabled={extensionMutation.isPending}
              className={`text-xs text-white ${extensionAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {extensionMutation.isPending
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{extensionAction === 'approve' ? t('approving') : t('rejecting')}</>
                : extensionAction === 'approve' ? t('approveExtension') : t('rejectExtension')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-xl rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <RotateCcw className="h-4 w-4 text-blue-600" />
              </div>
              {t('processReturn')}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-2.5">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">{selectedRequest?.equipment_name}</span>
              {' · '}
              <span>{selectedRequest?.borrower_name}</span>
              {' · Due '}
              <span className="font-medium text-slate-700">
                {selectedRequest?.return_date ? format(new Date(selectedRequest.return_date), 'MMM d, yyyy') : '—'}
              </span>
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{t('equipmentCondition')}</label>
              <Select value={returnCondition} onValueChange={handleConditionChange}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      {t('good')}
                    </span>
                  </SelectItem>
                  <SelectItem value="Damaged">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      {t('damaged')}
                    </span>
                  </SelectItem>
                  <SelectItem value="Lost">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {t('lost')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {returnCondition === 'Damaged' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    {t('whatIsDamaged')} <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={damageDetails}
                    onChange={(e) => setDamageDetails(e.target.value)}
                    placeholder="e.g. cracked screen, broken cable..."
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{t('damageImageOptional')}</label>
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDamageDrop}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-3 transition-colors ${
                      dragOver
                        ? 'border-blue-400 bg-blue-50'
                        : damageImage
                        ? 'border-green-300 bg-green-50'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {damageImage ? (
                      <>
                        <img
                          src={URL.createObjectURL(damageImage)}
                          alt="preview"
                          className="h-16 w-full rounded-md object-cover"
                        />
                        <p className="truncate text-[11px] text-slate-500 w-full text-center">{damageImage.name}</p>
                        <span className="text-[10px] text-slate-400 underline">{t('clickToChange')}</span>
                      </>
                    ) : (
                      <>
                        <Package className="h-5 w-5 text-slate-400" />
                        <p className="text-[11px] text-slate-500">
                          {dragOver ? t('dropImageHere') : t('dragDropOrClick')}
                        </p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => setDamageImage(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
            )}

            {returnCondition === 'Damaged' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  {t('willBorrowerReplace')} <span className="text-red-500">*</span>
                </label>
                <Select value={studentWillReplace} onValueChange={handleStudentReplacementChange}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={t('willBorrowerReplace')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{t('yesBorrowerWillReplace')}</SelectItem>
                    <SelectItem value="no">{t('noReplacementNotRequired')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {returnCondition === 'Lost' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-medium text-red-700">{t('lostItemPolicy')}</p>
                <p className="mt-0.5 text-xs text-red-600">{selectedRequest?.borrower_name} {t('mustReplaceItem')}</p>
              </div>
            )}

            {shouldTrackReplacement && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  {t('hasReplacementCompleted')} <span className="text-red-500">*</span>
                </label>
                <Select value={replacementCompleted} onValueChange={setReplacementCompleted}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={t('hasReplacementCompleted')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{t('yesAlreadyReplaced')}</SelectItem>
                    <SelectItem value="no">{t('noStillPending')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                {t('remarks')} {returnCondition !== 'Good' && <span className="text-red-500">*</span>}
              </label>
              <Textarea
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                placeholder={returnCondition !== 'Good' ? t('describeIssue') : t('optionalNotes')}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={closeDialog} className="text-xs">
              {t('cancel')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReturn(true)}
              disabled={returnMutation.isPending || isFormInvalid || (selectedRequest ? isOverdue(selectedRequest.return_date) : true)}
              className="text-xs"
            >
              {t('markReturnedEarly')}
            </Button>
            <Button
              size="sm"
              onClick={() => handleReturn(false)}
              disabled={returnMutation.isPending || isFormInvalid}
              className="text-xs text-white bg-blue-600 hover:bg-blue-700"
            >
              {returnMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t('processing')}</>
              ) : (
                t('confirmReturn')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}