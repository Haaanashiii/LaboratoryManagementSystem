import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { AllRequestsSkeleton } from '@/skeleton-framework/admin';
import { format } from 'date-fns';
import {
  Search, Layers, Clock3, CheckCircle2, RotateCcw,
  XCircle, ChevronLeft, ChevronRight, Printer, FileText,
} from 'lucide-react';
import { printItsReceipt } from '@/utils/printItsReceipt';
import '@/styles/equimon-admin.css';

const STATUS_TABS = [
  { key: 'all',      label: 'ALL',      statuses: null,                                           icon: Layers       },
  { key: 'pending',  label: 'PENDING',  statuses: ['Pending Lecturer', 'Pending Head'],           icon: Clock3       },
  { key: 'approved', label: 'APPROVED', statuses: ['Approved', 'Ready for pickup', 'Borrowed'],  icon: CheckCircle2 },
  { key: 'returned', label: 'RETURNED', statuses: ['Returned'],                                  icon: RotateCcw    },
  { key: 'rejected', label: 'REJECTED', statuses: ['Rejected'],                                  icon: XCircle      },
];

const STATUS_PILL_MAP = {
  'Pending Lecturer': 'p-warn', 'Pending Head': 'p-warn',
  'Approved': 'p-info', 'Ready for pickup': 'p-info', 'Borrowed': 'p-info',
  'Returned': 'p-ok',
  'Rejected': 'p-bad',
};

const catColors = { Measurement: '#f97316', Microcontroller: '#3b82f6', Tools: '#ef4444', Power: '#8b5cf6', Optics: '#22c55e' };
const getCatColor = (cat) => catColors[cat] || '#64748b';

const avatarPalette = ['#f97316','#2563eb','#7c3aed','#059669','#dc2626','#0891b2','#d97706'];
const getAvatarColor = (name = '') => avatarPalette[name.charCodeAt(0) % avatarPalette.length];

const PAGE_SIZE = 10;

export default function AllRequests() {
  const [search, setSearch]           = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [currentPage, setCurrentPage]   = useState(1);

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list('-created_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
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
    const eq = eqId ? equipmentMap[eqId] : null;
    return eq?.image_url || eq?.images_urls?.[0]
      || request.equipment_image_url
      || request.equipment?.image_url
      || null;
  };

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.statuses
      ? requests.filter(r => tab.statuses.includes(r.status)).length
      : requests.length;
    return acc;
  }, {});

  const selectedTab = STATUS_TABS.find(t => t.key === activeStatus) || STATUS_TABS[0];

  React.useEffect(() => { setCurrentPage(1); }, [search, activeStatus]);

  const filteredRequests = requests.filter(request => {
    const matchesSearch =
      request.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      request.borrower_name?.toLowerCase().includes(search.toLowerCase()) ||
      request.borrower_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !selectedTab.statuses || selectedTab.statuses.includes(request.status);
    return matchesSearch && matchesStatus;
  });

  const totalPages    = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isLoading) return <AllRequestsSkeleton />;

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Title Strip ── */}
      <div className="a-titlestrip">
        <div>
          <div className="a-eyebrow">Platform · Requests</div>
          <h1>All Requests</h1>
          <div className="a-deck">Complete history of all equipment borrow requests</div>
        </div>
        <div className="a-right">
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>
            {requests.length} total
          </span>
        </div>
      </div>

      {/* ── Status KPI Tabs ── */}
      <div className="a-tabs" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {STATUS_TABS.map(tab => {
          const isActive = activeStatus === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`a-tab${isActive ? ' active' : ''}`}
              onClick={() => { setCurrentPage(1); setActiveStatus(activeStatus === tab.key && tab.key !== 'all' ? 'all' : tab.key); }}
            >
              <div className="t-label">
                <TabIcon style={{ width: 13, height: 13 }} />
                {tab.label}
              </div>
              <div className="t-val">{statusCounts[tab.key] || 0}</div>
              <div className="t-sub">requests</div>
            </button>
          );
        })}
      </div>

      {/* ── Panel + Table ── */}
      <div className="a-panel">
        <div className="p-head">
          <h2>{selectedTab.label}</h2>
          <span className="count">{filteredRequests.length}</span>
          {activeStatus !== 'all' && (
            <button
              onClick={() => { setCurrentPage(1); setActiveStatus('all'); }}
              style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--a-mute)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear
            </button>
          )}
          <div className="spacer" />
          <div className="a-search" style={{ minWidth: 220 }}>
            <Search style={{ width: 14, height: 14, color: 'var(--a-mute)', flexShrink: 0 }} />
            <input
              placeholder="Search by equipment or borrower..."
              value={search}
              onChange={e => { setCurrentPage(1); setSearch(e.target.value); }}
            />
          </div>
          <button className="a-btn primary" onClick={() => window.print()}>
            <Printer style={{ width: 13, height: 13 }} />
            Print Report
          </button>
        </div>

        {isError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', gap: 8 }}>
            <FileText style={{ width: 32, height: 32, color: 'var(--a-mute-2)' }} />
            <p style={{ fontFamily: 'var(--serif)', color: 'var(--a-ink)', margin: 0 }}>Unable to load requests</p>
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0, fontSize: 12 }}>
              {error?.message || 'Failed to connect to the server.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="a-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Borrower</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <FileText style={{ width: 28, height: 28, color: 'var(--a-mute-2)', margin: '0 auto 8px' }} />
                      <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0 }}>No requests found</p>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map(request => {
                    const catColor   = getCatColor(request.category || request.equipment_category);
                    const initials   = (request.borrower_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    const avatarColor = getAvatarColor(request.borrower_name || '');
                    const createdRaw  = request.created_date || request.createdAt;
                    const equipImgUrl = getEquipmentImage(request);
                    const pillClass   = STATUS_PILL_MAP[request.status] || 'p-mute';

                    return (
                      <tr key={request.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {equipImgUrl ? (
                              <img src={equipImgUrl} alt={request.equipment_name}
                                style={{ width: 36, height: 36, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--a-rule)' }} />
                            ) : (
                              <div style={{ width: 36, height: 36, background: `${catColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText style={{ width: 14, height: 14, color: catColor }} />
                              </div>
                            )}
                            <div>
                              <div className="primary">{request.equipment_name}</div>
                              <div className="mono muted" style={{ fontSize: 10 }}>Qty: {request.quantity}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--a-ink)', fontSize: 13 }}>{request.borrower_name || '—'}</div>
                              <div className="muted" style={{ fontSize: 11 }}>{request.student_email || request.borrower_email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12, color: 'var(--a-ink-2)' }}>
                            {request.borrow_date ? format(new Date(request.borrow_date), 'MMM d, yyyy') : '—'}
                          </div>
                          {request.return_date && (
                            <div className="muted" style={{ fontSize: 11 }}>
                              → {format(new Date(request.return_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`a-pill ${pillClass}`}>
                            <span className="dot" style={{ background: 'currentColor' }} />
                            {request.status}
                          </span>
                        </td>
                        <td>
                          {createdRaw ? (
                            <>
                              <div style={{ fontSize: 12, color: 'var(--a-ink-2)' }}>{format(new Date(createdRaw), 'EEE, MMM d')}</div>
                              <div className="muted" style={{ fontSize: 11 }}>{format(new Date(createdRaw), 'HH:mm')}</div>
                            </>
                          ) : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                              className="a-btn primary"
                              style={{ padding: '6px 10px', fontSize: 9 }}
                              onClick={() => printItsReceipt(request)}
                            >
                              Review
                            </button>
                            <button
                              className="a-btn"
                              style={{ padding: '6px 8px' }}
                              title="Print receipt"
                              onClick={() => printItsReceipt(request)}
                            >
                              <Printer style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="a-pagination">
                <span className="info">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length}
                </span>
                <div className="pages">
                  <button className="a-btn" style={{ padding: '6px 10px' }} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft style={{ width: 14, height: 14 }} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`a-btn${currentPage === page ? ' primary' : ''}`}
                      style={{ padding: '6px 10px', minWidth: 32 }}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button className="a-btn" style={{ padding: '6px 10px' }} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
