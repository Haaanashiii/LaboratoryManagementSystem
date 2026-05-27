import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  Search, CheckCircle, XCircle, Package, LayoutList,
  User, Clock, Calendar, BookOpen, Printer, Loader2,
  ThumbsUp, RotateCcw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import '@/styles/equimon-admin.css';
import { format, differenceInDays } from 'date-fns';
import { LecturerApprovalHistorySkeleton } from '@/skeleton-framework/lecturer';
import { printItsReceipt } from '@/utils/printItsReceipt';
import { useLang } from '@/components/i18n/LangContext';

const PAGE_SIZE = 3;

const FORWARDED_STATUSES = new Set(['pending_head', 'head_approved', 'ready_pickup', 'borrowed', 'returned']);

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

const mL   = { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 };
const mLab  = { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)' };
const mVal  = { fontSize: 11, fontWeight: 600, color: 'var(--a-ink)', lineHeight: 1 };
const mSub  = { fontSize: 10, color: 'var(--a-mute)', lineHeight: 1, marginTop: 2 };

export default function LecturerApprovalHistory() {
  const { t } = useLang();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [printingId, setPrintingId]     = useState(null);
  const [currentPage, setCurrentPage]   = useState(1);

  const STATUS_FILTERS = [
    { key: 'all',       label: t('all'),       statuses: null,                                               icon: LayoutList, pillClass: 'p-mute' },
    { key: 'forwarded', label: t('forwarded'), statuses: ['pending_head','head_approved','ready_pickup','borrowed','returned'], icon: ThumbsUp,   pillClass: 'p-ok'   },
    { key: 'rejected',  label: t('rejected'),  statuses: ['rejected'],                                       icon: XCircle,    pillClass: 'p-bad'  },
    { key: 'returned',  label: t('returned'),  statuses: ['returned'],                                       icon: RotateCcw,  pillClass: 'p-info' },
  ];

  const STATUS_LABEL = {
    pending_head:  t('pendingHead'),
    head_approved: t('headapproved'),
    ready_pickup:  t('readyPickup'),
    borrowed:      t('borrowed'),
    returned:      t('returned'),
    rejected:      t('rejected'),
  };

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

  const getEquipmentData  = (r) => { const id = r?.equipment?._id || r?.equipment?.id || r?.equipment; return id ? equipmentMap[id] : null; };
  const getEquipmentImage = (r) => { const eq = getEquipmentData(r); return eq?.images_urls?.[0] || eq?.image_url || null; };

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['lecturerApprovalHistory', user?.email],
    queryFn: () => api.entities.BorrowRequest.filter({ history: 'true' }, '-created_date'),
    enabled: !!user?.email,
  });

  const activeFilter = STATUS_FILTERS.find(f => f.key === statusFilter) ?? STATUS_FILTERS[0];

  const filteredRequests = requests
    .filter(r => !activeFilter.statuses || activeFilter.statuses.includes(r.status))
    .filter(r =>
      r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.borrower_name?.toLowerCase().includes(search.toLowerCase())
    );

  React.useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const totalPages        = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getCount = (filter) =>
    filter.statuses ? requests.filter(r => filter.statuses.includes(r.status)).length : requests.length;

  const fmtDate     = (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—';
  const fmtDateTime = (v) => v ? format(new Date(v), 'EEE, MMM d · HH:mm') : '—';

  const handlePrint = (request) => {
    setPrintingId(request.id);
    try {
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
    } finally {
      setPrintingId(null);
    }
  };

  if (isLoading) return <LecturerApprovalHistorySkeleton />;

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Title strip ── */}
      <div className="a-titlestrip">
        <div style={{ flex: 1 }}>
          <div className="a-eyebrow">{t('lecturer')} · {t('approvalHistory')}</div>
          <h1>{t('approvalHistory')}</h1>
          <div className="a-deck">{t('allRequestsActioned')}</div>
        </div>
        <div className="a-right">
          <span className="a-pill p-info">
            <span className="dot" style={{ background: 'var(--a-info)' }} />
            {filteredRequests.length} {t('recordsLabel')}
          </span>
        </div>
      </div>

      {/* ── Status filter tabs ── */}
      <div className="a-tabs" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {STATUS_FILTERS.map((filter) => {
          const count    = getCount(filter);
          const isActive = statusFilter === filter.key;
          const Icon     = filter.icon;
          return (
            <button
              key={filter.key}
              className={`a-tab${isActive ? ' active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === filter.key ? 'all' : filter.key)}
            >
              <span className="t-label">
                <Icon size={12} /> {filter.label}
              </span>
              <span className="t-val">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Main panel ── */}
      <div className="a-panel">

        {/* Toolbar */}
        <div className="p-head">
          <h2>{activeFilter.label}</h2>
          <span className="count">{filteredRequests.length}</span>
          {statusFilter !== 'all' && (
            <button style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setStatusFilter('all')}>
              × {t('clearFilters')}
            </button>
          )}
          <div className="spacer" />
          <div className="a-search" style={{ minWidth: 220 }}>
            <Search size={13} style={{ color: 'var(--a-mute)', flexShrink: 0 }} />
            <input
              placeholder={t('searchEquipmentOrBorrower')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Cards */}
        <div style={{ padding: '16px 20px 20px' }}>
          {isError ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--a-mute)' }}>
              <XCircle size={32} style={{ margin: '0 auto 12px', color: 'var(--a-bad)' }} />
              <p style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>{t('unableToLoadHistory')}</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>{error?.message || t('failedConnectServer')}</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--a-mute)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--a-surface-2)', border: '1px solid var(--a-rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                {requests.length === 0 ? <Package size={16} style={{ color: 'var(--a-mute)' }} /> : <CheckCircle size={16} style={{ color: 'var(--a-mute)' }} />}
              </div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 15 }}>{requests.length === 0 ? t('noReviewsYet') : t('noResultsFound')}</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>{requests.length === 0 ? t('requestsWillAppearHere') : t('tryDifferentFilterOrSearch')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paginatedRequests.map((request) => {
                const img         = getEquipmentImage(request);
                const eq          = getEquipmentData(request);
                const category    = request.category || eq?.category;
                const email       = request.student_email || request.borrower_email || '';
                const isForwarded = FORWARDED_STATUSES.has(request.status);
                const borrowDays  = request.borrow_date && request.return_date
                  ? differenceInDays(new Date(request.return_date), new Date(request.borrow_date)) : null;
                const decisionDate = request.lecturer_approved_at || request.lecturer_actioned_at;
                const tipColor    = isForwarded ? '#1F6B4D' : '#8C1F1F';

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
                        {category && <span className="a-pill p-mute">{category}</span>}
                        <span className="a-pill p-info" style={{ fontFamily: 'var(--mono)' }}>{shortReqId(request.id, request.created_date || request.createdAt)}</span>
                        <span className="a-pill p-gold">×{request.quantity}</span>
                      </div>

                      <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: 'var(--a-navy)', margin: 0, lineHeight: 1.3 }}>
                        {request.equipment_name}
                      </h3>

                      {request.lecturer_remarks ? (
                        <p style={{ fontSize: 11, color: 'var(--a-mute)', marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>"{request.lecturer_remarks}"</p>
                      ) : request.purpose ? (
                        <p style={{ fontSize: 11, color: 'var(--a-mute)', marginTop: 4, lineHeight: 1.5 }}>{request.purpose}</p>
                      ) : null}

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
                          <p style={mVal}>{fmtDate(request.borrow_date)}</p>
                          {request.return_date && <p style={mSub}>→ {fmtDate(request.return_date)}{borrowDays !== null ? ` (${borrowDays}d)` : ''}</p>}
                        </div>
                        <div>
                          <div style={mL}><Clock size={11} style={{ color: 'var(--a-mute-2)' }} /><span style={mLab}>{t('submitted')}</span></div>
                          <p style={mVal}>{fmtDateTime(request.created_date || request.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right: decision column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: 140, flexShrink: 0, alignSelf: 'flex-start' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {isForwarded
                          ? <span className="a-pill p-ok"><span className="dot" style={{ background: 'var(--a-ok)' }} />{t('forwarded')}</span>
                          : <span className="a-pill p-bad"><span className="dot" style={{ background: 'var(--a-bad)' }} />{t('rejected')}</span>
                        }
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: 36, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                        border: '1px solid', fontWeight: 600,
                        ...(isForwarded
                          ? { color: 'var(--a-ok)', borderColor: 'var(--a-ok)', background: 'var(--a-ok-bg)' }
                          : { color: 'var(--a-bad)', borderColor: 'var(--a-bad)', background: 'var(--a-bad-bg)' }
                        ),
                      }}>
                        {STATUS_LABEL[request.status] || request.status}
                      </div>
                      {decisionDate && (
                        <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--a-mute)', textAlign: 'center', letterSpacing: '0.05em' }}>
                          {format(new Date(decisionDate), 'MMM d, yyyy · HH:mm')}
                        </p>
                      )}
                      <button
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a-mute)', fontSize: 11, fontFamily: 'var(--sans)', padding: '4px 0', opacity: printingId === request.id ? 0.4 : 1 }}
                        onClick={() => handlePrint(request)}
                        disabled={printingId === request.id}
                      >
                        {printingId === request.id ? <Loader2 size={11} className="animate-spin" /> : <Printer size={11} />}
                        {t('printDetails')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {filteredRequests.length > 0 && (
          <div className="a-pagination">
            <span className="info">
              {t('showing')} {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} {t('ofLabel')} {filteredRequests.length}
            </span>
            {totalPages > 1 && (
              <div className="pages">
                <button className="a-btn" style={{ padding: '6px 10px' }} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft style={{ width: 14, height: 14 }} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} className={`a-btn${currentPage === page ? ' primary' : ''}`} style={{ padding: '6px 10px', minWidth: 32 }} onClick={() => setCurrentPage(page)}>
                    {page}
                  </button>
                ))}
                <button className="a-btn" style={{ padding: '6px 10px' }} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
