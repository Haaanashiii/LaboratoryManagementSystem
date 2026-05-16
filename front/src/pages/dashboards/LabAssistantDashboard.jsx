import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CheckCircle, Package, Clock, History,
  FileText, ArrowRight,
  Sun, Sunset, Moon, BarChart2,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';
import { AssistantDashboardSkeleton } from '@/skeleton-framework/assistant';
import EquimonStatCard from '@/components/ui/equimon/EquimonStatCard';
import EquimonGreetingHeader from '@/components/ui/equimon/EquimonGreetingHeader';
import EquimonActionPanel from '@/components/ui/equimon/EquimonActionPanel';


// ─── helpers ──────────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon = BarChart2, message, sub }) {
  return (
    <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-slate-400">
      <Icon className="h-8 w-8 opacity-30" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function LabAssistantDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();
  const catalogRoute = CATALOG_ROUTES_BY_ROLE.lab_assistant;

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: allRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list(),
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  // ── derived data ──
  const readyForPrep   = allRequests.filter(r => r.status === 'head_approved');
  const readyForPickup = allRequests.filter(r => r.status === 'ready_pickup');
  const borrowed       = allRequests.filter(r => r.status === 'borrowed');

  const CATEGORY_COLORS = ['#f97316', '#3b82f6', '#ef4444', '#8b5cf6', '#22c55e', '#f59e0b', '#06b6d4'];

  const equipmentByCategory = React.useMemo(() => {
    const map = {};
    equipment.forEach((item) => {
      const cat = item.category || 'Other';
      const qty = Number(item.quantity ?? item.total_quantity ?? 1);
      map[cat] = (map[cat] || 0) + qty;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [equipment]);

  const totalUnits = equipmentByCategory.reduce((s, c) => s + c.value, 0);

  const availableCount    = equipment.filter(e => e.status === 'available'    || !e.status).length;
  const maintenanceCount  = equipment.filter(e => e.status === 'maintenance').length;
  const outCount          = equipment.length - availableCount - maintenanceCount;

  if (requestsLoading || equipmentLoading) return <AssistantDashboardSkeleton />;

  // ── greeting ──
  const h = new Date().getHours();
  const greetingText = h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
  const greetingIcon = h < 12 ? Sun : h < 18 ? Sunset : Moon;

  // ── action panel items ──
  const actionItems = [
    ...readyForPrep.slice(0, 2).map(r => ({
      icon: Package, color: '#f59e0b',
      title: 'Prepare equipment',
      desc: `${r.equipment_name} ×${r.quantity} — ${r.borrower_name || r.student_email}`,
      onClick: () => navigate('/equipment-prep'),
    })),
    ...borrowed.slice(0, 2).map(r => ({
      icon: History, color: '#7c3aed',
      title: 'Awaiting return',
      desc: `${r.equipment_name} — ${r.borrower_name || r.student_email}`,
      onClick: () => navigate('/returns'),
    })),
  ];

  // ── render ──
  return (
    <div className="w-full space-y-5 px-2 py-3">

      {/* ── Hero Banner → EquimonGreetingHeader ── */}
      <EquimonGreetingHeader
        accent="#0d9488"
        name={user?.full_name || user?.name || 'Assistant'}
        greeting={greetingText}
        icon={greetingIcon}
      />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <EquimonStatCard
          tint="#f0fdfa"
          fg="#0d9488"
          icon={Package}
          label="Ready for Prep"
          value={readyForPrep.length}
          sub="Awaiting preparation"
          onClick={() => navigate('/equipment-prep')}
        />
        <EquimonStatCard
          tint="#eff6ff"
          fg="#2563eb"
          icon={CheckCircle}
          label="Ready for Pickup"
          value={readyForPickup.length}
          sub="Prepared and waiting"
          onClick={() => navigate('/equipment-prep')}
        />
        <EquimonStatCard
          tint="#ecfdf5"
          fg="#059669"
          icon={Clock}
          label="Currently Borrowed"
          value={borrowed.length}
          sub="Active loans out"
          onClick={() => navigate('/returns')}
        />
        <EquimonStatCard
          tint="#faf5ff"
          fg="#7c3aed"
          icon={History}
          label="Pending Returns"
          value={borrowed.length}
          sub="Awaiting return"
          onClick={() => navigate('/returns')}
        />
      </div>

      {/* ── Action Panel + Equipment Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EquimonActionPanel accent="#0d9488" items={actionItems} />

        {/* Equipment Status Donut */}
        <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-[16px] font-extrabold text-slate-900">Equipment Status</CardTitle>
            <CardDescription className="text-[12px] text-slate-500">Inventory across all categories</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="flex items-center gap-6">
              {/* Donut */}
              <div className="relative shrink-0">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={equipmentByCategory.length ? equipmentByCategory : [{ name: 'No data', value: 1 }]}
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
                      contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[26px] font-extrabold text-slate-900 leading-none">{totalUnits}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-1">Total</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 min-w-0 space-y-2">
                {equipmentByCategory.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="text-[12px] text-slate-700 truncate">{cat.name}</span>
                    </div>
                    <span className="text-[12px] font-bold text-slate-900 tabular-nums">{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Available / Out / Maint footer */}
            <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 pt-4">
              {[
                { label: 'AVAILABLE', value: availableCount,   color: '#22c55e' },
                { label: 'OUT',       value: outCount,         color: '#0d9488' },
                { label: 'MAINT',     value: maintenanceCount, color: '#94a3b8' },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-0.5">
                  <span className="text-[24px] font-extrabold" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-[10px] font-bold tracking-widest text-slate-400">{s.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Equipment Prep Queue (full width) ── */}
      <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        <CardHeader className="px-6 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[16px] font-extrabold text-slate-900">
                {t('equipmentPrepQueue') || 'Equipment Prep Queue'}
              </CardTitle>
              <CardDescription className="text-[12px] text-slate-500">
                {t('prepQueueDesc') || 'Items approved by head of lab — prepare for pickup'}
              </CardDescription>
            </div>
            {readyForPrep.length > 0 && (
              <button
                onClick={() => navigate('/equipment-prep')}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                {t('viewAll') || 'View all'} <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {readyForPrep.length === 0 ? (
            <EmptyState
              icon={Package}
              message={t('noPrepQueue') || 'No items in prep queue'}
              sub={t('noPrepQueueDesc') || 'All approved requests have been prepared'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="pl-6 text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('equipment') || 'Equipment'}</TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('student_label') || 'Student'}</TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('quantity') || 'Qty'}</TableHead>
                  <TableHead className="pr-6 text-right text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('action') || 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readyForPrep.slice(0, 5).map((request) => (
                  <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50/60">
                    <TableCell className="pl-6 text-xs font-semibold text-slate-800">
                      {request.equipment_name}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-slate-500">
                      {request.student_email}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{request.quantity}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <button
                        onClick={() => navigate('/equipment-prep')}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                      >
                        {t('prepare') || 'Prepare'}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Row: Equipment Overview + Activity Summary ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Equipment Overview Table */}
        <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-[16px] font-extrabold text-slate-900">
              {t('equipmentOverview') || 'Equipment Overview'}
            </CardTitle>
            <CardDescription className="text-[12px] text-slate-500 mt-0.5">
              {t('equipmentStatusBreakdown') || 'All equipment and their current availability'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {equipment.length === 0 ? (
              <EmptyState icon={Package} message={t('noEquipment') || 'No equipment found'} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="pl-6 text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('equipmentName') || 'Name'}</TableHead>
                    <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('category') || 'Category'}</TableHead>
                    <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('quantity') || 'Qty'}</TableHead>
                    <TableHead className="pr-6 text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('status') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...equipment].sort((a, b) => new Date(b.createdAt ?? b.created_at ?? 0) - new Date(a.createdAt ?? a.created_at ?? 0)).slice(0, 5).map((item) => (
                    <TableRow key={item._id ?? item.id} className="border-slate-100 hover:bg-slate-50/60">
                      <TableCell className="pl-6 text-xs font-semibold text-slate-800">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{item.category || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{item.quantity ?? item.total_quantity ?? '—'}</TableCell>
                      <TableCell className="pr-6">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            item.status === 'available'
                              ? 'bg-green-100 text-green-700'
                              : item.status === 'maintenance'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.status ?? 'available'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-[16px] font-extrabold text-slate-900">
              {t('activitySummary') || 'Activity Summary'}
            </CardTitle>
            <CardDescription className="text-[12px] text-slate-500">
              {t('currentStatusSnapshot') || 'Current status snapshot'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: t('readyForPrep')     || 'Ready for Prep',     sub: t('awaitingPrep')     || 'Awaiting prep',     value: readyForPrep.length,   color: '#f59e0b', icon: Package    },
                { label: t('readyForPickup')    || 'Ready for Pickup',   sub: t('preparedItems')    || 'Prepared items',    value: readyForPickup.length, color: '#2563eb', icon: CheckCircle },
                { label: t('currentlyBorrowed') || 'Currently Borrowed', sub: t('outOfLab')         || 'Out of lab',        value: borrowed.length,       color: '#22c55e', icon: Clock      },
                { label: t('totalEquipment')    || 'Total Equipment',    sub: t('inInventory')      || 'In inventory',      value: equipment.length,      color: '#8b5cf6', icon: FileText   },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold tabular-nums text-slate-900">{item.value}</p>
                    <p className="text-xs font-semibold text-slate-600 mt-1">{item.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Equipment Currently Out ── */}
      <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        <CardHeader className="px-6 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[16px] font-extrabold text-slate-900">
                {t('equipmentCurrentlyOut') || 'Equipment Currently Out'}
              </CardTitle>
              <CardDescription className="text-[12px] text-slate-500">
                {t('borrowedItemsDesc') || 'Items currently borrowed — pending return'}
              </CardDescription>
            </div>
            {borrowed.length > 0 && (
              <button
                onClick={() => navigate('/returns')}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                {t('viewAll') || 'View all'} <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {borrowed.length === 0 ? (
            <EmptyState
              icon={FileText}
              message={t('noBorrowed') || 'No equipment currently borrowed'}
              sub={t('noBorrowedDesc') || 'All items have been returned'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="pl-6 text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('equipment') || 'Equipment'}</TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('student_label') || 'Student'}</TableHead>
                  <TableHead className="text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('quantity') || 'Qty'}</TableHead>
                  <TableHead className="pr-6 text-right text-[11px] font-bold tracking-[1.2px] uppercase text-slate-500">{t('action') || 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowed.slice(0, 5).map((request) => (
                  <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50/60">
                    <TableCell className="pl-6 text-xs font-semibold text-slate-800">
                      {request.equipment_name}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-slate-500">
                      {request.student_email}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{request.quantity}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <button
                        onClick={() => navigate('/returns')}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                      >
                        {t('processReturn') || 'Return'}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
