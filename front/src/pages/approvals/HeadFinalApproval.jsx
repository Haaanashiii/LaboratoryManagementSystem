import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Package, CheckCircle, XCircle, Loader2, Search, ShieldCheck,
  ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown,
  User, Clock, Calendar, Eye, Printer, AlertCircle,
  BookOpen, MessageSquare,
} from 'lucide-react';
import '@/styles/equimon-admin.css';
import { format, differenceInDays } from 'date-fns';
import { useLang } from '@/components/i18n/LangContext';
import { HeadFinalApprovalSkeleton } from '@/skeleton-framework/head of lab';
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

const mL   = { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 };
const mLab  = { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)' };
const mVal  = { fontSize: 11, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1 };
const mSub  = { fontSize: 10, color: 'var(--a-mute)', lineHeight: 1, marginTop: 2 };

export default function HeadApproval() {
  const { t } = useLang();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewingRequest,  setViewingRequest]  = useState(null);
  const [remarks,     setRemarks]     = useState('');
  const [action,      setAction]      = useState(null);
  const [search,      setSearch]      = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateSort,    setDateSort]    = useState('desc');
  const [loanSlipRequest, setLoanSlipRequest] = useState(null);
  const [resultState, setResultState] = useState(null);

  const queryClient = useQueryClient();

  const hasExplicitTime = (v) => typeof v === 'string' && (v.includes('T') || v.includes(':'));
  const fmtDate     = (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—';
  const fmtDateTime = (v) => v ? format(new Date(v), 'EEE, MMM d · HH:mm') : '—';

  const getRequestTimestamp = (r) => new Date(
    r?.created_date || r?.createdAt || r?.updatedAt || r?.borrow_date || 0
  ).getTime();

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

  const getEquipmentData  = (r) => { const id = r?.equipment?._id || r?.equipment?.id || r?.equipment; return id ? equipmentMap[id] : null; };
  const getEquipmentImage = (r) => getEquipmentData(r)?.image_url || null;

  const actionMutation = useMutation({
    mutationFn: ({ id, action, remarks }) => api.entities.BorrowRequest.headAction(id, action, remarks),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pendingHeadRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      const capturedRequest = selectedRequest;
      const capturedRemarks = remarks;
      closeDialog();
      setResultState({
        type: variables.action === 'approve' ? 'approved' : 'rejected',
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

  const openLoanSlip = (request) => {
    const eq = getEquipmentData(request);
    setLoanSlipRequest({ ...request, category: request.category || eq?.category });
  };

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
      lecturer_remarks: request.lecturer_remarks,
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

  const totalPages       = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) return <HeadFinalApprovalSkeleton />;

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Title strip ── */}
      <div className="a-titlestrip">
        <div style={{ flex: 1 }}>
          <div className="a-eyebrow">Head of Lab · Final Approvals</div>
          <h1>Final Approvals</h1>
          <div className="a-deck">Review and action borrow requests forwarded by lecturers.</div>
        </div>
        <div className="a-right">
          <ShieldCheck size={18} style={{ color: 'var(--a-gold-2)' }} />
          <span className="a-pill p-warn">
            <span className="dot" style={{ background: 'var(--a-warn)' }} />
            {requests.length} pending
          </span>
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="a-panel">

        {/* Toolbar */}
        <div className="p-head">
          <h2>Awaiting your final decision</h2>
          <span className="count">{filteredRequests.length}</span>
          <div className="spacer" />
          <button className="a-btn" style={{ padding: '7px 12px' }}
            onClick={() => { setCurrentPage(1); setDateSort(s => s === 'desc' ? 'asc' : 'desc'); }}>
            {dateSort === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
            {dateSort === 'desc' ? 'Newest' : 'Oldest'}
          </button>
          <div className="a-search" style={{ minWidth: 220 }}>
            <Search size={13} style={{ color: 'var(--a-mute)', flexShrink: 0 }} />
            <input
              placeholder="Search equipment or borrower..."
              value={search}
              onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
            />
          </div>
          <button className="a-btn" style={{ padding: '7px 12px' }}
            onClick={() => paginatedRequests.forEach(r => handlePrint(r))}>
            <Printer size={12} /> Print queue
          </button>
        </div>

        {/* Cards area */}
        <div style={{ padding: '16px 20px 20px' }}>
          {isError ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--a-mute)' }}>
              <XCircle size={32} style={{ margin: '0 auto 12px', color: 'var(--a-bad)' }} />
              <p style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>Unable to load requests</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>{error?.message || 'Failed to connect to the server.'}</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--a-mute)' }}>
              <CheckCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>All caught up</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>{search ? 'No results match your search.' : 'No pending requests require your approval.'}</p>
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
                        {urgency === 'urgent' && <span className="a-pill p-bad"><span className="dot" style={{ background: 'var(--a-bad)' }} />Urgent</span>}
                        {category && <span className="a-pill p-mute">{category}</span>}
                        <span className="a-pill p-info" style={{ fontFamily: 'var(--mono)' }}>{shortReqId(request.id, request.created_date || request.createdAt)}</span>
                        <span className="a-pill p-gold">×{request.quantity}</span>
                        {request.lecturer_remarks && (
                          <span className="a-pill p-ok"><MessageSquare size={10} />Lecturer noted</span>
                        )}
                      </div>

                      <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: 'var(--a-navy)', margin: 0, lineHeight: 1.3 }}>
                        {request.equipment_name}
                      </h3>

                      {request.lecturer_remarks ? (
                        <p style={{ fontSize: 11, color: 'var(--a-mute)', marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>Lecturer: "{request.lecturer_remarks}"</p>
                      ) : request.purpose ? (
                        <p style={{ fontSize: 11, color: 'var(--a-mute)', marginTop: 4, lineHeight: 1.5 }}>{request.purpose}</p>
                      ) : null}

                      {/* Meta grid */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--a-rule-2)' }}>
                        <div>
                          <div style={mL}><User size={11} style={{ color: 'var(--a-mute-2)' }} /><span style={mLab}>Borrower</span></div>
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
                          <div style={mL}><BookOpen size={11} style={{ color: 'var(--a-mute-2)' }} /><span style={mLab}>Course</span></div>
                          <p style={mVal}>{request.course || request.subject || request.course_code || '—'}</p>
                          {request.department && <p style={mSub}>{request.department}</p>}
                        </div>
                        <div>
                          <div style={mL}><Calendar size={11} style={{ color: 'var(--a-mute-2)' }} /><span style={mLab}>Period</span></div>
                          <p style={mVal}>{request.borrow_date ? fmtDate(request.borrow_date) : '—'}</p>
                          {request.return_date && <p style={mSub}>→ {fmtDate(request.return_date)}{borrowDays !== null ? ` (${borrowDays}d)` : ''}</p>}
                        </div>
                        <div>
                          <div style={mL}><Clock size={11} style={{ color: 'var(--a-mute-2)' }} /><span style={mLab}>Submitted</span></div>
                          <p style={mVal}>{(request.created_date || request.createdAt) ? fmtDateTime(request.created_date || request.createdAt) : '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: 148, flexShrink: 0, alignSelf: 'flex-start' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span className="a-pill p-warn"><span className="dot" style={{ background: 'var(--a-warn)' }} />Awaiting You</span>
                      </div>
                      <button className="a-btn primary" style={{ justifyContent: 'center', width: '100%', padding: '8px 12px' }}
                        onClick={() => setViewingRequest(request)}>
                        Review &amp; Decide <ChevronRight size={12} />
                      </button>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="a-btn" style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', color: 'var(--a-ok)', borderColor: 'var(--a-ok)', background: 'var(--a-ok-bg)', fontSize: 9 }}
                          onClick={() => openApproveDialog(request)}>
                          <ThumbsUp size={11} /> Approve
                        </button>
                        <button className="a-btn danger" style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 9 }}
                          onClick={() => openRejectDialog(request)}>
                          <ThumbsDown size={11} /> Reject
                        </button>
                      </div>
                      <button
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a-mute)', fontSize: 11, fontFamily: 'var(--sans)', padding: '4px 0' }}
                        onClick={() => handlePrint(request)}
                      >
                        <Printer size={11} />
                        Print details
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
            <span className="info">Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length}</span>
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
                    <span className="a-pill p-mute" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'transparent', color: '#fff' }}>Qty {viewingRequest?.quantity}</span>
                    <span className="a-pill p-gold">Pending Final Approval</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--a-surface-2)', borderBottom: '1px solid var(--a-rule)', padding: '20px 24px' }}>
                <div style={{ width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-rule-2)', border: '1px solid var(--a-rule)' }}>
                  <Package size={24} style={{ color: 'var(--a-mute)' }} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--a-mute)', margin: 0 }}>Final Approval</p>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: 'var(--a-navy)', margin: '4px 0 0' }}>{viewingRequest?.equipment_name}</p>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    <span className="a-pill p-mute">Qty {viewingRequest?.quantity}</span>
                    <span className="a-pill p-gold">Pending Final Approval</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogTitle className="sr-only">Final Approval — {viewingRequest?.equipment_name}</DialogTitle>

          <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '10px 12px' }}>
                  <p style={{ ...mLab, display: 'block', marginBottom: 8 }}>Borrower</p>
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
                  <p style={{ ...mLab, display: 'block', marginBottom: 8 }}>Submitted</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', margin: 0 }}>
                    {viewingRequest?.created_date ? format(new Date(viewingRequest.created_date), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
                <div style={{ border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '10px 12px' }}>
                  <p style={{ ...mLab, display: 'block', marginBottom: 8 }}>Borrow Period</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ border: '1px solid var(--a-rule)', padding: '8px 12px', background: '#fff' }}>
                      <p style={{ ...mLab, display: 'block', marginBottom: 2 }}>From</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', margin: 0 }}>{fmtDate(viewingRequest?.borrow_date)}</p>
                    </div>
                    <div style={{ border: '1px solid var(--a-rule)', padding: '8px 12px', background: '#fff' }}>
                      <p style={{ ...mLab, display: 'block', marginBottom: 2 }}>Until</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)', margin: 0 }}>{fmtDate(viewingRequest?.return_date)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '10px 12px', flex: 1 }}>
                  <p style={{ ...mLab, display: 'block', marginBottom: 8 }}>Purpose</p>
                  <p style={{ fontSize: 13, color: 'var(--a-ink-2)', lineHeight: 1.6, margin: 0, minHeight: 48 }}>
                    {viewingRequest?.purpose || <span style={{ fontStyle: 'italic', color: 'var(--a-mute)' }}>No purpose provided.</span>}
                  </p>
                </div>
                <div style={{ border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '10px 12px' }}>
                  <p style={{ ...mLab, display: 'block', marginBottom: 8 }}>Equipment</p>
                  {[
                    ['Name', viewingRequest?.equipment_name],
                    ['Quantity', viewingRequest?.quantity],
                    ...(viewingRequest?.serial_number ? [['Serial', viewingRequest.serial_number]] : []),
                  ].map(([key, val], i, arr) => (
                    <React.Fragment key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                        <span style={{ fontSize: 10, color: 'var(--a-mute)' }}>{key}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--a-ink)', fontFamily: key === 'Serial' ? 'var(--mono)' : 'inherit' }}>{val || '—'}</span>
                      </div>
                      {i < arr.length - 1 && <div style={{ height: 1, background: 'var(--a-rule-2)' }} />}
                    </React.Fragment>
                  ))}
                </div>
                {viewingRequest?.lecturer_remarks && (
                  <div style={{ border: '1px solid var(--a-ok)', background: 'var(--a-ok-bg)', padding: '10px 12px' }}>
                    <p style={{ ...mLab, color: 'var(--a-ok)', display: 'block', marginBottom: 6 }}>Lecturer Remarks</p>
                    <p style={{ fontSize: 12, color: 'var(--a-ok)', lineHeight: 1.5, margin: 0 }}>{viewingRequest.lecturer_remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, borderTop: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '12px 16px' }}>
            <button className="a-btn" style={{ justifyContent: 'center' }} onClick={() => setViewingRequest(null)}>Close</button>
            <button className="a-btn" style={{ justifyContent: 'center', color: '#7c3aed', borderColor: '#7c3aed', background: '#f5f3ff' }}
              onClick={() => openLoanSlip(viewingRequest)}>
              <Eye size={12} /> Loan Slip
            </button>
            <button className="a-btn danger" style={{ justifyContent: 'center' }}
              onClick={() => { setViewingRequest(null); openRejectDialog(viewingRequest); }}>
              <ThumbsDown size={12} /> {t('reject')}
            </button>
            <button className="a-btn" style={{ justifyContent: 'center', background: 'var(--a-ok)', borderColor: 'var(--a-ok)', color: '#fff' }}
              onClick={() => { setViewingRequest(null); openApproveDialog(viewingRequest); }}>
              <ThumbsUp size={12} /> {t('approve')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Loan Slip Modal ── */}
      <Dialog open={!!loanSlipRequest} onOpenChange={() => setLoanSlipRequest(null)}>
        <DialogContent className="sm:max-w-[560px] rounded-2xl bg-white p-5 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Loan Slip</DialogTitle>
          {loanSlipRequest && (
            <LoanSlip
              request={loanSlipRequest}
              imageUrl={getEquipmentImage(loanSlipRequest)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Approve / Reject Dialog ── */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="eq-admin p-0 gap-0" style={{ borderRadius: 2, maxWidth: 380, background: '#fff' }}>
          <DialogTitle className="sr-only">{action === 'approve' ? 'Approve Request' : 'Reject Request'}</DialogTitle>
          <div style={{ padding: '14px 16px 0' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
              Pending Your Decision
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 24px 8px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#eff6ff', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <AlertCircle size={26} style={{ color: '#3b82f6' }} />
            </div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 6px' }}>
              Action · Confirmation
            </p>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.2 }}>
              {action === 'approve' ? 'Approve this request?' : 'Reject this request?'}
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: 0, maxWidth: 300 }}>
              {action === 'approve'
                ? "You're about to grant final approval for the borrow request below. The lab assistant will be notified to prepare the equipment."
                : "You're about to decline this borrow request. The borrower will be notified along with the reason you provided."
              }
            </p>
          </div>
          <div style={{ margin: '0 18px 14px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '10px 14px', borderRadius: 3 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 8px' }}>Request Summary</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 12px' }}>
              {[
                ['Equipment', selectedRequest?.equipment_name],
                ['Borrower', selectedRequest?.borrower_name],
                ['Quantity', selectedRequest?.quantity != null ? `×${selectedRequest.quantity}` : '—'],
                ['Period', (() => { const b = selectedRequest?.borrow_date ? format(new Date(selectedRequest.borrow_date), 'MMM d') : null; const r = selectedRequest?.return_date ? format(new Date(selectedRequest.return_date), 'MMM d') : null; return b && r ? `${b} – ${r}` : b || '—'; })()],
              ].map(([label, val]) => (
                <div key={label}>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: 0 }}>{val || '—'}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 5px' }}>
                {action === 'approve' ? 'Notes (optional)' : 'Reason (optional)'}
              </p>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={action === 'approve' ? 'Add any notes for the lab assistant...' : 'Provide reason for rejection...'}
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--sans)', fontSize: 12, color: '#1e293b', border: '1px solid #e2e8f0', padding: '6px 10px', resize: 'none', outline: 'none', background: '#fff', display: 'block', borderRadius: 2 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 18px 18px' }}>
            <button onClick={closeDialog}
              style={{ flex: 1, padding: '9px', background: 'none', border: '1px solid #e2e8f0', color: '#64748b', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={actionMutation.isPending}
              style={{ flex: 1, padding: '9px', border: 'none', color: '#fff', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700, cursor: actionMutation.isPending ? 'not-allowed' : 'pointer', borderRadius: 2, letterSpacing: '0.06em', background: action === 'approve' ? '#0F2A4A' : '#dc2626', opacity: actionMutation.isPending ? 0.7 : 1, textTransform: 'uppercase' }}>
              {actionMutation.isPending
                ? <><Loader2 size={13} className="animate-spin" /> Processing…</>
                : action === 'approve' ? 'Yes, Approve' : 'Yes, Reject'
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
              approved: {
                badgeText: 'APPROVED', badgeBg: '#dcfce7', badgeBorder: '#bbf7d0', badgeColor: '#15803d', dot: '#22c55e',
                circleBg: '#dcfce7', circleBorder: '#22c55e', iconColor: '#22c55e',
                role: 'HEAD APPROVAL · RESULT', title: 'Request Approved.',
                subtitle: 'The borrow request has been given final approval. The lab assistant will now prepare the equipment for pickup.',
                primaryLabel: 'GOT IT', primaryBg: '#0F2A4A',
              },
              rejected: {
                badgeText: 'REJECTED', badgeBg: '#fee2e2', badgeBorder: '#fecaca', badgeColor: '#b91c1c', dot: '#ef4444',
                circleBg: '#fee2e2', circleBorder: '#ef4444', iconColor: '#ef4444',
                role: 'HEAD APPROVAL · RESULT', title: 'Request Rejected.',
                subtitle: 'The borrow request has been declined. The borrower will be notified along with the reason you provided.',
                primaryLabel: 'CLOSE', primaryBg: '#64748b',
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
                    {resultState.type === 'approved'
                      ? <CheckCircle size={26} style={{ color: cfg.iconColor }} />
                      : <XCircle size={26} style={{ color: cfg.iconColor }} />
                    }
                  </div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 6px' }}>{cfg.role}</p>
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.2 }}>{cfg.title}</h2>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: 0, maxWidth: 300 }}>{cfg.subtitle}</p>
                </div>
                <div style={{ margin: '0 18px 14px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '10px 14px', borderRadius: 3 }}>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 8px' }}>Request Summary</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 12px' }}>
                    {[
                      ['Equipment', req?.equipment_name],
                      ['Borrower', req?.borrower_name],
                      resultState.type === 'rejected' ? ['Reject Note', resultState.remarks || '—'] : ['Quantity', req?.quantity != null ? `×${req.quantity}` : '—'],
                      ['Period', (() => { const b = req?.borrow_date ? format(new Date(req.borrow_date), 'MMM d') : null; const r = req?.return_date ? format(new Date(req.return_date), 'MMM d') : null; return b && r ? `${b} – ${r}` : b || '—'; })()],
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
