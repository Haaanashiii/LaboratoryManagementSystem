import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Package, RotateCcw, AlertTriangle, Loader2, Search,
  ChevronLeft, ChevronRight, ClipboardList, CalendarClock,
  Check, X, Clock, Bell, Printer, CheckCircle,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { AssistantReturnsSkeleton } from '@/skeleton-framework/assistant';
import { useLang } from '@/components/i18n/LangContext';
import { printItsReceipt } from '@/utils/printItsReceipt';
import { printReturnsQueue } from '@/utils/printReturnsQueue';
import '@/styles/equimon-admin.css';

const PAGE_SIZE = 10;

const SECTION_CONFIG = [
  { key: 'all',      labelKey: 'all',            color: '#475569', icon: ClipboardList, stripeColor: '#64748b', subKey: 'allActiveLoans' },
  { key: 'overdue',  labelKey: 'overdue',         color: '#ef4444', icon: AlertTriangle, stripeColor: '#ef4444', subKey: 'pastDueDate' },
  { key: 'due_soon', labelKey: 'dueSoon',         color: '#f59e0b', icon: Clock,         stripeColor: '#f59e0b', subKey: 'returningWithin3Days' },
  { key: 'regular',  labelKey: 'regularReturns',  color: '#22c55e', icon: RotateCcw,     stripeColor: '#22c55e', subKey: 'onSchedule' },
];

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase();
};

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
  const [returnSuccess, setReturnSuccess] = useState(false);

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
      setReturnSuccess(true);
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

  const closeDialog = () => setSelectedRequest(null);

  const handleConditionChange = (value) => {
    setReturnCondition(value);
    if (value === 'Good') { setDamageDetails(''); setDamageImage(null); setStudentWillReplace(''); setReplacementCompleted(''); return; }
    if (value === 'Damaged') { setStudentWillReplace(''); setReplacementCompleted(''); return; }
    if (value === 'Lost') { setDamageDetails(''); setStudentWillReplace('yes'); setReplacementCompleted(''); }
  };

  const handleDamageDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) setDamageImage(file);
  };

  const handleStudentReplacementChange = (value) => {
    setStudentWillReplace(value);
    if (value !== 'yes') setReplacementCompleted('');
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

  const isOverdue  = (d) => new Date(d) < new Date();
  const isDueSoon  = (d) => { const days = differenceInDays(new Date(d), new Date()); return days >= 0 && days <= 3; };

  const handleSectionChange = (key) => { setActiveSection(key); setCurrentPage(1); };

  const allRequests = [
    ...borrowedRequests.filter(r => isOverdue(r.return_date)).sort((a, b) => new Date(a.return_date) - new Date(b.return_date)).map(r => ({ ...r, _section: 'overdue' })),
    ...borrowedRequests.filter(r => !isOverdue(r.return_date) && isDueSoon(r.return_date)).sort((a, b) => new Date(a.return_date) - new Date(b.return_date)).map(r => ({ ...r, _section: 'due_soon' })),
    ...borrowedRequests.filter(r => !isOverdue(r.return_date) && !isDueSoon(r.return_date)).sort((a, b) => new Date(a.return_date) - new Date(b.return_date)).map(r => ({ ...r, _section: 'regular' })),
  ];

  const sectionCounts = {
    all:      allRequests.length,
    overdue:  allRequests.filter(r => r._section === 'overdue').length,
    due_soon: allRequests.filter(r => r._section === 'due_soon').length,
    regular:  allRequests.filter(r => r._section === 'regular').length,
  };

  const sectionFiltered = activeSection === 'all' ? allRequests : allRequests.filter(r => r._section === activeSection);
  const filtered = sectionFiltered.filter(r =>
    !search ||
    r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.borrower_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pendingExtensions = borrowedRequests.filter(r => r.extension_request?.status === 'pending' && r.extension_request?.requested_date);

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Title Strip ── */}
      <div className="a-titlestrip" style={{ marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div className="a-eyebrow">Operations · Equipment Returns</div>
          <h1>{t('equipmentReturns') || 'Equipment Returns'}</h1>
          <div className="a-deck">Track borrowed equipment and process returns.</div>
        </div>
        <div className="a-right">
          <div style={{ border: '1px solid var(--a-rule)', padding: '10px 18px', background: 'var(--a-surface)', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>Items</div>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 24, color: 'var(--a-navy)', lineHeight: 1.1, marginTop: 2 }}>{sectionCounts.all}</div>
          </div>
        </div>
      </div>

      {/* ── Filter Cards ── */}
      <div className="a-cards" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {SECTION_CONFIG.map((cfg) => {
          const isActive = activeSection === cfg.key;
          const CfgIcon = cfg.icon;
          return (
            <button
              key={cfg.key}
              type="button"
              onClick={() => handleSectionChange(cfg.key)}
              className={`a-card${isActive ? ' gold-edge' : ''}`}
              style={{ textAlign: 'left', cursor: 'pointer', width: '100%', background: isActive ? 'var(--a-surface-2)' : 'var(--a-surface)' }}
            >
              <div className="c-label">{t(cfg.labelKey)}</div>
              <div className="c-val" style={{ color: isActive ? cfg.color : 'var(--a-navy)' }}>{sectionCounts[cfg.key] ?? 0}</div>
              <div className="c-sub">{t(cfg.subKey)}</div>
              <div className="c-ico"><CfgIcon style={{ width: 20, height: 20, color: cfg.color }} /></div>
            </button>
          );
        })}
      </div>

      {/* ── Extension Requests ── */}
      {pendingExtensions.length > 0 && (
        <div className="a-panel" style={{ marginBottom: 20 }}>
          <div className="p-head">
            <CalendarClock style={{ width: 15, height: 15, color: 'var(--a-gold)' }} />
            <h2>{t('pendingExtensions')}</h2>
            <span className="count">{pendingExtensions.length}</span>
            <span className="spacer" />
          </div>
          <table className="a-table">
            <thead>
              <tr>
                <th>{t('equipment')}</th>
                <th>{t('borrower')}</th>
                <th>{t('currentReturnDate')}</th>
                <th>{t('requestedNewDate')}</th>
                <th style={{ textAlign: 'right' }}>{t('action')}</th>
              </tr>
            </thead>
            <tbody>
              {pendingExtensions.map((req) => (
                <tr key={`ext-${req.id}`}>
                  <td className="primary">{req.equipment_name}</td>
                  <td className="muted">{req.borrower_name}</td>
                  <td className="muted">{format(new Date(req.return_date), 'MMM d, yyyy')}</td>
                  <td style={{ color: 'var(--a-warn)', fontWeight: 600 }}>{format(new Date(req.extension_request.requested_date), 'MMM d, yyyy')}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button className="a-btn" style={{ color: 'var(--a-ok)', borderColor: 'var(--a-ok)', gap: 5 }} onClick={() => { setExtensionRequest(req); setExtensionAction('approve'); setExtensionNote(''); }}>
                        <Check style={{ width: 11, height: 11 }} />{t('approveExtension')}
                      </button>
                      <button className="a-btn danger" style={{ gap: 5 }} onClick={() => { setExtensionRequest(req); setExtensionAction('reject'); setExtensionNote(''); }}>
                        <X style={{ width: 11, height: 11 }} />{t('rejectExtension')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, border: '1px solid var(--a-rule)', padding: '10px 14px', background: 'var(--a-surface-2)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          Queue <strong style={{ color: 'var(--a-gold)' }}>{sectionCounts.all}</strong>
        </span>
        <div style={{ width: 1, height: 20, background: 'var(--a-rule)', flexShrink: 0 }} />
        <div className="a-search" style={{ flex: 1 }}>
          <Search style={{ width: 14, height: 14, color: 'var(--a-mute)', flexShrink: 0 }} />
          <input
            placeholder={t('searchEquipmentOrBorrower') || 'Search equipment or borrower...'}
            value={search}
            onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
          />
        </div>
        <button onClick={() => printReturnsQueue(allRequests)} className="a-btn primary" style={{ flexShrink: 0, gap: 7 }}>
          <Printer style={{ width: 13, height: 13 }} />
          {t('printQueue')}
        </button>
      </div>

      {/* ── Items ── */}
      {isLoading ? (
        <AssistantReturnsSkeleton />
      ) : isError ? (
        <div className="a-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, gap: 10 }}>
          <RotateCcw style={{ width: 32, height: 32, color: 'var(--a-mute-2)' }} />
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0 }}>{t('unableLoadBorrowedItems')}</p>
          <p style={{ fontSize: 12, color: 'var(--a-mute-2)', margin: 0 }}>{error?.message || t('failedToConnect')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="a-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, gap: 10 }}>
          <RotateCcw style={{ width: 32, height: 32, color: 'var(--a-mute-2)' }} />
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0 }}>{t('noPendingReturns') || 'No pending returns'}</p>
          <p style={{ fontSize: 12, color: 'var(--a-mute-2)', margin: 0 }}>{t('allEquipmentReturned') || 'All equipment has been returned'}</p>
        </div>
      ) : (
        <>
          <div className="a-panel">
            {paginated.map((request, idx) => {
              const overdue  = request._section === 'overdue';
              const dueSoon  = request._section === 'due_soon';
              const cfg = SECTION_CONFIG.find(c => c.key === request._section) || SECTION_CONFIG[0];
              const overdueDays = overdue ? differenceInDays(new Date(), new Date(request.return_date)) : 0;
              const dueSoonDays = dueSoon ? differenceInDays(new Date(request.return_date), new Date()) : 0;
              const borrowedDate = request.borrow_date || request.released_at || request.created_date;
              const loanDays = borrowedDate ? Math.abs(differenceInDays(new Date(request.return_date), new Date(borrowedDate))) : null;
              const reqId = `REQ-${new Date().getFullYear()}-${String(request.id).padStart(4, '0')}`;
              const equipImgUrl = request.equipment_image_url || request.equipment?.image_url || request.equipment?.image || '';

              return (
                <div
                  key={request.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 18, padding: '18px 22px',
                    borderBottom: idx < paginated.length - 1 ? '1px solid var(--a-rule-2)' : 'none',
                    position: 'relative',
                  }}
                >
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: cfg.stripeColor }} />

                  <div style={{ width: 64, height: 64, border: '1px solid var(--a-rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', background: 'var(--a-surface-2)' }}>
                    {equipImgUrl
                      ? <img src={equipImgUrl} alt={request.equipment_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Package style={{ width: 24, height: 24, color: cfg.color }} />
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                      {overdue && (
                        <span className="a-pill p-bad">
                          <span className="dot" style={{ background: '#ef4444' }} />
                          Overdue by {overdueDays} day{overdueDays !== 1 ? 's' : ''}
                        </span>
                      )}
                      {dueSoon && (
                        <span className="a-pill p-warn">
                          <span className="dot" style={{ background: '#f59e0b' }} />
                          Due in {dueSoonDays} day{dueSoonDays !== 1 ? 's' : ''}
                        </span>
                      )}
                      {(request.category || request.equipment_category) && (
                        <span className="a-pill p-mute">{request.category || request.equipment_category}</span>
                      )}
                      <span className="a-pill p-mute">{reqId}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: 'var(--a-navy)', margin: 0 }}>{request.equipment_name}</h3>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--a-mute)', letterSpacing: '0.1em' }}>×{request.quantity}</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 36px' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)', marginBottom: 4 }}>{t('borrower')}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                            {getInitials(request.borrower_name)}
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 12, color: 'var(--a-navy)' }}>{request.borrower_name || '—'}</div>
                            {request.student_email && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--a-mute)', marginTop: 2 }}>{request.student_email}</div>}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)', marginBottom: 4 }}>{t('borrowedLabel')}</div>
                        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 12, color: 'var(--a-navy)' }}>
                          {borrowedDate ? format(new Date(borrowedDate), 'MMM d, yyyy') : '—'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)', marginBottom: 4 }}>{t('dueBack')}</div>
                        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 12, color: overdue ? 'var(--a-bad)' : 'var(--a-navy)' }}>
                          {format(new Date(request.return_date), 'MMM d, yyyy')}
                        </div>
                        {overdue && <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--a-bad)', marginTop: 2 }}>{overdueDays} day(s) late</div>}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)', marginBottom: 4 }}>{t('loanDuration')}</div>
                        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 12, color: 'var(--a-navy)' }}>{loanDays != null ? `${loanDays} days` : '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, width: 140 }}>
                    <button onClick={() => openReturnDialog(request)} className="a-btn primary" style={{ justifyContent: 'center', gap: 6, background: 'var(--a-ok)', borderColor: 'var(--a-ok)' }}>
                      <CheckCircle style={{ width: 13, height: 13 }} />
                      {t('markReturned')}
                    </button>
                    <button className="a-btn danger" style={{ justifyContent: 'center', gap: 6 }}>
                      <Bell style={{ width: 13, height: 13 }} />
                      {t('sendReminder')}
                    </button>
                    <button onClick={() => printItsReceipt(request)} className="a-btn" style={{ justifyContent: 'center', gap: 6 }}>
                      <Printer style={{ width: 13, height: 13 }} />
                      {t('printReceipt')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="a-pagination" style={{ border: '1px solid var(--a-rule)', borderTop: 'none', background: 'var(--a-surface-2)' }}>
            <span className="info">
              {t('showing')} {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} {t('ofLabel')} {filtered.length} {filtered.length !== 1 ? t('itemsLabel') : t('itemLabel')}
            </span>
            {totalPages > 1 && (
              <div className="pages">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="a-btn" style={{ padding: '6px 10px', opacity: currentPage === 1 ? 0.4 : 1 }}>
                  <ChevronLeft style={{ width: 12, height: 12 }} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`a-btn${currentPage === page ? ' primary' : ''}`} style={{ padding: '6px 12px' }}>
                    {page}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="a-btn" style={{ padding: '6px 10px', opacity: currentPage === totalPages ? 0.4 : 1 }}>
                  <ChevronRight style={{ width: 12, height: 12 }} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Extension Review Dialog ── */}
      <Dialog open={!!extensionRequest} onOpenChange={() => { setExtensionRequest(null); setExtensionNote(''); setExtensionAction(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${extensionAction === 'approve' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {extensionAction === 'approve' ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-500" />}
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
              <Textarea value={extensionNote} onChange={(e) => setExtensionNote(e.target.value)} placeholder={extensionAction === 'approve' ? 'e.g. Approved, please return by new date.' : 'e.g. Extension not allowed at this time.'} rows={2} className="resize-none text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={() => { setExtensionRequest(null); setExtensionNote(''); setExtensionAction(null); }} className="text-xs" disabled={extensionMutation.isPending}>{t('cancel')}</Button>
            <Button size="sm" onClick={() => extensionMutation.mutate({ id: extensionRequest.id, action: extensionAction, note: extensionNote })} disabled={extensionMutation.isPending} className={`text-xs text-white ${extensionAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
              {extensionMutation.isPending
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{extensionAction === 'approve' ? t('approving') : t('rejecting')}</>
                : extensionAction === 'approve' ? t('approveExtension') : t('rejectExtension')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return Dialog ── */}
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
              {' · '}<span>{selectedRequest?.borrower_name}</span>
              {' · Due '}<span className="font-medium text-slate-700">{selectedRequest?.return_date ? format(new Date(selectedRequest.return_date), 'MMM d, yyyy') : '—'}</span>
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{t('equipmentCondition')}</label>
              <Select value={returnCondition} onValueChange={handleConditionChange}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" />{t('good')}</span></SelectItem>
                  <SelectItem value="Damaged"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" />{t('damaged')}</span></SelectItem>
                  <SelectItem value="Lost"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" />{t('lost')}</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            {returnCondition === 'Damaged' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{t('whatIsDamaged')} <span className="text-red-500">*</span></label>
                  <Textarea value={damageDetails} onChange={(e) => setDamageDetails(e.target.value)} placeholder="e.g. cracked screen, broken cable..." rows={2} className="resize-none text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{t('damageImageOptional')}</label>
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDamageDrop}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-3 transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : damageImage ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'}`}
                  >
                    {damageImage ? (
                      <><img src={URL.createObjectURL(damageImage)} alt="preview" className="h-16 w-full rounded-md object-cover" /><p className="truncate text-[11px] text-slate-500 w-full text-center">{damageImage.name}</p><span className="text-[10px] text-slate-400 underline">{t('clickToChange')}</span></>
                    ) : (
                      <><Package className="h-5 w-5 text-slate-400" /><p className="text-[11px] text-slate-500">{dragOver ? t('dropImageHere') : t('dragDropOrClick')}</p></>
                    )}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => setDamageImage(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
            )}
            {returnCondition === 'Damaged' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{t('willBorrowerReplace')} <span className="text-red-500">*</span></label>
                <Select value={studentWillReplace} onValueChange={handleStudentReplacementChange}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder={t('willBorrowerReplace')} /></SelectTrigger>
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
                <label className="text-xs font-medium text-slate-600">{t('hasReplacementCompleted')} <span className="text-red-500">*</span></label>
                <Select value={replacementCompleted} onValueChange={setReplacementCompleted}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder={t('hasReplacementCompleted')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{t('yesAlreadyReplaced')}</SelectItem>
                    <SelectItem value="no">{t('noStillPending')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{t('remarks')} {returnCondition !== 'Good' && <span className="text-red-500">*</span>}</label>
              <Textarea value={returnRemarks} onChange={(e) => setReturnRemarks(e.target.value)} placeholder={returnCondition !== 'Good' ? t('describeIssue') : t('optionalNotes')} rows={2} className="resize-none text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={closeDialog} className="text-xs">{t('cancel')}</Button>
            <Button variant="outline" size="sm" onClick={() => handleReturn(true)} disabled={returnMutation.isPending || isFormInvalid || (selectedRequest ? isOverdue(selectedRequest.return_date) : true)} className="text-xs">{t('markReturnedEarly')}</Button>
            <Button size="sm" onClick={() => handleReturn(false)} disabled={returnMutation.isPending || isFormInvalid} className="text-xs text-white bg-blue-600 hover:bg-blue-700">
              {returnMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t('processing')}</> : t('confirmReturn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return Success Modal ── */}
      <Dialog open={returnSuccess} onOpenChange={setReturnSuccess}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 rounded-2xl overflow-hidden" style={{ background: '#fff' }}>
          <DialogTitle className="sr-only">Return Confirmed</DialogTitle>
          <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle style={{ width: 26, height: 26, color: '#16a34a' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 18, color: 'var(--a-ink)', marginBottom: 6 }}>{t('returnConfirmed') || 'Return Confirmed'}</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--a-mute)', lineHeight: 1.5 }}>{t('returnConfirmedDesc') || 'The equipment has been successfully marked as returned.'}</div>
            </div>
            <button className="a-btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={() => setReturnSuccess(false)}>
              <CheckCircle style={{ width: 14, height: 14 }} /> {t('gotIt') || 'Got it'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
