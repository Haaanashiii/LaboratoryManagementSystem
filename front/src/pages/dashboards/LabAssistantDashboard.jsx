import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { api } from '@/api/apiClient';
import {
  CheckCircle, Package, Clock, History,
  ChevronRight,
} from 'lucide-react';
import { AssistantDashboardSkeleton } from '@/skeleton-framework/assistant';
import '@/styles/equimon-admin.css';
import { useLang } from '@/components/i18n/LangContext';

function fmtDate(raw) {
  try {
    const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
    return isValid(d) ? format(d, 'EEE, MMM d · HH:mm') : '—';
  } catch { return '—'; }
}

const CATEGORY_COLORS = ['#2563eb', '#0F2A4A', '#22c55e', '#f97316', '#8b5cf6', '#06b6d4', '#e11d48'];

export default function LabAssistantDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => api.auth.me() });

  const { data: allRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list(),
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  const readyForPrep   = allRequests.filter(r => r.status === 'head_approved');
  const readyForPickup = allRequests.filter(r => r.status === 'ready_pickup');
  const borrowed       = allRequests.filter(r => r.status === 'borrowed');

  const equipmentByCategory = React.useMemo(() => {
    const map = {};
    equipment.forEach(item => {
      const cat = item.category || 'Other';
      const qty = Number(item.quantity ?? item.total_quantity ?? 1);
      map[cat] = (map[cat] || 0) + qty;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [equipment]);

  const totalUnits = equipmentByCategory.reduce((s, c) => s + c.value, 0);

  const topBorrowers = React.useMemo(() => {
    const counts = {};
    allRequests.forEach(r => {
      const name = r.borrower_name || r.student_name || r.student_email?.split('@')[0] || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [allRequests]);

  const h = new Date().getHours();
  const greetingText = h < 12 ? t('goodMorning') : h < 18 ? t('goodAfternoon') : t('goodEvening');
  const firstName = (user?.full_name || user?.name || 'Assistant').split(' ')[0];

  const kpiCards = [
    { label: t('readyForPrepKpiLabel'), value: readyForPrep.length, sub: t('awaitingPreparation'), icon: Package, color: '#f59e0b', onClick: () => navigate('/equipment-prep') },
    { label: t('readyForPickup'), value: readyForPickup.length, sub: t('preparedAndWaiting'), icon: CheckCircle, color: '#22c55e', onClick: () => navigate('/equipment-prep') },
    { label: t('currentlyBorrowedKpiLabel'), value: borrowed.length, sub: t('activeLoansOut'), icon: Clock, color: '#2563eb', onClick: () => navigate('/returns') },
    { label: t('pendingReturnsKpiLabel'), value: borrowed.length, sub: t('awaitingReturnSub'), icon: History, color: '#7c3aed', onClick: () => navigate('/returns') },
  ];

  if (requestsLoading || equipmentLoading) return <AssistantDashboardSkeleton />;

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Greeting Strip ── */}
      <div className="a-titlestrip">
        <div>
          <div className="a-eyebrow">{t('labAssistantDashEyebrow')}</div>
          <h1 style={{ margin: '4px 0 6px', fontSize: 26 }}>
            {greetingText}, <span style={{ color: '#3b82f6' }}>{firstName}</span>
          </h1>
          <div className="a-deck">{format(new Date(), 'EEEE, MMMM d, yyyy')} · {t('labDeckText')}</div>
        </div>
        <div className="a-right">
          <div style={{ border: '1px solid var(--a-rule)', padding: '10px 18px', background: 'var(--a-surface)', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>{t('inInventoryLabel')}</div>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 24, color: 'var(--a-navy)', lineHeight: 1.1, marginTop: 2 }}>{equipment.length}</div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="a-cards" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {kpiCards.map(({ label, value, sub, icon: Icon, color, onClick }) => (
          <button key={label} className="a-card" onClick={onClick}
            style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}>
            <div className="c-label">{label}</div>
            <div className="c-val" style={{ color }}>{value}</div>
            <div className="c-sub">{sub}</div>
            <div className="c-ico"><Icon style={{ width: 20, height: 20, color }} /></div>
          </button>
        ))}
      </div>

      {/* ── Today's Action Items ── */}
      {readyForPrep.length > 0 && (
        <div className="a-panel" style={{ marginBottom: 0 }}>
          <div className="p-head">
            <h2>{t('todaysActionItems')}</h2>
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)' }}>{t('sortedByPriority')}</span>
          </div>
          {readyForPrep.slice(0, 3).map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderBottom: '1px solid var(--a-rule-2)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(37,99,235,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {r.equipment_image_url
                  ? <img src={r.equipment_image_url} alt={r.equipment_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Package style={{ width: 16, height: 16, color: '#2563eb' }} />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: 'var(--a-ink)' }}>{t('prepareEquipmentAction')}</span>
                  {i === 0 && <span className="a-pill p-info" style={{ fontSize: 9, padding: '2px 7px', letterSpacing: '0.08em' }}>{t('urgent')}</span>}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.equipment_name} ×{r.quantity} — {r.borrower_name || r.student_name || r.student_email} · {t('approved')} {fmtDate(r.updated_at ?? r.created_at ?? r.createdAt)}
                </div>
              </div>
              <button className="a-btn primary" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('/equipment-prep')}>
                {t('prepareBtn')} <ChevronRight style={{ width: 12, height: 12 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Equipment Prep Queue Table ── */}
      <div className="a-panel">
        <div className="p-head">
          <h2>{t('equipmentPrepQueue')}</h2>
          <span className="count">{readyForPrep.length}</span>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)' }}>{t('approvedByHeadPrepPickup')}</span>
          <div className="spacer" />
          {readyForPrep.length > 0 && (
            <button className="a-btn" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('/equipment-prep')}>
              {t('viewAll')} <ChevronRight style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
        {readyForPrep.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 8 }}>
            <Package style={{ width: 28, height: 28, color: 'var(--a-ok)', opacity: 0.5 }} />
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0 }}>{t('prepQueueClearNothing')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="a-table">
              <thead>
                <tr>
                  <th>{t('equipment')}</th>
                  <th>{t('student')}</th>
                  <th className="num">{t('qty')}</th>
                  <th>{t('approvedStatLabel')}</th>
                  <th>{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {readyForPrep.slice(0, 5).map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="primary">{r.equipment_name}</div>
                      {r.category && <div className="muted" style={{ fontSize: 11 }}>{r.category}</div>}
                    </td>
                    <td className="muted">{r.borrower_name || r.student_name || r.student_email}</td>
                    <td className="num">×{r.quantity}</td>
                    <td className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(r.updated_at ?? r.created_at ?? r.createdAt)}</td>
                    <td>
                      <button className="a-btn primary" style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                        onClick={() => navigate('/equipment-prep')}>
                        {t('prepareBtn')} <ChevronRight style={{ width: 11, height: 11 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bottom: Equipment Chart + Top Borrowers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* Equipment by Category Donut */}
        <div className="a-panel" style={{ marginBottom: 0 }}>
          <div className="p-head">
            <h2>{t('equipmentByCategory')}</h2>
            <span className="count">{totalUnits}</span>
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)' }}>{t('totalUnitsAcrossCategories')}</span>
          </div>
          <div style={{ padding: '20px 24px' }}>
            {equipmentByCategory.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 8 }}>
                <Package style={{ width: 28, height: 28, color: 'var(--a-mute-2)', opacity: 0.5 }} />
                <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', margin: 0 }}>{t('noEquipmentDataLabel')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                {/* Donut */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={equipmentByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={74}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {equipmentByCategory.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, n) => [v, n]}
                        contentStyle={{ borderRadius: 0, fontSize: 11, border: '1px solid var(--a-rule)', fontFamily: 'var(--sans)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--a-navy)', lineHeight: 1 }}>{totalUnits}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--a-mute)', marginTop: 4 }}>{t('total')}</span>
                  </div>
                </div>

                {/* Category Legend */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {equipmentByCategory.map((cat, i) => (
                    <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ width: 10, height: 10, flexShrink: 0, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        <span style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--a-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--a-navy)', flexShrink: 0 }}>{cat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available / Out / Maint footer */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--a-rule)', marginTop: 20, paddingTop: 16, textAlign: 'center' }}>
              {[
                { label: t('availableLabel'), value: equipment.filter(e => !e.status || e.status === 'available').length, color: 'var(--a-ok)' },
                { label: t('outLabel'),       value: borrowed.length, color: '#2563eb' },
                { label: t('forPrepLabel'),   value: readyForPrep.length, color: 'var(--a-gold)' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Borrowers */}
        <div className="a-panel" style={{ marginBottom: 0 }}>
          <div className="p-head"><h2>{t('topBorrowers')}</h2></div>
          {topBorrowers.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', margin: 0 }}>{t('noRequestDataYet')}</p>
            </div>
          ) : (
            <div>
              {topBorrowers.map(({ name, count }, i) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--a-rule-2)' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: i === 0 ? '#2563eb' : 'var(--a-mute)', width: 14, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ width: 28, height: 28, background: 'var(--a-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: '#93c5fd', flexShrink: 0 }}>
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--a-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--a-mute)', whiteSpace: 'nowrap' }}>{count} <span style={{ opacity: 0.6 }}>{t('reqs')}</span></span>
                </div>
              ))}
            </div>
          )}

          {/* Currently Borrowed mini-list */}
          {borrowed.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px 6px', borderTop: '1px solid var(--a-rule)' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>{t('currentlyOutLabel')}</div>
                <span className="a-pill p-info" style={{ fontSize: 9 }}>{borrowed.length}</span>
              </div>
              {borrowed.slice(0, 3).map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', borderBottom: '1px solid var(--a-rule-2)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--a-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.equipment_name}</div>
                    <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 10, color: 'var(--a-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.borrower_name || r.student_email}</div>
                  </div>
                  <button className="a-btn" style={{ padding: '3px 8px', fontSize: 10, flexShrink: 0 }} onClick={() => navigate('/returns')}>
                    {t('returnBtn')}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
