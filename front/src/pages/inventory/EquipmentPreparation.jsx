import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Package, CheckCircle, Loader2, Search, ClipboardList,
  User, Printer, Hash, ChevronLeft, ChevronRight, Eye, AlertCircle,
} from 'lucide-react';
import { EquipmentPreparationSkeleton } from '@/skeleton-framework/admin';
import { format } from 'date-fns';
import { useLang } from '@/components/i18n/LangContext';
import { useAuth } from '@/components/hooks/useAuth.js';
import LoanSlip from '@/components/ui/LoanSlip';
import '@/styles/equimon-admin.css';

const PAGE_SIZE = 3;

const SECTION_CONFIG = [
  {
    key: 'all', labelKey: 'all',
    fg: '#334155', icon: ClipboardList,
    stripeColor: '#64748b', subKey: 'totalInQueue',
  },
  {
    key: 'prepare', labelKey: 'needsPreparation',
    fg: '#7c3aed', icon: Package,
    stripeColor: '#7c3aed', subKey: 'awaitingPreparationQueue',
    badge: { dot: '#a78bfa', labelKey: 'needsPreparation' },
  },
  {
    key: 'release', labelKey: 'readyPickup',
    fg: '#16a34a', icon: CheckCircle,
    stripeColor: '#16a34a', subKey: 'readyToCollect',
    badge: { dot: '#22c55e', labelKey: 'readyPickup' },
  },
];

const shortReqId = (id, createdDate) => {
  const year = createdDate ? new Date(createdDate).getFullYear() : new Date().getFullYear();
  const suffix = id ? String(id).slice(-4).toUpperCase() : '????';
  return `REQ-${year}-${suffix}`;
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase();
};

export default function EquipmentPrep() {
  const { t } = useLang();
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dialogAction, setDialogAction] = useState(null);
  const [viewRequest, setViewRequest] = useState(null);
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [successModal, setSuccessModal] = useState(null);
  const queryClient = useQueryClient();

  const { data: headApprovedRequests = [], isLoading: loadingHeadApproved, isError: errorHeadApproved, error: errorMsgHeadApproved } = useQuery({
    queryKey: ['headApprovedRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'head_approved' }, '-created_date'),
  });

  const { data: directApprovedRequests = [], isLoading: loadingDirectApproved, isError: errorDirectApproved, error: errorMsgDirectApproved } = useQuery({
    queryKey: ['directApprovedRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'approved' }, '-created_date'),
  });

  const approvedRequests = [...headApprovedRequests, ...directApprovedRequests];
  const loadingApproved = loadingHeadApproved || loadingDirectApproved;
  const errorApproved = errorHeadApproved || errorDirectApproved;
  const errorMsgApproved = errorMsgHeadApproved || errorMsgDirectApproved;

  const { data: readyRequests = [], isLoading: loadingReady, isError: errorReady, error: errorMsgReady } = useQuery({
    queryKey: ['readyRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'ready_pickup' }, '-created_date'),
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

  const resolveImageUrl = (request) => {
    const eqId = request?.equipment?._id || request?.equipment?.id || request?.equipment;
    const eq = eqId ? equipmentMap[eqId] : null;
    return eq?.image_url || eq?.images_urls?.[0]
      || request?.equipment_image_url
      || request?.equipment?.image_url
      || null;
  };

  const prepareMutation = useMutation({
    mutationFn: (id) => api.entities.BorrowRequest.prepare(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['headApprovedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['directApprovedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['readyRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
      setSuccessModal({ title: t('markedAsReady') || 'Marked as Ready', desc: t('markedAsReadyDesc') || 'The equipment has been marked as ready for pickup.' });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (id) => api.entities.BorrowRequest.release(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readyRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
      setSuccessModal({ title: t('pickupConfirmed') || 'Pickup Confirmed', desc: t('pickupConfirmedDesc') || 'The borrower has successfully picked up the equipment.' });
    },
  });

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

  const isPending = prepareMutation.isPending || releaseMutation.isPending;
  const isLoading = loadingApproved || loadingReady;
  const isError = errorApproved || errorReady;
  const error = errorMsgApproved || errorMsgReady;

  const allRequests = [
    ...approvedRequests.map(r => ({ ...r, _section: 'prepare' })),
    ...readyRequests.map(r => ({ ...r, _section: 'release' })),
  ];

  const sectionCounts = {
    all: allRequests.length,
    prepare: approvedRequests.length,
    release: readyRequests.length,
  };

  const filtered = (activeSection === 'all' ? allRequests : allRequests.filter(r => r._section === activeSection))
    .filter(r =>
      !search ||
      r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.borrower_name?.toLowerCase().includes(search.toLowerCase())
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSectionChange = (key) => { setActiveSection(key); setCurrentPage(1); };
  const handleSearch = (val) => { setSearch(val); setCurrentPage(1); };

  if (isLoading) return <EquipmentPreparationSkeleton />;

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Title Strip ── */}
      <div className="a-titlestrip" style={{ marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div className="a-eyebrow">{t('equipPrepEyebrow')}</div>
          <h1>{t('equipmentPreparation')}</h1>
          <div className="a-deck">{t('equipPrepDeck')}</div>
        </div>
        <div className="a-right">
          <div style={{ border: '1px solid var(--a-rule)', padding: '10px 18px', background: 'var(--a-surface)', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>{t('toPrep')}</div>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 24, color: 'var(--a-navy)', lineHeight: 1.1, marginTop: 2 }}>{sectionCounts.prepare}</div>
          </div>
        </div>
      </div>

      {/* ── Filter Cards ── */}
      <div className="a-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        {SECTION_CONFIG.map((cfg) => {
          const isActive = activeSection === cfg.key;
          const CfgIcon = cfg.icon;
          return (
            <button
              key={cfg.key}
              type="button"
              onClick={() => handleSectionChange(activeSection === cfg.key && cfg.key !== 'all' ? 'all' : cfg.key)}
              className={`a-card${isActive ? ' gold-edge' : ''}`}
              style={{ textAlign: 'left', cursor: 'pointer', width: '100%', background: isActive ? 'var(--a-surface-2)' : 'var(--a-surface)' }}
            >
              <div className="c-label">{t(cfg.labelKey)}</div>
              <div className="c-val" style={{ color: isActive ? cfg.fg : 'var(--a-navy)' }}>{sectionCounts[cfg.key] ?? 0}</div>
              <div className="c-sub">{t(cfg.subKey)}</div>
              <div className="c-ico"><CfgIcon style={{ width: 20, height: 20, color: cfg.fg }} /></div>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, border: '1px solid var(--a-rule)', padding: '10px 14px', background: 'var(--a-surface-2)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {t('queueLabel')} <strong style={{ color: 'var(--a-gold)' }}>{sectionCounts.all}</strong>
        </span>
        <div style={{ width: 1, height: 20, background: 'var(--a-rule)', flexShrink: 0 }} />
        <div className="a-search" style={{ flex: 1 }}>
          <Search style={{ width: 14, height: 14, color: 'var(--a-mute)', flexShrink: 0 }} />
          <input placeholder={t('searchEquipmentOrBorrower')} value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
      </div>

      {/* ── Items ── */}
      {isError ? (
        <div className="a-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, gap: 10 }}>
          <Package style={{ width: 32, height: 32, color: 'var(--a-mute-2)' }} />
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0 }}>{t('unableLoadEquipmentRequests')}</p>
          <p style={{ fontSize: 12, color: 'var(--a-mute-2)', margin: 0 }}>{error?.message || t('failedToConnect')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="a-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, gap: 10 }}>
          <Package style={{ width: 32, height: 32, color: 'var(--a-mute-2)' }} />
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0 }}>{t('noEquipmentToPrepare')}</p>
          <p style={{ fontSize: 12, color: 'var(--a-mute-2)', margin: 0 }}>{t('allEquipmentPreparedAndDistributed')}</p>
        </div>
      ) : (
        <>
          <div className="a-panel">
            {paginated.map((request, idx) => {
              const cfg = SECTION_CONFIG.find(c => c.key === request._section) || SECTION_CONFIG[0];
              const bdg = cfg.badge;
              const email = request.student_email || request.borrower_email || '';
              const category = request.category || request.equipment_category;
              const imgUrl = resolveImageUrl(request);
              const reqId = shortReqId(request.id, request.created_date || request.createdAt);

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
                    {imgUrl
                      ? <img src={imgUrl} alt={request.equipment_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Package style={{ width: 24, height: 24, color: cfg.fg }} />
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                      {bdg && (
                        <span className={`a-pill ${cfg.key === 'prepare' ? 'p-warn' : 'p-ok'}`}>
                          <span className="dot" style={{ background: bdg.dot }} />
                          {t(bdg.labelKey)}
                        </span>
                      )}
                      {category && <span className="a-pill p-mute">{category}</span>}
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
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: cfg.stripeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                            {getInitials(request.borrower_name)}
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 12, color: 'var(--a-navy)' }}>{request.borrower_name || '—'}</div>
                            {email && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--a-mute)', marginTop: 2 }}>{email}</div>}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)', marginBottom: 4 }}>{t('pickup')}</div>
                        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 12, color: 'var(--a-navy)' }}>
                          {request.borrow_date ? format(new Date(request.borrow_date), 'MMM d, yyyy') : '—'}
                        </div>
                        {request.return_date && (
                          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--a-mute)', marginTop: 2 }}>
                            {t('returnBy')} {format(new Date(request.return_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)', marginBottom: 4 }}>{t('pickupLocation')}</div>
                        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 12, color: 'var(--a-navy)' }}>Lab E101 · Pickup Bin A</div>
                        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11, color: 'var(--a-mute)', marginTop: 2 }}>Open 9:00 – 16:00</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, width: 140 }}>
                    {request._section === 'prepare' ? (
                      <button onClick={() => openPrepareDialog(request)} disabled={isPending} className="a-btn primary" style={{ justifyContent: 'center', opacity: isPending ? 0.5 : 1 }}>
                        <CheckCircle style={{ width: 13, height: 13 }} />
                        {t('markAsReady')}
                      </button>
                    ) : (
                      <button onClick={() => openReleaseDialog(request)} disabled={isPending} className="a-btn gold" style={{ justifyContent: 'center', opacity: isPending ? 0.5 : 1 }}>
                        <CheckCircle style={{ width: 13, height: 13 }} />
                        {t('confirmPickup')}
                      </button>
                    )}
                    <button
                      onClick={() => { const _eqPrep = request?.equipment?._id || request?.equipment?.id || request?.equipment; const _eqDataPrep = _eqPrep ? equipmentMap[_eqPrep] : null; setViewRequest({ ...request, _resolvedImageUrl: resolveImageUrl(request), assistant_name: request.released_by?.name || request.prepared_by?.name || request.assistant_name || user?.name, category: request.category || _eqDataPrep?.category }); }}
                      className="a-btn"
                      style={{ justifyContent: 'center' }}
                    >
                      <Eye style={{ width: 13, height: 13 }} />
                      {t('viewForm')}
                    </button>
                    <button
                      onClick={() => handlePreviewPdf(request)}
                      disabled={pdfLoadingId === request.id}
                      className="a-btn"
                      style={{ justifyContent: 'center', opacity: pdfLoadingId === request.id ? 0.5 : 1 }}
                    >
                      {pdfLoadingId === request.id
                        ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                        : <Printer style={{ width: 13, height: 13 }} />
                      }
                      {t('printSlip')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="a-pagination" style={{ border: '1px solid var(--a-rule)', borderTop: 'none', background: 'var(--a-surface-2)' }}>
            <span className="info">
              {t('showing')} {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} {t('ofLabel')} {filtered.length} {filtered.length !== 1 ? t('requestsLabel') : t('requestLabel')}
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

      {/* ── Loan Slip Modal ── */}
      <Dialog open={!!viewRequest} onOpenChange={v => { if (!v) setViewRequest(null); }}>
        <DialogContent
          className="p-0 gap-0 rounded-2xl border border-slate-200 bg-white flex flex-col"
          style={{ width: '92vw', maxWidth: 580, maxHeight: '90dvh', padding: 0 }}
        >
          <DialogTitle className="sr-only">Loan Slip</DialogTitle>
          <div className="overflow-y-auto flex-1 min-h-0 px-5 py-5">
            {viewRequest && <LoanSlip request={viewRequest} imageUrl={viewRequest._resolvedImageUrl} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Action Dialog ── */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="eq-admin p-0 gap-0" style={{ borderRadius: 2, maxWidth: 380, background: '#fff' }}>
          <DialogTitle className="sr-only">{dialogAction === 'prepare' ? t('markReadyForPickupQ') : t('confirmEquipmentPickupQ')}</DialogTitle>
          <div style={{ padding: '14px 16px 0' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: dialogAction === 'prepare' ? '#f5f3ff' : '#f0fdf4', border: `1px solid ${dialogAction === 'prepare' ? '#ddd6fe' : '#bbf7d0'}`, color: dialogAction === 'prepare' ? '#6d28d9' : '#15803d', fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: dialogAction === 'prepare' ? '#8b5cf6' : '#22c55e', flexShrink: 0 }} />
              {dialogAction === 'prepare' ? t('awaitingPreparation') : t('awaitingConfirmation')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 24px 8px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: dialogAction === 'prepare' ? '#f5f3ff' : '#dcfce7', border: `2px solid ${dialogAction === 'prepare' ? '#8b5cf6' : '#22c55e'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              {dialogAction === 'prepare'
                ? <Package size={26} style={{ color: '#8b5cf6' }} />
                : <CheckCircle size={26} style={{ color: '#22c55e' }} />
              }
            </div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 6px' }}>
              {t('actionConfirmation')}
            </p>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.2 }}>
              {dialogAction === 'prepare' ? t('markReadyForPickupQ') : t('confirmEquipmentPickupQ')}
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: 0, maxWidth: 300 }}>
              {dialogAction === 'prepare'
                ? t('reserveEquipmentMessage')
                : t('confirmPickupMessage')
              }
            </p>
          </div>
          <div style={{ margin: '0 18px 14px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '10px 14px', borderRadius: 3 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 8px' }}>{t('requestSummary')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 12px' }}>
              {[
                [t('equipment'), selectedRequest?.equipment_name],
                [t('borrower'), selectedRequest?.borrower_name],
                [t('quantity'), selectedRequest?.quantity != null ? `×${selectedRequest.quantity}` : '—'],
                [t('pickup'), selectedRequest?.borrow_date ? format(new Date(selectedRequest.borrow_date), 'MMM d, yyyy') : '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 2px' }}>{label}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: 0 }}>{val || '—'}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 18px 18px' }}>
            <button onClick={closeDialog}
              style={{ flex: 1, padding: '9px', background: 'none', border: '1px solid #e2e8f0', color: '#64748b', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t('cancel')}
            </button>
            <button onClick={handleConfirm} disabled={isPending}
              style={{ flex: 1, padding: '9px', border: 'none', color: '#fff', fontFamily: 'var(--sans)', fontSize: 11, fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer', borderRadius: 2, letterSpacing: '0.06em', background: dialogAction === 'prepare' ? '#7c3aed' : '#16a34a', opacity: isPending ? 0.7 : 1, textTransform: 'uppercase' }}>
              {isPending
                ? <><Loader2 size={13} className="animate-spin" /> {t('processing')}</>
                : dialogAction === 'prepare' ? t('markAsReady') : t('confirmPickup')
              }
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Success Modal ── */}
      <Dialog open={!!successModal} onOpenChange={() => setSuccessModal(null)}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 rounded-2xl overflow-hidden" style={{ background: '#fff' }}>
          <DialogTitle className="sr-only">Success</DialogTitle>
          <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle style={{ width: 26, height: 26, color: '#16a34a' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 18, color: 'var(--a-ink)', marginBottom: 6 }}>{successModal?.title}</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--a-mute)', lineHeight: 1.5 }}>{successModal?.desc}</div>
            </div>
            <button className="a-btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={() => setSuccessModal(null)}>
              <CheckCircle style={{ width: 14, height: 14 }} /> {t('gotIt') || 'Got it'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
