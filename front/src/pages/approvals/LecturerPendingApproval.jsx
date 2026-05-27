import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Package, CheckCircle, XCircle, Loader2, Search,
  ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown,
  User, Clock, Calendar, Eye, Printer, AlertCircle,
  BookOpen,
} from 'lucide-react';
import '@/styles/equimon-admin.css';
import { format, differenceInDays } from 'date-fns';
import { useLang } from '@/components/i18n/LangContext';
import { LecturerPendingApprovalSkeleton } from '@/skeleton-framework/lecturer';
import { printItsReceipt } from '@/utils/printItsReceipt';
import LoanSlip from '@/components/ui/LoanSlip';

const PAGE_SIZE = 10;

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase();
};

const shortReqId = (id, createdDate) => {
  const year = createdDate ? new Date(createdDate).getFullYear() : new Date().getFullYear();
  const suffix = id ? String(id).slice(-4).toUpperCase() : '????';
  return `REQ-${year}-${suffix}`;
};

const getUrgency = (borrowDate, createdDate) => {
  const now = new Date();
  if (borrowDate && differenceInDays(new Date(borrowDate), now) <= 3) return 'urgent';
  if (createdDate && differenceInDays(now, new Date(createdDate)) >= 3) return 'urgent';
  return null;
};

const mL  = { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 };
const mLab = { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)' };
const mVal = { fontSize: 11, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1 };
const mSub = { fontSize: 10, color: 'var(--a-mute)', lineHeight: 1, marginTop: 2 };

export default function LecturerApprovals() {
  const { t } = useLang();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewingRequest,  setViewingRequest]  = useState(null);
  const [remarks,  setRemarks]  = useState('');
  const [action,   setAction]   = useState(null);
  const [search,   setSearch]   = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateSort, setDateSort] = useState('desc');
  const [loanSlipRequest, setLoanSlipRequest] = useState(null);
  const [resultState, setResultState] = useState(null);

  const queryClient = useQueryClient();

  const fmtDate     = (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—';
  const fmtDateTime = (v) => v ? format(new Date(v), 'EEE, MMM d · HH:mm') : '—';

  const getRequestTimestamp = (r) => new Date(
    r?.created_date || r?.createdAt || r?.updatedAt || r?.borrow_date || 0
  ).getTime();

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['pendingLecturerRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'pending_lecturer' }, '-created_date'),
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

  const getEquipmentData  = (r) => { const id = r?.equipment?._id || r?.equipment?.id || r?.equipment; return id ? equipmentMap[id] : null; };
  const getEquipmentImage = (r) => getEquipmentData(r)?.image_url || null;

  const actionMutation = useMutation({
    mutationFn: ({ id, action, remarks }) => api.entities.BorrowRequest.lecturerAction(id, action, remarks),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pendingLecturerRequests'] });
      queryClient.invalidateQueries({ queryKey: ['lecturerRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      const capturedRequest = selectedRequest;
      const capturedRemarks = remarks;
      closeDialog();
      setResultState({
        type: variables.action === 'approve' ? 'forwarded' : 'rejected',
        request: capturedRequest,
        remarks: capturedRemarks,
        timestamp: new Date(),
      });
    },
  });

  const openApproveDialog = (r) => { setSelectedRequest(r); setAction('approve'); setRemarks(''); };
  const openRejectDialog  = (r) => { setSelectedRequest(r); setAction('reject');  setRemarks(''); };
  const closeDialog = () => { setSelectedRequest(null); setAction(null); setRemarks(''); };
  const handleSubmit = () => actionMutation.mutate({ id: selectedRequest.id, action, remarks: remarks.trim() });

  const handlePrint = (request) => {
    printItsReceipt({
      id: request.id,
      equipment_name: request.equipment_name,
      category: request.category || getEquipmentData(request)?.category,
      quantity: request.quantity,
      borrower_name: request.borrower_name,
      student_email: request.student_email || request.borrower_email,
      department: request.department,
      lecturer_name: request.lecturer_name || '',
      purpose: request.purpose,
      created_date: request.created_date || request.createdAt,
      borrow_date: request.borrow_date,
      return_date: request.return_date,
      status: request.status,
      lecturer_approved_at: request.lecturer_approved_at,
      head_approved_at: request.head_approved_at,
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

  const totalPages      = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) return <LecturerPendingApprovalSkeleton />;

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Title strip ── */}
      <div className="a-titlestrip">
        <div style={{ flex: 1 }}>
          <div className="a-eyebrow">{t('lecturer')} · {t('pendingApprovals')}</div>
          <h1>{t('pendingApprovals')}</h1>
          <div className="a-deck">{t('lecturerPendingDeck')}</div>
        </div>
        <div className="a-right">
          <span className="a-pill p-warn">
            <span className="dot" style={{ background: 'var(--a-warn)' }} />
            {requests.length} {t('pending')}
          </span>
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="a-panel">

        {/* Toolbar */}
        <div className="p-head">
          <h2>{t('awaitingYourReview')}</h2>
          <span className="count">{filteredRequests.length}</span>
          <div className="spacer" />
          <button className="a-btn" style={{ padding: '7px 12px' }}
            onClick={() => { setCurrentPage(1); setDateSort(s => s === 'desc' ? 'asc' : 'desc'); }}>
            {dateSort === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
            {dateSort === 'desc' ? t('newestLabel') : t('oldestLabel')}
          </button>
          <div className="a-search" style={{ minWidth: 220 }}>
            <Search size={13} style={{ color: 'var(--a-mute)', flexShrink: 0 }} />
            <input
              placeholder={t('searchEquipmentOrBorrower')}
              value={search}
              onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
            />
          </div>
          <button className="a-btn" style={{ padding: '7px 12px' }}
            onClick={() => paginatedRequests.forEach(r => handlePrint(r))}>
            <Printer size={12} /> {t('printQueue')}
          </button>
        </div>

        {/* Cards area */}
        <div style={{ padding: '16px 20px 20px' }}>
          {isError ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--a-mute)' }}>
              <XCircle size={32} style={{ margin: '0 auto 12px', color: 'var(--a-bad)' }} />
              <p style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>{t('unableToLoadRequests')}</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>{error?.message || t('failedToConnect')}</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--a-mute)' }}>
              <CheckCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>{t('allCaughtUp')}</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>{search ? t('noResultsMatchSearch') : t('noPendingRequestsRequireVerification')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paginatedRequests.map((request) => {
                const img      = getEquipmentImage(request);
                const eq       = getEquipmentData(request);
                const category = request.category || eq?.category;
                const urgency  = getUrgency(request.borrow_date, request.created_date || request.createdAt);
                const email    = request.student_email || request.borrower_email || '';
                const borrowDays = request.borrow_date && request.return_date
                  ? differenceInDays(new Date(request.return_date), new Date(request.borrow_date)) : null;
                const tipColor = urgency === 'urgent' ? '#8C1F1F' : '#0F2A4A';

                return (
                  <div key={request.id} style={{
                    position: 'relative', overflow: 'hidden',
                    display: 'flex', gap: 16,
                    background: 'var(--a-surface)', border: '1px solid var(--a-rule)',
                    padding: '16px 20px 16px 24px',
                  }}>
                    {/* ── Left accent tip ── */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: tipColor }} />

                    {/* Equipment image */}
                    <div style={{ width: 64, height: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-surface-2)', border: '1px solid var(--a-rule)', overflow: 'hidden', alignSelf: 'flex-start', marginTop: 4 }}>
                      {img
                        ? <img src={img} alt={request.equipment_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Package size={28} style={{ color: 'var(--a-mute-2)' }} />
                      }
                    </div>

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {urgency === 'urgent' && <span className="a-pill p-bad"><span className="dot" style={{ background: 'var(--a-bad)' }} />{t('urgent')}</span>}
                        {category && <span className="a-pill p-mute">{category}</span>}
                        <span className="a-pill p-info" style={{ fontFamily: 'var(--mono)' }}>{shortReqId(request.id, request.created_date || request.createdAt)}</span>
                        <span className="a-pill p-gold">×{request.quantity}</span>
                      </div>

                      <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: 'var(--a-navy)', margin: 0, lineHeight: 1.3 }}>
                        {request.equipment_name}
                      </h3>

                      {request.purpose && (
                        <p style={{ fontSize: 11, color: 'var(--a-mute)', marginTop: 4, lineHeight: 1.5 }}>{request.purpose}</p>
                      )}

                      {/* Meta grid */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--a-rule-2)' }}>
                        <div>
                          <div style={mL}><User size={11} style={{ color: 'var(--a-mute-2)' }} /><span style={mLab}>{t('borrower')}</span></div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--a-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 8, fontWeight: 700, color: '#fff' }}>
                              {getInitials(request.borrower_name)}
                            </div>
                            <div>
                              <p style={mVal}>{request.borrower_name || '—'}</p>
                              {email && <p style={mSub}>{email}</p>}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div style={mL}><BookOpen size={11} style={{ color: 'var(--a-mute-2)' }} /><span style={mLab}>{t('course')}</span></div>
                          <p style={mVal}>{request.course || request.subject || request.course_code || '—'}</p>
                          {request.department && <p style={mSub}>{request.department}</p>}
                        </div>
                        <div>
                          <div style={mL}><Calendar size={11} style={{ color: 'var(--a-mute-2)' }} /><span style={mLab}>{t('period')}</span></div>
                          <p style={mVal}>{request.borrow_date ? fmtDate(request.borrow_date) : '—'}</p>
                          {request.return_date && <p style={mSub}>→ {fmtDate(request.return_date)}{borrowDays !== null ? ` (${borrowDays}d)` : ''}</p>}
                        </div>
                        <div>
                          <div style={mL}><Clock size={11} style={{ color: 'var(--a-mute-2)' }} /><span style={mLab}>{t('submitted')}</span></div>
                          <p style={mVal}>{(request.created_date || request.createdAt) ? fmtDateTime(request.created_date || request.createdAt) : '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: 148, flexShrink: 0, alignSelf: 'flex-start' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span className="a-pill p-warn"><span className="dot" style={{ background: 'var(--a-warn)' }} />{t('awaitingYou')}</span>
                      </div>
                      <button className="a-btn primary" style={{ justifyContent: 'center', width: '100%', padding: '8px 12px' }}
                        onClick={() => setViewingRequest(request)}>
                        {t('reviewAndDecide')} <ChevronRight size={12} />
                      </button>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="a-btn" style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', color: 'var(--a-ok)', borderColor: 'var(--a-ok)', background: 'var(--a-ok-bg)', fontSize: 9 }}
                          onClick={() => openApproveDialog(request)}>
                          <ThumbsUp size={11} /> {t('forwardLabel')}
                        </button>
                        <button className="a-btn danger" style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 9 }}
                          onClick={() => openRejectDialog(request)}>
                          <ThumbsDown size={11} /> {t('reject')}
                        </button>
                      </div>
                      <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a-mute)', fontSize: 11, fontFamily: 'var(--sans)', padding: '4px 0' }}
                        onClick={() => handlePrint(request)}>
                        <Printer size={11} /> {t('printDetails')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="a-pagination">
            <span className="info">{t('showing')} {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} {t('ofLabel')} {filteredRequests.length}</span>
            <div className="pages">
              <button className="a-btn" style={{ padding: '6px 10px' }} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} className="a-btn"
                  style={currentPage === page ? { background: 'var(--a-navy)', color: '#fff', borderColor: 'var(--a-navy)', padding: '6px 10px' } : { padding: '6px 10px' }}
                  onClick={() => setCurrentPage(page)}>
                  {page}
                </button>
              ))}
              <button className="a-btn" style={{ padding: '6px 10px' }} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── View Request Detail Modal ── */}
      <Dialog open={!!viewingRequest} onOpenChange={() => setViewingRequest(null)}>
        <DialogContent className="eq-admin sm:max-w-[620px] overflow-hidden p-0 gap-0 max-h-[88vh] flex flex-col" style={{ borderRadius: 0 }}>
          {(() => {
            const img = viewingRequest ? getEquipmentImage(viewingRequest) : null;
            return img ? (
              <div style={{ position: 'relative', height: 128, overflow: 'hidden', flexShrink: 0, background: 'var(--a-navy)' }}>
                <img src={img} alt={viewingRequest?.equipment_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,42,74,0.85) 0%, rgba(15,42,74,0.2) 60%, transparent 100%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 24px 16px' }}>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600, color: '#fff', margin: 0 }}>{viewingRequest?.equipment_name}</p>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    <span className="a-pill p-mute" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'transparent', color: '#fff' }}>{t('qty')} {viewingRequest?.quantity}</span>
                    <span className="a-pill p-warn">{t('pendingReview')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--a-surface-2)', borderBottom: '1px solid var(--a-rule)', padding: '20px 24px' }}>
                <div style={{ width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-rule-2)', border: '1px solid var(--a-rule)' }}>
                  <Package size={24} style={{ color: 'var(--a-mute)' }} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--a-mute)', margin: 0 }}>{t('borrowRequestLabel')}</p>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: 'var(--a-navy)', margin: '4px 0 0' }}>{viewingRequest?.equipment_name}</p>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    <span className="a-pill p-mute">{t('qty')} {viewingRequest?.quantity}</span>
                    <span className="a-pill p-warn">{t('pendingReview')}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogTitle className="sr-only">{t('borrowRequestLabel')} — {viewingRequest?.equipment_name}</DialogTitle>

          <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '10px 12px' }}>
                  <p style={{ ...mLab, display: 'block', marginBottom: 8 }}>{t('borrower')}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--a-info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={14} style={{ color: 'var(--a-info)' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', margin: 0 }}>{viewingRequest?.borrower_name || '—'}</p>
                      {(viewingRequest?.student_email || viewingRequest?.borrower_email) && (
                        <p style={{ fontSize: 10, color: 'var(--a-mute)', margin: '2px 0 0' }}>{viewingRequest.student_email || viewingRequest.borrower_email}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '10px 12px' }}>
                  <p style={{ ...mLab, display: 'block', marginBottom: 8 }}>{t('submitted')}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', margin: 0 }}>
                    {viewingRequest?.created_date ? format(new Date(viewingRequest.created_date), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
                <div style={{ border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '10px 12px' }}>
                  <p style={{ ...mLab, display: 'block', marginBottom: 8 }}>{t('borrowPeriodLabel')}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ border: '1px solid var(--a-rule)', padding: '8px 12px', background: '#fff' }}>
                      <p style={{ ...mLab, display: 'block', marginBottom: 2 }}>{t('fromLabel')}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', margin: 0 }}>{fmtDate(viewingRequest?.borrow_date)}</p>
                    </div>
                    <div style={{ border: '1px solid var(--a-rule)', padding: '8px 12px', background: '#fff' }}>
                      <p style={{ ...mLab, display: 'block', marginBottom: 2 }}>{t('untilLabel')}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', margin: 0 }}>{fmtDate(viewingRequest?.return_date)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '10px 12px', flex: 1 }}>
                  <p style={{ ...mLab, display: 'block', marginBottom: 8 }}>{t('purpose')}</p>
                  <p style={{ fontSize: 13, color: 'var(--a-ink-2)', lineHeight: 1.6, margin: 0, minHeight: 48 }}>
                    {viewingRequest?.purpose || <span style={{ fontStyle: 'italic', color: 'var(--a-mute)' }}>{t('noPurposeProvided')}</span>}
                  </p>
                </div>
                <div style={{ border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '10px 12px' }}>
                  <p style={{ ...mLab, display: 'block', marginBottom: 8 }}>{t('equipment')}</p>
                  {[
                    [t('name'), viewingRequest?.equipment_name],
                    [t('quantity'), viewingRequest?.quantity],
                    ...(viewingRequest?.serial_number ? [[t('serialLabel'), viewingRequest.serial_number]] : []),
                  ].map(([key, val], i, arr) => (
                    <React.Fragment key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                        <span style={{ fontSize: 10, color: 'var(--a-mute)' }}>{key}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink)', fontFamily: key === t('serialLabel') ? 'var(--mono)' : 'inherit' }}>{val || '—'}</span>
                      </div>
                      {i < arr.length - 1 && <div style={{ height: 1, background: 'var(--a-rule-2)' }} />}
                    </React.Fragment>
                  ))}
                </div>
                {viewingRequest?.lecturer_remarks && (
                  <div style={{ border: '1px solid var(--a-info)', background: 'var(--a-info-bg)', padding: '10px 12px' }}>
                    <p style={{ ...mLab, color: 'var(--a-info)', display: 'block', marginBottom: 6 }}>{t('remarks')}</p>
                    <p style={{ fontSize: 12, color: 'var(--a-info)', lineHeight: 1.5, margin: 0 }}>{viewingRequest.lecturer_remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, borderTop: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '12px 16px' }}>
            <button className="a-btn" style={{ justifyContent: 'center' }} onClick={() => setViewingRequest(null)}>{t('close')}</button>
            <button className="a-btn" style={{ justifyContent: 'center', color: '#7c3aed', borderColor: '#7c3aed', background: '#f5f3ff' }}
              onClick={() => { setViewingRequest(null); const _eq = getEquipmentData(viewingRequest); setLoanSlipRequest({ ...viewingRequest, category: viewingRequest.category || _eq?.category }); }}>
              <Eye size={12} /> {t('loanSlip')}
            </button>
            <button className="a-btn danger" style={{ justifyContent: 'center' }}
              onClick={() => { setViewingRequest(null); openRejectDialog(viewingRequest); }}>
              <ThumbsDown size={12} /> {t('reject')}
            </button>
            <button className="a-btn" style={{ justifyContent: 'center', background: 'var(--a-ok)', borderColor: 'var(--a-ok)', color: '#fff' }}
              onClick={() => { setViewingRequest(null); openApproveDialog(viewingRequest); }}>
              <ThumbsUp size={12} /> {t('verify')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Loan Slip Modal ── */}
      <Dialog open={!!loanSlipRequest} onOpenChange={() => setLoanSlipRequest(null)}>
        <DialogContent className="sm:max-w-[560px] rounded-2xl bg-white p-5 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Loan Slip</DialogTitle>
          {loanSlipRequest && <LoanSlip request={loanSlipRequest} imageUrl={getEquipmentImage(loanSlipRequest)} />}
        </DialogContent>
      </Dialog>

      {/* ── Approve / Reject Dialog ── */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="eq-admin p-0 gap-0" style={{ borderRadius: 2, maxWidth: 380, background: '#fff' }}>
          <DialogTitle className="sr-only">{action === 'approve' ? t('forwardThisRequest') : t('rejectThisRequest')}</DialogTitle>
          <div style={{ padding: '14px 16px 0' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
              {t('pendingYourDecision')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 24px 8px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#eff6ff', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <AlertCircle size={26} style={{ color: '#3b82f6' }} />
            </div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 6px' }}>
              {t('actionConfirmation')}
            </p>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.2 }}>
              {action === 'approve' ? t('forwardThisRequest') : t('rejectThisRequest')}
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: 0, maxWidth: 300 }}>
              {action === 'approve' ? t('forwardRequestDesc') : t('rejectRequestDesc')}
            </p>
          </div>
          <div style={{ margin: '0 18px 14px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '10px 14px', borderRadius: 3 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 8px' }}>{t('requestSummary')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 12px' }}>
              {[
                [t('equipment'), selectedRequest?.equipment_name],
                [t('borrower'), selectedRequest?.borrower_name],
                [t('quantity'), selectedRequest?.quantity != null ? `×${selectedRequest.quantity}` : '—'],
                [t('period'), (() => { const b = selectedRequest?.borrow_date ? format(new Date(selectedRequest.borrow_date), 'MMM d') : null; const r = selectedRequest?.return_date ? format(new Date(selectedRequest.return_date), 'MMM d') : null; return b && r ? `${b} – ${r}` : b || '—'; })()],
              ].map(([label, val]) => (
                <div key={label}>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: 0 }}>{val || '—'}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 5px' }}>
                {action === 'approve' ? t('notesOptional') : t('reasonOptional')}
              </p>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={action === 'approve' ? t('notesForHeadPlaceholder') : t('provideReasonPlaceholder')}
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--sans)', fontSize: 12, color: '#1e293b', border: '1px solid #e2e8f0', padding: '6px 10px', resize: 'none', outline: 'none', background: '#fff', display: 'block', borderRadius: 2 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 18px 18px' }}>
            <button onClick={closeDialog}
              style={{ flex: 1, padding: '9px', background: 'none', border: '1px solid #e2e8f0', color: '#64748b', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t('cancel')}
            </button>
            <button onClick={handleSubmit} disabled={actionMutation.isPending}
              style={{ flex: 1, padding: '9px', border: 'none', color: '#fff', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700, cursor: actionMutation.isPending ? 'not-allowed' : 'pointer', borderRadius: 2, letterSpacing: '0.06em', background: action === 'approve' ? '#0F2A4A' : '#dc2626', opacity: actionMutation.isPending ? 0.7 : 1, textTransform: 'uppercase' }}>
              {actionMutation.isPending
                ? <><Loader2 size={13} className="animate-spin" /> {t('processing')}</>
                : action === 'approve' ? t('yesForward') : t('yesReject')
              }
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Result Dialog ── */}
      <Dialog open={!!resultState} onOpenChange={() => setResultState(null)}>
        <DialogContent className="eq-admin p-0 gap-0" style={{ borderRadius: 2, maxWidth: 380, background: '#fff' }}>
          <DialogTitle className="sr-only">Action Result</DialogTitle>
          {resultState && (() => {
            const cfgMap = {
              forwarded: {
                badgeText: t('forwarded').toUpperCase(), badgeBg: '#dbeafe', badgeBorder: '#bfdbfe', badgeColor: '#1d4ed8', dot: '#3b82f6',
                circleBg: '#dbeafe', circleBorder: '#3b82f6', iconColor: '#3b82f6',
                role: t('lecturerResult'), title: t('forwardedToHeadOfLab'),
                subtitle: t('forwardedResultDesc'),
                primaryLabel: t('backToQueue'), primaryBg: '#0F2A4A',
              },
              rejected: {
                badgeText: t('rejected').toUpperCase(), badgeBg: '#fee2e2', badgeBorder: '#fecaca', badgeColor: '#b91c1c', dot: '#ef4444',
                circleBg: '#fee2e2', circleBorder: '#ef4444', iconColor: '#ef4444',
                role: t('lecturerResult'), title: t('requestRejectedDot'),
                subtitle: t('rejectedResultDesc'),
                primaryLabel: t('close').toUpperCase(), primaryBg: '#64748b',
              },
            };
            const cfg = cfgMap[resultState.type] || cfgMap.rejected;
            const req = resultState.request;
            const ts = resultState.timestamp ? format(resultState.timestamp, 'MMM d · HH:mm') : '';
            return (
              <>
                <div style={{ padding: '14px 16px 0' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.badgeBg, border: `1px solid ${cfg.badgeBorder}`, color: cfg.badgeColor, fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                    {cfg.badgeText}{ts ? ` · ${ts}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 24px 8px', textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: cfg.circleBg, border: `2px solid ${cfg.circleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    {resultState.type === 'forwarded'
                      ? <ChevronRight size={28} style={{ color: cfg.iconColor }} />
                      : <XCircle size={26} style={{ color: cfg.iconColor }} />
                    }
                  </div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 6px' }}>{cfg.role}</p>
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.2 }}>{cfg.title}</h2>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: 0, maxWidth: 300 }}>{cfg.subtitle}</p>
                </div>
                <div style={{ margin: '0 18px 14px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '10px 14px', borderRadius: 3 }}>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 8px' }}>{t('requestSummary')}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 12px' }}>
                    {[
                      [t('equipment'), req?.equipment_name],
                      [t('borrower'), req?.borrower_name],
                      resultState.type === 'rejected' ? [t('rejectNote'), resultState.remarks || '—'] : [t('quantity'), req?.quantity != null ? `×${req.quantity}` : '—'],
                      [t('period'), (() => { const b = req?.borrow_date ? format(new Date(req.borrow_date), 'MMM d') : null; const r = req?.return_date ? format(new Date(req.return_date), 'MMM d') : null; return b && r ? `${b} – ${r}` : b || '—'; })()],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 2px' }}>{label}</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: 0 }}>{val || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '0 18px 18px' }}>
                  <button onClick={() => setResultState(null)}
                    style={{ width: '100%', padding: '9px', border: 'none', color: '#fff', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.06em', background: cfg.primaryBg, textTransform: 'uppercase' }}>
                    {cfg.primaryLabel} &gt;
                  </button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
