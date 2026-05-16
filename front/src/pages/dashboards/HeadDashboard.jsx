import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { api } from '@/api/apiClient';
import {
  Clock, CheckCircle, Package, BarChart3,
  ChevronRight, BarChart2,
} from 'lucide-react';
import { HeadDashboardSkeleton } from '@/skeleton-framework/head of lab';
import '@/styles/equimon-admin.css';

function fmtDate(raw) {
  try {
    const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
    return isValid(d) ? format(d, 'EEE, MMM d · HH:mm') : '—';
  } catch { return '—'; }
}

export default function HeadDashboard() {
  const navigate = useNavigate();
  const [activityDays, setActivityDays] = React.useState(14);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => api.auth.me() });

  const { data: allRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list(),
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  const pendingApprovals = React.useMemo(() =>
    allRequests
      .filter(r => r.status === 'pending_head')
      .sort((a, b) => new Date(b.created_at ?? b.createdAt ?? 0) - new Date(a.created_at ?? a.createdAt ?? 0)),
    [allRequests]
  );

  const approvedRequests = React.useMemo(
    () => allRequests.filter(r => ['head_approved', 'ready_pickup', 'borrowed', 'returned'].includes(r.status)),
    [allRequests]
  );

  const recentRequests = React.useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return allRequests.filter(r => {
      const raw = r.created_at ?? r.createdAt;
      if (!raw) return false;
      const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      return isValid(d) && d >= cutoff;
    });
  }, [allRequests]);

  const topBorrowers = React.useMemo(() => {
    const counts = {};
    allRequests.forEach(r => {
      const name = r.borrower_name || r.student_name || r.student_email?.split('@')[0] || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [allRequests]);

  const activityChartData = React.useMemo(() => {
    const days = Array.from({ length: activityDays }, (_, i) => {
      const d = subDays(new Date(), activityDays - 1 - i);
      return { date: format(d, 'MMM d'), label: format(d, 'yyyy-MM-dd'), pending: 0, approved: 0, borrowed: 0, returned: 0 };
    });
    allRequests.forEach(req => {
      const raw = req.created_at ?? req.createdAt;
      if (!raw) return;
      const parsed = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      if (!isValid(parsed)) return;
      const lbl = format(parsed, 'yyyy-MM-dd');
      const slot = days.find(d => d.label === lbl);
      if (!slot) return;
      if (req.status === 'pending_head') slot.pending += 1;
      else if (['head_approved', 'ready_pickup'].includes(req.status)) slot.approved += 1;
      else if (req.status === 'borrowed') slot.borrowed += 1;
      else if (req.status === 'returned') slot.returned += 1;
    });
    return days;
  }, [allRequests, activityDays]);

  const totalEquipment = equipment.length;
  const availableEquipment = equipment.filter(e => (e.available_quantity ?? e.available ?? 0) > 0).length;
  const approvalRate = allRequests.length > 0 ? Math.round((approvedRequests.length / allRequests.length) * 100) : 0;
  const approvedThisWeek = recentRequests.filter(r => ['head_approved', 'ready_pickup', 'borrowed', 'returned'].includes(r.status)).length;

  const h = new Date().getHours();
  const greetingText = h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
  const firstName = (user?.full_name || user?.name || 'Head of Lab').split(' ')[0];

  const kpiCards = [
    { label: 'PENDING FINAL APPROVAL', value: pendingApprovals.length, sub: `${recentRequests.filter(r => r.status === 'pending_head').length} new this week`, icon: Clock, color: '#f59e0b', onClick: () => navigate('/head-approvals') },
    { label: 'APPROVED REQUESTS', value: approvedRequests.length, sub: `${approvalRate}% approval rate`, icon: CheckCircle, color: '#22c55e', onClick: () => navigate('/head-approval-history') },
    { label: 'TOTAL EQUIPMENT', value: totalEquipment, sub: `${availableEquipment} currently available`, icon: Package, color: '#2563eb', onClick: () => navigate('/inventory') },
    { label: 'AVAILABLE NOW', value: availableEquipment, sub: `${totalEquipment - availableEquipment} in use`, icon: BarChart3, color: '#7c3aed', onClick: () => navigate('/inventory') },
  ];

  if (requestsLoading || equipmentLoading) return <HeadDashboardSkeleton />;

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Greeting Strip ── */}
      <div className="a-titlestrip">
        <div>
          <div className="a-eyebrow">Head of Lab · Dashboard</div>
          <h1 style={{ margin: '4px 0 6px', fontSize: 26 }}>
            {greetingText}, <span style={{ color: 'var(--a-gold)' }}>{firstName}</span>
          </h1>
          <div className="a-deck">{format(new Date(), 'EEEE, MMMM d, yyyy')} · here's what's happening across the lab today.</div>
        </div>
        <div className="a-right">
          <div style={{ border: '1px solid var(--a-rule)', padding: '10px 18px', background: 'var(--a-surface)', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>Approval Rate</div>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 24, color: 'var(--a-navy)', lineHeight: 1.1, marginTop: 2 }}>{approvalRate}%</div>
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
      {pendingApprovals.length > 0 && (
        <div className="a-panel" style={{ marginBottom: 0 }}>
          <div className="p-head">
            <h2>Today's Action Items</h2>
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)' }}>Sorted by priority — handle these first.</span>
          </div>
          {pendingApprovals.slice(0, 3).map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderBottom: '1px solid var(--a-rule-2)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock style={{ width: 16, height: 16, color: '#f59e0b' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: 'var(--a-ink)' }}>Awaiting final approval</span>
                  {i === 0 && <span className="a-pill p-warn" style={{ fontSize: 9, padding: '2px 7px', letterSpacing: '0.08em' }}>URGENT</span>}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.equipment_name} ×{r.quantity} — {r.borrower_name || r.student_name || r.student_email} · submitted {fmtDate(r.created_at ?? r.createdAt)}
                </div>
              </div>
              <button className="a-btn gold" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('/head-approvals')}>
                REVIEW <ChevronRight style={{ width: 12, height: 12 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Pending Approvals Table ── */}
      <div className="a-panel">
        <div className="p-head">
          <h2>Requests Awaiting Final Approval</h2>
          <span className="count">{pendingApprovals.length}</span>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)' }}>5 most recent awaiting your decision</span>
          <div className="spacer" />
          {pendingApprovals.length > 0 && (
            <button className="a-btn" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('/head-approvals')}>
              REVIEW ALL <ChevronRight style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
        {pendingApprovals.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 8 }}>
            <CheckCircle style={{ width: 28, height: 28, color: 'var(--a-ok)', opacity: 0.5 }} />
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0 }}>All caught up — no pending approvals.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="a-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Student</th>
                  <th className="num">Qty</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.slice(0, 5).map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="primary">{r.equipment_name}</div>
                      {r.category && <div className="muted" style={{ fontSize: 11 }}>{r.category}</div>}
                    </td>
                    <td className="muted">{r.borrower_name || r.student_name || r.student_email}</td>
                    <td className="num">×{r.quantity}</td>
                    <td className="muted" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(r.created_at ?? r.createdAt)}</td>
                    <td>
                      <button className="a-btn gold" style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                        onClick={() => navigate('/head-approvals')}>
                        REVIEW <ChevronRight style={{ width: 11, height: 11 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bottom: Chart + Top Borrowers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* Request Activity Chart */}
        <div className="a-panel" style={{ marginBottom: 0 }}>
          <div className="p-head">
            <h2>Requests This Week</h2>
            <div className="spacer" />
            <div style={{ display: 'flex', gap: 2, border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', padding: 2 }}>
              {[7, 14, 30].map(d => (
                <button key={d} onClick={() => setActivityDays(d)}
                  className={`a-btn${activityDays === d ? ' primary' : ''}`}
                  style={{ padding: '3px 10px', fontSize: 10 }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px 20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 700, color: 'var(--a-navy)', lineHeight: 1 }}>{approvedThisWeek}</span>
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--a-mute)' }}>Approved</span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--a-mute)', textTransform: 'uppercase', marginBottom: 16 }}>
              Last {activityDays} days
            </div>
            {activityChartData.every(d => d.pending === 0 && d.approved === 0 && d.borrowed === 0 && d.returned === 0) ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 8 }}>
                <BarChart2 style={{ width: 28, height: 28, color: 'var(--a-mute-2)', opacity: 0.5 }} />
                <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', margin: 0 }}>No activity data</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={activityChartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--a-rule-2)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--a-mute)', fontFamily: 'var(--mono)' }} axisLine={false} tickLine={false} interval={activityDays >= 14 ? 2 : 0} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--a-mute)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, border: '1px solid var(--a-rule)', background: '#fff', borderRadius: 0, fontFamily: 'var(--sans)' }} />
                    <Area type="monotone" dataKey="returned" name="Returned" stackId="a" stroke="#94a3b8" strokeWidth={1.5} fill="#94a3b8" fillOpacity={0.12} dot={false} />
                    <Area type="monotone" dataKey="borrowed" name="Borrowed" stackId="a" stroke="var(--a-ok)" strokeWidth={1.5} fill="var(--a-ok)" fillOpacity={0.15} dot={false} />
                    <Area type="monotone" dataKey="approved" name="Approved" stackId="a" stroke="#2563eb" strokeWidth={1.5} fill="#2563eb" fillOpacity={0.18} dot={false} />
                    <Area type="monotone" dataKey="pending" name="Pending" stackId="a" stroke="var(--a-gold)" strokeWidth={1.5} fill="var(--a-gold)" fillOpacity={0.2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                  {[{ label: 'Pending', color: 'var(--a-gold)' }, { label: 'Approved', color: '#2563eb' }, { label: 'Borrowed', color: 'var(--a-ok)' }, { label: 'Returned', color: '#94a3b8' }].map(({ label, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--a-mute)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Borrowers */}
        <div className="a-panel" style={{ marginBottom: 0 }}>
          <div className="p-head"><h2>Top Borrowers</h2></div>
          {topBorrowers.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', margin: 0 }}>No request data yet</p>
            </div>
          ) : (
            <div>
              {topBorrowers.map(({ name, count }, i) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--a-rule-2)' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: i === 0 ? 'var(--a-gold)' : 'var(--a-mute)', width: 14, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ width: 28, height: 28, background: 'var(--a-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: 'var(--a-gold)', flexShrink: 0 }}>
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--a-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--a-mute)', whiteSpace: 'nowrap' }}>{count} <span style={{ opacity: 0.6 }}>REQS</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
