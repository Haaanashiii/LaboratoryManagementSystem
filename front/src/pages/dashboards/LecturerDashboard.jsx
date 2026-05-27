import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO, isValid } from 'date-fns';
import { api } from '@/api/apiClient';
import {
  Clock, CheckCircle, Package, AlertCircle,
  ChevronRight, BarChart2,
} from 'lucide-react';
import '@/styles/equimon-admin.css';
import { useLang } from '@/components/i18n/LangContext';

function fmtDate(raw) {
  try {
    const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
    return isValid(d) ? format(d, 'EEE, MMM d · HH:mm') : '—';
  } catch { return '—'; }
}

export default function LecturerDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [activityDays, setActivityDays] = React.useState(14);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => api.auth.me() });

  const { data: allRequests = [] } = useQuery({
    queryKey: ['lecturerRequests', user?.email],
    queryFn: () => api.entities.BorrowRequest.filter({ history: 'true' }),
    enabled: !!user?.email,
  });

  const pendingApprovals = React.useMemo(() =>
    allRequests
      .filter(r => r.status === 'pending_lecturer')
      .sort((a, b) => new Date(b.created_at ?? b.createdAt ?? 0) - new Date(a.created_at ?? a.createdAt ?? 0)),
    [allRequests]
  );

  const approvedByMe = React.useMemo(
    () => allRequests.filter(r => r.status !== 'pending_lecturer' && r.status !== 'rejected'),
    [allRequests]
  );

  const rejectedByMe = React.useMemo(
    () => allRequests.filter(r => r.status === 'rejected'),
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
      return { date: format(d, 'MMM d'), label: format(d, 'yyyy-MM-dd'), new: 0, approved: 0, rejected: 0 };
    });
    allRequests.forEach(req => {
      const raw = req.created_at ?? req.createdAt;
      if (!raw) return;
      const parsed = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      if (!isValid(parsed)) return;
      const lbl = format(parsed, 'yyyy-MM-dd');
      const slot = days.find(d => d.label === lbl);
      if (!slot) return;
      if (req.status === 'pending_lecturer') slot.new += 1;
      else if (['pending_head', 'head_approved', 'ready_pickup', 'borrowed', 'returned'].includes(req.status)) slot.approved += 1;
      else if (req.status === 'rejected') slot.rejected += 1;
    });
    return days;
  }, [allRequests, activityDays]);

  const h = new Date().getHours();
  const greetingText = h < 12 ? t('goodMorning') : h < 18 ? t('goodAfternoon') : t('goodEvening');
  const firstName = (user?.full_name || user?.name || 'Lecturer').split(' ')[0];
  const approvalRate = allRequests.length > 0 ? Math.round((approvedByMe.length / allRequests.length) * 100) : 0;
  const rejectionRate = allRequests.length > 0 ? Math.round((rejectedByMe.length / allRequests.length) * 100) : 0;
  const forwardedThisWeek = recentRequests.filter(r => r.status !== 'pending_lecturer' && r.status !== 'rejected').length;

  const kpiCards = [
    { label: t('pendingApprovalsKpiLabel'), value: pendingApprovals.length, sub: `${recentRequests.filter(r => r.status === 'pending_lecturer').length} ${t('newThisWeek')}`, icon: Clock, color: '#2563eb', onClick: () => navigate('/lecturer-approvals') },
    { label: t('approvedByMeKpiLabel'), value: approvedByMe.length, sub: `${approvalRate}${t('approvalRatePct')}`, icon: CheckCircle, color: '#2563eb', onClick: () => navigate('/lecturer-approval-history') },
    { label: t('totalRequestsKpiLabel'), value: allRequests.length, sub: `${recentRequests.length} ${t('inLast7Days')}`, icon: Package, color: '#7c3aed', onClick: () => navigate('/lecturer-approval-history') },
    { label: t('rejectedKpiLabel'), value: rejectedByMe.length, sub: `${rejectionRate}${t('rejectionRatePct')}`, icon: AlertCircle, color: '#ef4444', onClick: () => navigate('/lecturer-approval-history') },
  ];

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Greeting Strip ── */}
      <div className="a-titlestrip">
        <div>
          <div className="a-eyebrow">{t('lecturerDashEyebrow')}</div>
          <h1 style={{ margin: '4px 0 6px', fontSize: 26 }}>
            {greetingText}, <span style={{ color: '#3b82f6' }}>{firstName}</span>
          </h1>
          <div className="a-deck">{format(new Date(), 'EEEE, MMMM d, yyyy')} · {t('labDeckText')}</div>
        </div>
        <div className="a-right">
          <div style={{ border: '1px solid var(--a-rule)', padding: '10px 18px', background: 'var(--a-surface)', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>{t('approvalRateLabel')}</div>
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
            <h2>{t('todaysActionItems')}</h2>
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)' }}>{t('sortedByPriority')}</span>
          </div>
          {pendingApprovals.slice(0, 3).map((r, i) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderBottom: '1px solid var(--a-rule-2)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock style={{ width: 16, height: 16, color: '#2563eb' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: 'var(--a-ink)' }}>{t('pendingApprovalActionLabel')}</span>
                  {i === 0 && <span className="a-pill p-warn" style={{ fontSize: 9, padding: '2px 7px', letterSpacing: '0.08em' }}>{t('urgent')}</span>}
                </div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.equipment_name} ×{r.quantity} — {r.borrower_name || r.student_name || r.student_email} · {t('submitted')} {fmtDate(r.created_at ?? r.createdAt)}
                </div>
              </div>
              <button className="a-btn primary" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('/lecturer-approvals')}>
                {t('reviewBtn')} <ChevronRight style={{ width: 12, height: 12 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Pending Approvals Table ── */}
      <div className="a-panel">
        <div className="p-head">
          <h2>{t('pendingApprovals')}</h2>
          <span className="count">{pendingApprovals.length}</span>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)' }}>{t('mostRecentAwaitingDecision')}</span>
          <div className="spacer" />
          {pendingApprovals.length > 0 && (
            <button className="a-btn" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('/lecturer-approvals')}>
              {t('reviewAll')} <ChevronRight style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
        {pendingApprovals.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 8 }}>
            <CheckCircle style={{ width: 28, height: 28, color: 'var(--a-ok)', opacity: 0.5 }} />
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0 }}>{t('allCaughtUpNoPending')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="a-table">
              <thead>
                <tr>
                  <th>{t('equipment')}</th>
                  <th>{t('student')}</th>
                  <th className="num">{t('qty')}</th>
                  <th>{t('submitted')}</th>
                  <th>{t('action')}</th>
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
                      <button className="a-btn primary" style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                        onClick={() => navigate('/lecturer-approvals')}>
                        {t('reviewBtn')} <ChevronRight style={{ width: 11, height: 11 }} />
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

        {/* Approval Activity Chart */}
        <div className="a-panel" style={{ marginBottom: 0 }}>
          <div className="p-head">
            <h2>{t('approvalsThisWeek')}</h2>
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
              <span style={{ fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 700, color: 'var(--a-navy)', lineHeight: 1 }}>{forwardedThisWeek}</span>
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--a-mute)' }}>{t('forwardedLabel')}</span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--a-mute)', textTransform: 'uppercase', marginBottom: 16 }}>
              Last {activityDays} {t('daysLabel')}
            </div>
            {activityChartData.every(d => d.new === 0 && d.approved === 0 && d.rejected === 0) ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 8 }}>
                <BarChart2 style={{ width: 28, height: 28, color: 'var(--a-mute-2)', opacity: 0.5 }} />
                <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', margin: 0 }}>{t('noActivityData')}</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={activityChartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--a-rule-2)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--a-mute)', fontFamily: 'var(--mono)' }} axisLine={false} tickLine={false} interval={activityDays >= 14 ? 2 : 0} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--a-mute)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, border: '1px solid var(--a-rule)', background: '#fff', borderRadius: 0, fontFamily: 'var(--sans)' }} />
                    <Area type="monotone" dataKey="rejected" name="Rejected" stackId="a" stroke="#ef4444" strokeWidth={1.5} fill="#ef4444" fillOpacity={0.12} dot={false} />
                    <Area type="monotone" dataKey="approved" name="Approved" stackId="a" stroke="var(--a-ok)" strokeWidth={1.5} fill="var(--a-ok)" fillOpacity={0.15} dot={false} />
                    <Area type="monotone" dataKey="new" name="Pending" stackId="a" stroke="#2563eb" strokeWidth={1.5} fill="#2563eb" fillOpacity={0.2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                  {[
                    { labelKey: 'pending',          color: '#2563eb' },
                    { labelKey: 'approvedStatLabel', color: 'var(--a-ok)' },
                    { labelKey: 'rejected',         color: '#ef4444' },
                  ].map(({ labelKey, color }) => (
                    <div key={labelKey} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--a-mute)' }}>{t(labelKey)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
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
                  <div style={{ width: 28, height: 28, background: 'var(--a-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--a-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--a-mute)', whiteSpace: 'nowrap' }}>{count} <span style={{ opacity: 0.6 }}>{t('reqs')}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
