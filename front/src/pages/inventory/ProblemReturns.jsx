import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, Package, Search, CheckCircle, Loader2,
  ShieldCheck, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import '@/styles/equimon-admin.css';

const PAGE_SIZE = 10;

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name[0].toUpperCase();
};

const CONDITION_CONFIG = {
  Lost:    { label: 'Lost',    bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  color: '#ef4444', dot: '#ef4444' },
  Damaged: { label: 'Damaged', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b', dot: '#f59e0b' },
};

export default function ProblemReturns() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [successItem, setSuccessItem] = useState(null);

  const { data: returnedRequests = [], isLoading, isError } = useQuery({
    queryKey: ['returnedRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'returned' }, '-actual_return_date'),
  });

  const pendingReplacements = useMemo(() =>
    returnedRequests.filter(r => r.student_will_replace && !r.replacement_completed),
    [returnedRequests]
  );

  const filtered = useMemo(() =>
    pendingReplacements.filter(r =>
      !search ||
      r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.borrower_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.student_email?.toLowerCase().includes(search.toLowerCase())
    ),
    [pendingReplacements, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const replacementMutation = useMutation({
    mutationFn: ({ id, notes: n }) => api.entities.BorrowRequest.completeReplacement(id, n),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['returnedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setSuccessItem(selected);
      setSelected(null);
      setNotes('');
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to verify replacement. Please try again.');
    },
  });

  const openDialog = (request) => {
    setSelected(request);
    setNotes('');
  };

  const handleConfirm = () => {
    if (!selected) return;
    replacementMutation.mutate({ id: selected.id, notes });
  };

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* Title Strip */}
      <div className="a-titlestrip" style={{ marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div className="a-eyebrow">Operations · Problem Returns</div>
          <h1 style={{ margin: '4px 0 6px', fontSize: 26 }}>Replacement Tracking</h1>
          <div className="a-deck">Verify equipment replacements from students who lost or damaged items.</div>
        </div>
        <div className="a-right">
          <div style={{ border: '1px solid var(--a-rule)', padding: '10px 18px', background: 'var(--a-surface)', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>Pending</div>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 24, color: '#ef4444', lineHeight: 1.1, marginTop: 2 }}>{pendingReplacements.length}</div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      {pendingReplacements.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', marginBottom: 20, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)', borderLeft: '3px solid #ef4444' }}>
          <AlertTriangle style={{ width: 16, height: 16, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: 'var(--a-ink)', marginBottom: 2 }}>
              {pendingReplacements.length} replacement{pendingReplacements.length !== 1 ? 's' : ''} awaiting verification
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)' }}>
              When a student brings back the replacement item, click "Verify Replacement" to close the case and restore equipment availability.
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, border: '1px solid var(--a-rule)', padding: '10px 14px', background: 'var(--a-surface-2)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)', flexShrink: 0 }}>
          Pending <strong style={{ color: '#ef4444' }}>{pendingReplacements.length}</strong>
        </span>
        <div style={{ width: 1, height: 20, background: 'var(--a-rule)', flexShrink: 0 }} />
        <div className="a-search" style={{ flex: 1 }}>
          <Search style={{ width: 14, height: 14, color: 'var(--a-mute)', flexShrink: 0 }} />
          <input
            placeholder="Search by equipment or borrower..."
            value={search}
            onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="a-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 10 }}>
          <Loader2 style={{ width: 24, height: 24, color: 'var(--a-mute)', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0 }}>Loading...</p>
        </div>
      ) : isError ? (
        <div className="a-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, gap: 10 }}>
          <AlertTriangle style={{ width: 32, height: 32, color: 'var(--a-mute-2)' }} />
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0 }}>Failed to load data.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="a-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, gap: 10 }}>
          <ShieldCheck style={{ width: 36, height: 36, color: 'var(--a-ok)', opacity: 0.6 }} />
          <p style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: 'var(--a-navy)', margin: 0 }}>
            {search ? 'No results found' : 'All clear — no pending replacements'}
          </p>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', margin: 0 }}>
            {search ? 'Try a different search term.' : 'Students have either replaced all items or none are required.'}
          </p>
        </div>
      ) : (
        <>
          <div className="a-panel">
            {paginated.map((request, idx) => {
              const cond = CONDITION_CONFIG[request.return_condition] || CONDITION_CONFIG.Lost;
              const equipImgUrl = request.equipment_image_url || request.equipment?.image_url || request.equipment?.image || '';
              const returnedOn = request.actual_return_date || request.updatedAt;
              const reqId = `REQ-${new Date(request.createdAt || request.created_date).getFullYear()}-${String(request.id || '').padStart(4, '0').slice(-4)}`;

              return (
                <div
                  key={request.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 18, padding: '18px 22px',
                    borderBottom: idx < paginated.length - 1 ? '1px solid var(--a-rule-2)' : 'none',
                    position: 'relative',
                  }}
                >
                  {/* Left stripe */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: cond.color }} />

                  {/* Equipment image */}
                  <div style={{ width: 64, height: 64, border: '1px solid var(--a-rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', background: 'var(--a-surface-2)' }}>
                    {equipImgUrl
                      ? <img src={equipImgUrl} alt={request.equipment_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Package style={{ width: 24, height: 24, color: cond.color }} />
                    }
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                      <span
                        className="a-pill"
                        style={{ background: cond.bg, borderColor: cond.border, color: cond.color, display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cond.dot, flexShrink: 0 }} />
                        {cond.label}
                      </span>
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
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)', marginBottom: 4 }}>Student</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: cond.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                            {getInitials(request.borrower_name)}
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 12, color: 'var(--a-navy)' }}>{request.borrower_name || '—'}</div>
                            {request.student_email && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--a-mute)', marginTop: 2 }}>{request.student_email}</div>}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)', marginBottom: 4 }}>Condition</div>
                        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 12, color: cond.color }}>{request.return_condition}</div>
                      </div>
                      {request.damage_details && (
                        <div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)', marginBottom: 4 }}>Damage Details</div>
                          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-ink-2)', maxWidth: 200 }}>{request.damage_details}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)', marginBottom: 4 }}>Returned On</div>
                        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 12, color: 'var(--a-navy)' }}>
                          {returnedOn ? format(new Date(returnedOn), 'MMM d, yyyy') : '—'}
                        </div>
                      </div>
                      {request.return_remarks && (
                        <div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--a-mute)', marginBottom: 4 }}>Remarks</div>
                          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-ink-2)', maxWidth: 220 }}>{request.return_remarks}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, width: 160 }}>
                    <button
                      onClick={() => openDialog(request)}
                      className="a-btn primary"
                      style={{ justifyContent: 'center', gap: 6, background: 'var(--a-ok)', borderColor: 'var(--a-ok)' }}
                    >
                      <CheckCircle style={{ width: 13, height: 13 }} />
                      Verify Replacement
                    </button>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--a-mute)', textAlign: 'center', lineHeight: 1.4 }}>
                      Click when student brings back replacement item
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="a-pagination" style={{ border: '1px solid var(--a-rule)', borderTop: 'none', background: 'var(--a-surface-2)' }}>
              <span className="info">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} items
              </span>
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
            </div>
          )}
        </>
      )}

      {/* Verify Replacement Dialog */}
      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setNotes(''); }}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              Verify Replacement
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1.5 text-xs">
              <p><span className="text-slate-500">Equipment:</span> <span className="font-medium text-slate-800">{selected?.equipment_name}</span> <span className="text-slate-400">×{selected?.quantity}</span></p>
              <p><span className="text-slate-500">Student:</span> <span className="text-slate-700">{selected?.borrower_name}</span></p>
              <p><span className="text-slate-500">Condition:</span>{' '}
                <span style={{ color: CONDITION_CONFIG[selected?.return_condition]?.color || '#ef4444', fontWeight: 600 }}>
                  {selected?.return_condition}
                </span>
              </p>
              {selected?.damage_details && (
                <p><span className="text-slate-500">Damage:</span> <span className="italic text-slate-600">{selected.damage_details}</span></p>
              )}
            </div>

            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-800">
                Confirming this means the student has physically brought back the replacement item and it has been accepted by the lab.
              </p>
              {selected?.return_condition === 'Lost' && (
                <p className="mt-1 text-xs text-emerald-700">
                  Equipment availability will be restored by <strong>×{selected?.quantity}</strong> unit{selected?.quantity !== 1 ? 's' : ''}.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Verification Notes <span className="text-slate-400">(optional)</span></label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Replacement item accepted in good condition."
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={() => { setSelected(null); setNotes(''); }} className="text-xs" disabled={replacementMutation.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={replacementMutation.isPending}
              className="text-xs text-white bg-emerald-600 hover:bg-emerald-700"
            >
              {replacementMutation.isPending
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Verifying...</>
                : <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Confirm Replacement Received</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={!!successItem} onOpenChange={() => setSuccessItem(null)}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 rounded-2xl overflow-hidden" style={{ background: '#fff' }}>
          <DialogTitle className="sr-only">Replacement Verified</DialogTitle>
          <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck style={{ width: 26, height: 26, color: '#16a34a' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 18, color: 'var(--a-ink)', marginBottom: 6 }}>Replacement Verified</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--a-mute)', lineHeight: 1.5 }}>
                <strong>{successItem?.equipment_name}</strong> replacement has been accepted.
                {successItem?.return_condition === 'Lost' && ' Equipment availability has been restored.'}
                {' '}The student can now borrow again.
              </div>
            </div>
            <button className="a-btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setSuccessItem(null)}>
              <CheckCircle style={{ width: 14, height: 14 }} /> Got it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
