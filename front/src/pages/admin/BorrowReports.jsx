import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import LoanSlip from '@/components/ui/LoanSlip';
import {
  Search, Printer, FileText,
  Layers, Clock3, CheckCircle2, RotateCcw, XCircle,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import '@/styles/equimon-admin.css';

const STATUS_TABS = [
  { key: 'all',      labelKey: 'all',      statuses: null,                                           icon: Layers       },
  { key: 'pending',  labelKey: 'pending',  statuses: ['pending_lecturer', 'pending_head'],           icon: Clock3       },
  { key: 'active',   labelKey: 'active',   statuses: ['head_approved', 'ready_pickup', 'borrowed'],  icon: CheckCircle2 },
  { key: 'returned', labelKey: 'returned', statuses: ['returned'],                                   icon: RotateCcw    },
  { key: 'rejected', labelKey: 'rejected', statuses: ['rejected'],                                   icon: XCircle      },
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

export default function BorrowReports() {
  const { t } = useLang();
  const [search, setSearch]             = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [currentPage, setCurrentPage]   = useState(1);
  const [reportRequest, setReportRequest] = useState(null);

  const { data: requests = [], isLoading, isError } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list(),
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

  const getEquipmentImage = (request) => {
    const eqId = request?.equipment?._id || request?.equipment?.id || request?.equipment;
    return eqId ? (equipmentMap[eqId]?.image_url || null) : null;
  };

  React.useEffect(() => { setCurrentPage(1); }, [search, activeStatus]);

  const selectedTab = STATUS_TABS.find(tab => tab.key === activeStatus) || STATUS_TABS[0];

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.statuses
      ? requests.filter(r => tab.statuses.includes(r.status)).length
      : requests.length;
    return acc;
  }, {});

  const filtered = requests.filter(r => {
    const matchStatus = !selectedTab.statuses || selectedTab.statuses.includes(r.status);
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      (r.equipment_name || '').toLowerCase().includes(q) ||
      (r.borrower_name  || '').toLowerCase().includes(q) ||
      (r.student_email  || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="eq-admin" style={{ paddingBottom: 40 }}>

        {/* Title Strip */}
        <div className="a-titlestrip">
          <div style={{ flex: 1 }}>
            <div className="a-eyebrow">Inventory &amp; Lending · Reports</div>
            <h1>{t('borrowRequestReports')}</h1>
            <p className="a-deck">{t('generatePdfReportsDesc')}</p>
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
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '12px 16px', minWidth: 120 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon style={{ width: 13, height: 13 }} />
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(labelKey)}</span>
                </div>
                <span style={{ fontSize: 24, fontFamily: 'var(--serif)', fontWeight: 700, lineHeight: 1, marginTop: 2 }}>
                  {(statusCounts[key] || 0).toLocaleString()}
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

            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--a-rule)', borderTopColor: 'var(--a-navy)', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : isError ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 64, color: 'var(--a-mute)' }}>
                <FileText style={{ width: 32, height: 32 }} />
                <p style={{ fontSize: 13 }}>{t('unableLoadRequests')}</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>{t('equipment')}</th>
                      <th>{t('borrower')}</th>
                      <th>{t('borrowDate')}</th>
                      <th>{t('returnDate')}</th>
                      <th>{t('status')}</th>
                      <th>{t('submitted')}</th>
                      <th style={{ textAlign: 'center' }}>{t('pdfReport')}</th>
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
                        const pillClass = STATUS_PILL[request.status] || 'p-mute';
                        return (
                          <tr key={request.id}>
                            <td>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{request.equipment_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--a-mute)' }}>{t('qty')}: {request.quantity}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{request.borrower_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--a-mute)' }}>{request.student_email || request.borrower_email}</div>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--a-ink-2)', whiteSpace: 'nowrap' }}>
                              {request.borrow_date && format(new Date(request.borrow_date), 'MMM d, yyyy')}
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--a-ink-2)', whiteSpace: 'nowrap' }}>
                              {request.return_date && format(new Date(request.return_date), 'MMM d, yyyy')}
                            </td>
                            <td>
                              <span className={`a-pill ${pillClass}`} style={{ whiteSpace: 'nowrap' }}>
                                {request.status}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--a-mute)', whiteSpace: 'nowrap' }}>
                              {request.created_date && format(new Date(request.created_date), 'MMM d, yyyy')}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className="a-btn"
                                onClick={() => setReportRequest(request)}
                                style={{ gap: 5 }}
                              >
                                <Printer style={{ width: 13, height: 13 }} />
                                {t('report')}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {filtered.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--a-rule)' }}>
                    <span style={{ fontSize: 12, color: 'var(--a-mute)' }}>
                      {t('showing')} {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} {t('ofLabel')} {filtered.length} {t('requestsLabel')}
                    </span>
                    <Pager page={currentPage} total={totalPages} onPage={setCurrentPage} />
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Loan Slip Modal — kept as-is */}
      <Dialog open={!!reportRequest} onOpenChange={() => setReportRequest(null)}>
        <DialogContent className="sm:max-w-[560px] rounded-2xl bg-white p-5 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Loan Slip</DialogTitle>
          {reportRequest && (
            <LoanSlip
              request={reportRequest}
              imageUrl={getEquipmentImage(reportRequest)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
