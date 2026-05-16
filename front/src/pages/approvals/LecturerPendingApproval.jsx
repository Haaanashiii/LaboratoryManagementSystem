import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Package, CheckCircle, XCircle, Loader2, Search,
  ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown,
  User, Clock, Calendar, Eye, Printer, ChevronRight as ArrowRight,
  BookOpen,
} from 'lucide-react';
import '@/styles/equimon-admin.css';
import { format, differenceInDays } from 'date-fns';
import { useLang } from '@/components/i18n/LangContext';
import { LecturerPendingApprovalSkeleton } from '@/skeleton-framework/lecturer';
import { printItsReceipt } from '@/utils/printItsReceipt';
import LoanSlip from '@/components/ui/LoanSlip';
import Swal from 'sweetalert2';

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

  const queryClient = useQueryClient();

  const hasExplicitTime = (v) => typeof v === 'string' && (v.includes('T') || v.includes(':'));
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
      closeDialog();
      if (variables.action === 'approve') {
        Swal.fire({ icon: 'success', title: 'Request Forwarded!', text: 'The borrow request has been forwarded to the Head of Lab for final approval.', confirmButtonColor: '#0F2A4A', confirmButtonText: 'Got it', timer: 4000, timerProgressBar: true });
      } else {
        Swal.fire({ icon: 'info', title: 'Request Rejected', text: 'The borrow request has been rejected and the borrower will be notified.', confirmButtonColor: '#64748b', confirmButtonText: 'OK', timer: 4000, timerProgressBar: true });
      }
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
    <div className="eq-admin" style={{ minHeight: '100vh' }}>

      {/* ── Title strip ── */}
      <div className="a-titlestrip">
        <div style={{ flex: 1 }}>
          <div className="a-eyebrow">Lecturer · Pending Approvals</div>
          <h1>Pending Approvals</h1>
          <div className="a-deck">Review and forward borrow requests from your students — or send them back with feedback.</div>
        </div>
        <div className="a-right">
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
          <h2>Awaiting your review</h2>
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
              <p style={{ fontSize: 12, marginTop: 4 }}>{search ? 'No results match your search.' : 'No pending requests require your verification.'}</p>
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
                        Review &amp; Decide <ArrowRight size={12} />
                      </button>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="a-btn" style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', color: 'var(--a-ok)', borderColor: 'var(--a-ok)', background: 'var(--a-ok-bg)', fontSize: 9 }}
                          onClick={() => openApproveDialog(request)}>
                          <ThumbsUp size={11} /> Forward
                        </button>
                        <button className="a-btn danger" style={{ flex: 1, justifyContent: 'center', padding: '7px 8px', fontSize: 9 }}
                          onClick={() => openRejectDialog(request)}>
                          <ThumbsDown size={11} /> Reject
                        </button>
                      </div>
                      <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a-mute)', fontSize: 11, fontFamily: 'var(--sans)', padding: '4px 0' }}
                        onClick={() => handlePrint(request)}>
                        <Printer size={11} /> Print details
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
                    <span className="a-pill p-warn">Pending Review</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--a-surface-2)', borderBottom: '1px solid var(--a-rule)', padding: '20px 24px' }}>
                <div style={{ width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-rule-2)', border: '1px solid var(--a-rule)' }}>
                  <Package size={24} style={{ color: 'var(--a-mute)' }} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--a-mute)', margin: 0 }}>Borrow Request</p>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: 'var(--a-navy)', margin: '4px 0 0' }}>{viewingRequest?.equipment_name}</p>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    <span className="a-pill p-mute">Qty {viewingRequest?.quantity}</span>
                    <span className="a-pill p-warn">Pending Review</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogTitle className="sr-only">Borrow Request — {viewingRequest?.equipment_name}</DialogTitle>

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
                  <div style={{ border: '1px solid var(--a-info)', background: 'var(--a-info-bg)', padding: '10px 12px' }}>
                    <p style={{ ...mLab, color: 'var(--a-info)', display: 'block', marginBottom: 6 }}>Remarks</p>
                    <p style={{ fontSize: 12, color: 'var(--a-info)', lineHeight: 1.5, margin: 0 }}>{viewingRequest.lecturer_remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, borderTop: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: '12px 16px' }}>
            <button className="a-btn" style={{ justifyContent: 'center' }} onClick={() => setViewingRequest(null)}>Close</button>
            <button className="a-btn" style={{ justifyContent: 'center', color: '#7c3aed', borderColor: '#7c3aed', background: '#f5f3ff' }}
              onClick={() => { setViewingRequest(null); setLoanSlipRequest(viewingRequest); }}>
              <Eye size={12} /> Loan Slip
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
        <DialogContent className="eq-admin sm:max-w-md p-0 gap-0" style={{ borderRadius: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--a-rule)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: action === 'approve' ? 'var(--a-ok-bg)' : 'var(--a-bad-bg)' }}>
                {action === 'approve' ? <ThumbsUp size={16} style={{ color: 'var(--a-ok)' }} /> : <ThumbsDown size={16} style={{ color: 'var(--a-bad)' }} />}
              </div>
              <DialogTitle style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: 'var(--a-navy)', margin: 0 }}>
                {action === 'approve' ? 'Verify Request' : 'Reject Request'}
              </DialogTitle>
            </div>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 13, color: 'var(--a-mute)', lineHeight: 1.6, marginBottom: 16 }}>
              {action === 'approve'
                ? <>Forward <strong style={{ color: 'var(--a-ink)' }}>{selectedRequest?.borrower_name}</strong>'s request for <strong style={{ color: 'var(--a-ink)' }}>{selectedRequest?.equipment_name}</strong> to the Head of Lab.</>
                : <>Reject <strong style={{ color: 'var(--a-ink)' }}>{selectedRequest?.borrower_name}</strong>'s request for <strong style={{ color: 'var(--a-ink)' }}>{selectedRequest?.equipment_name}</strong>. The borrower will be notified.</>
              }
            </p>
            <div>
              <p style={{ ...mLab, display: 'block', marginBottom: 6 }}>Remarks <span style={{ fontFamily: 'var(--sans)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></p>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={action === 'approve' ? 'Provide reason for approval.' : 'Provide reason for rejection.'}
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--a-ink)', border: '1px solid var(--a-rule)', padding: '8px 12px', resize: 'none', outline: 'none', background: '#fff', display: 'block' }}
                onFocus={e => e.target.style.borderColor = 'var(--a-gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--a-rule)'}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 24px', borderTop: '1px solid var(--a-rule)', background: 'var(--a-surface-2)' }}>
            <button className="a-btn" onClick={closeDialog}>Cancel</button>
            <button className="a-btn" onClick={handleSubmit} disabled={actionMutation.isPending}
              style={action === 'approve'
                ? { background: 'var(--a-navy)', borderColor: 'var(--a-navy)', color: '#fff' }
                : { background: 'var(--a-bad)', borderColor: 'var(--a-bad)', color: '#fff' }
              }>
              {actionMutation.isPending
                ? <><Loader2 size={13} className="animate-spin" /> Processing…</>
                : action === 'approve' ? 'Verify and Forward' : 'Reject Request'
              }
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
