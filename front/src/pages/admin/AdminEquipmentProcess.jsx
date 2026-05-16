import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useLang } from '@/components/i18n/LangContext';
import {
  Search, ChevronDown,
  Layers, Clock3, CheckCircle2, RotateCcw, XCircle, Laptop,
  X, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import '@/styles/equimon-admin.css';

const STATUS_TABS = [
  { key: 'all',      labelKey: 'all',      statuses: null,                               icon: Layers       },
  { key: 'pending',  labelKey: 'pending',  statuses: ['pending_lecturer','pending_head'], icon: Clock3       },
  { key: 'approved', labelKey: 'approved', statuses: ['head_approved','ready_pickup'],    icon: CheckCircle2 },
  { key: 'borrowed', labelKey: 'borrowed', statuses: ['borrowed'],                        icon: Laptop       },
  { key: 'returned', labelKey: 'returned', statuses: ['returned'],                        icon: RotateCcw    },
  { key: 'rejected', labelKey: 'rejected', statuses: ['rejected'],                        icon: XCircle      },
];

const JOURNEY_STEPS = [
  { key: 'pending_lecturer', labelKey: 'submitted'    },
  { key: 'pending_head',     labelKey: 'lecApproved'  },
  { key: 'head_approved',    labelKey: 'headapproved' },
  { key: 'ready_pickup',     labelKey: 'readyPickup'  },
  { key: 'borrowed',         labelKey: 'borrowed'     },
  { key: 'returned',         labelKey: 'returned'     },
];

const STATUS_PILL = {
  pending_lecturer: 'p-warn',
  pending_head:     'p-warn',
  head_approved:    'p-gold',
  ready_pickup:     'p-info',
  borrowed:         'p-info',
  returned:         'p-ok',
  rejected:         'p-bad',
};

const PAGE_SIZE = 15;

const getPaginationRange = (current, total, delta = 2) => {
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);
  const range = [1];
  if (left > 2) range.push('...');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push('...');
  if (total > 1) range.push(total);
  return range;
};

const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 28, height: 28, padding: '0 6px', borderRadius: 6,
  border: '1px solid var(--a-rule)', background: 'var(--a-surface)',
  fontSize: 12, color: 'var(--a-ink)', cursor: 'pointer',
};
const btnActive = { ...btnBase, background: 'var(--a-navy)', color: '#fff', borderColor: 'var(--a-navy)' };

function Pager({ page, total, onPage }) {
  if (total <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button style={btnBase} onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>Prev</button>
      {getPaginationRange(page, total).map((item, idx) =>
        item === '...' ? (
          <span key={`e-${idx}`} style={{ padding: '0 4px', fontSize: 12, color: 'var(--a-mute)' }}>…</span>
        ) : (
          <button key={item} style={page === item ? btnActive : btnBase} onClick={() => onPage(item)}>{item}</button>
        )
      )}
      <button style={btnBase} onClick={() => onPage(Math.min(total, page + 1))} disabled={page === total}>Next</button>
    </div>
  );
}

function ProgressTracker({ status }) {
  const { t } = useLang();

  if (status === 'rejected') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', padding: '8px 12px', fontSize: 12, color: '#dc2626' }}>
        <X style={{ width: 14, height: 14, flexShrink: 0 }} />
        {t('requestWasRejected')}
      </div>
    );
  }

  const currentStep = Math.max(1, JOURNEY_STEPS.findIndex(s => s.key === status) + 1);
  const progress = (currentStep / JOURNEY_STEPS.length) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--a-ink-2)' }}>{t('progress')}</span>
        <span style={{ fontSize: 11, color: 'var(--a-mute)' }}>{t('step')} {currentStep} {t('ofLabel')} {JOURNEY_STEPS.length}</span>
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: 9999, background: 'var(--a-rule)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 9999, background: 'var(--a-navy)', width: `${progress}%`, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${JOURNEY_STEPS.length}, 1fr)`, gap: 4 }}>
        {JOURNEY_STEPS.map((step, idx) => {
          const num = idx + 1;
          const isDone = currentStep > num;
          const isCurrent = currentStep === num;
          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                background: isDone || isCurrent ? 'var(--a-navy)' : 'var(--a-rule)',
                color: isDone || isCurrent ? '#fff' : 'var(--a-mute)',
                outline: isCurrent ? '2px solid var(--a-gold)' : 'none',
                outlineOffset: 1,
              }}>{num}</div>
              <span style={{ fontSize: 9, lineHeight: 1.3, color: isDone || isCurrent ? 'var(--a-ink-2)' : 'var(--a-mute)' }}>
                {t(step.labelKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminEquipmentProcess() {
  const { t } = useLang();
  const [search, setSearch]             = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [currentPage, setCurrentPage]   = useState(1);
  const [expandedId, setExpandedId]     = useState(null);

  const { data: requests = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list('-created_date'),
  });

  React.useEffect(() => { setCurrentPage(1); }, [search, activeStatus]);

  const selectedTab = STATUS_TABS.find(tab => tab.key === activeStatus) ?? STATUS_TABS[0];

  const statusCounts = useMemo(() =>
    STATUS_TABS.reduce((acc, tab) => {
      acc[tab.key] = tab.statuses
        ? requests.filter(r => tab.statuses.includes(r.status)).length
        : requests.length;
      return acc;
    }, {}),
  [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter(r => {
      const matchStatus = !selectedTab.statuses || selectedTab.statuses.includes(r.status);
      const matchSearch = !q ||
        (r.equipment_name || '').toLowerCase().includes(q) ||
        (r.borrower_name  || '').toLowerCase().includes(q) ||
        (r.student_email  || '').toLowerCase().includes(q) ||
        (r.borrower_email || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [requests, selectedTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="eq-admin" style={{ padding: 24 }}>
        <div style={{ height: 80, background: 'var(--a-surface-2)', borderRadius: 8, marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 16 }}>
          {[...Array(6)].map((_, i) => <div key={i} style={{ height: 72, background: 'var(--a-surface-2)', borderRadius: 8 }} />)}
        </div>
        <div style={{ height: 320, background: 'var(--a-surface-2)', borderRadius: 8 }} />
      </div>
    );
  }

  return (
    <div className="eq-admin" style={{ paddingBottom: 40 }}>

      {/* Title Strip */}
      <div className="a-titlestrip">
        <div style={{ flex: 1 }}>
          <div className="a-eyebrow">Inventory &amp; Lending · Operations</div>
          <h1>{t('equipmentProcess')}</h1>
          <p className="a-deck">{t('monitorBorrowRequestsDesc')}</p>
        </div>
        <div className="a-right">
          <button className="a-btn" onClick={() => refetch()}>
            <RefreshCw style={{ width: 13, height: 13 }} />
            {t('refresh')}
          </button>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>

        {/* KPI Tab Strip */}
        <div className="a-tabs" style={{ marginTop: 20, gridTemplateColumns: `repeat(${STATUS_TABS.length}, 1fr)` }}>
          {STATUS_TABS.map(({ key, labelKey, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={`a-tab${activeStatus === key ? ' active' : ''}`}
              onClick={() => { setActiveStatus(activeStatus === key && key !== 'all' ? 'all' : key); setCurrentPage(1); }}
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '12px 16px', minWidth: 100 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon style={{ width: 13, height: 13 }} />
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(labelKey)}</span>
              </div>
              <span style={{ fontSize: 24, fontFamily: 'var(--serif)', fontWeight: 700, lineHeight: 1, marginTop: 2 }}>
                {(statusCounts[key] ?? 0).toLocaleString()}
              </span>
            </button>
          ))}
        </div>

        {/* Table Panel */}
        <div className="a-panel" style={{ marginTop: 16 }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--a-rule)', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{t(selectedTab.labelKey)}</span>
              <span className="a-pill p-mute">{filtered.length.toLocaleString()}</span>
              {activeStatus !== 'all' && (
                <button
                  onClick={() => { setActiveStatus('all'); setCurrentPage(1); }}
                  style={{ fontSize: 11, color: 'var(--a-mute)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {t('clear')}
                </button>
              )}
            </div>
            <div className="a-search" style={{ width: 240 }}>
              <Search style={{ width: 14, height: 14 }} />
              <input
                placeholder={t('searchEquipmentOrBorrower')}
                value={search}
                onChange={e => { setCurrentPage(1); setSearch(e.target.value); }}
              />
            </div>
          </div>

          {isError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 64, color: 'var(--a-mute)' }}>
              <XCircle style={{ width: 32, height: 32 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{t('unableLoadRequests')}</p>
              <p style={{ fontSize: 12 }}>{error?.message || t('failedConnectServer')}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="a-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }} />
                    <th>{t('equipment')}</th>
                    <th>{t('borrower')}</th>
                    <th>{t('borrowDate')}</th>
                    <th>{t('returnDate')}</th>
                    <th>{t('status')}</th>
                    <th>{t('submitted')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 56, color: 'var(--a-mute)', fontSize: 13 }}>
                        {t('noRequestsFound')}
                      </td>
                    </tr>
                  ) : (
                    paginated.map(request => {
                      const id = request._id || request.id;
                      const isExpanded = expandedId === id;
                      const pillClass = STATUS_PILL[request.status] || 'p-mute';
                      return (
                        <React.Fragment key={id}>
                          <tr
                            style={{ cursor: 'pointer' }}
                            onClick={() => setExpandedId(isExpanded ? null : id)}
                          >
                            <td style={{ paddingLeft: 16, paddingRight: 8 }}>
                              <ChevronDown style={{ width: 14, height: 14, color: 'var(--a-mute)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </td>
                            <td>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{request.equipment_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--a-mute)' }}>{t('qty')}: {request.quantity}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{request.borrower_name || '—'}</div>
                              <div style={{ fontSize: 11, color: 'var(--a-mute)' }}>{request.student_email || request.borrower_email || ''}</div>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--a-ink-2)', whiteSpace: 'nowrap' }}>
                              {request.borrow_date ? format(new Date(request.borrow_date), 'MMM d, yyyy') : '—'}
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--a-ink-2)', whiteSpace: 'nowrap' }}>
                              {request.return_date ? format(new Date(request.return_date), 'MMM d, yyyy') : '—'}
                            </td>
                            <td>
                              <span className={`a-pill ${pillClass}`} style={{ whiteSpace: 'nowrap' }}>
                                {request.status}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--a-mute)', whiteSpace: 'nowrap' }}>
                              {request.created_date
                                ? format(new Date(request.created_date), 'MMM d, yyyy')
                                : request.createdAt
                                ? format(new Date(request.createdAt), 'MMM d, yyyy')
                                : '—'}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr style={{ background: 'var(--a-surface-2)' }}>
                              <td colSpan={7} style={{ padding: '16px 24px' }}>
                                <ProgressTracker status={request.status} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--a-rule)' }}>
              <span style={{ fontSize: 12, color: 'var(--a-mute)' }}>
                Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()} entries
              </span>
              <Pager page={safePage} total={totalPages} onPage={setCurrentPage} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
