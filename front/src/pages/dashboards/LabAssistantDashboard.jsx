import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CheckCircle, Package, Clock, History,
  FileText, ArrowUpRight, ArrowRight,
  Sun, Sunset, Moon, BarChart2,
} from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';
import { CATALOG_ROUTES_BY_ROLE } from '@/utils/roleCatalogRoutes';
import { AssistantDashboardSkeleton } from '@/skeleton-framework/assistant';


// ─── helpers ──────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.10)]"
      style={{ borderColor: `${color}55` }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(130% 90% at 0% 0%, ${color}11 0%, transparent 65%)` }}
      />
      <div className="relative flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}14`, boxShadow: `0 0 0 1px ${color}25` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <ArrowUpRight
          className="h-4 w-4 opacity-25 transition-all duration-300 group-hover:opacity-75 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          style={{ color }}
        />
      </div>
      <div className="relative">
        <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-500">{title}</p>
        {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </button>
  );
}

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

  // ── greeting ──
  const getGreetingConfig = () => {
    const h = new Date().getHours();
    if (h < 12) return { greeting: t('goodMorning')    || 'Good morning',    Icon: Sun,    color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' };
    if (h < 18) return { greeting: t('goodAfternoon')  || 'Good afternoon',  Icon: Sunset, color: '#f97316', bg: '#fff7ed', border: '#fed7aa' };
    return         { greeting: t('goodEvening')       || 'Good evening',     Icon: Moon,   color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };
  };
  const gc = getGreetingConfig();

  if (requestsLoading || equipmentLoading) return <AssistantDashboardSkeleton />;

  // ── render ──
  return (
    <div className="w-full space-y-5 px-2 py-3">

      {/* ── Hero Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
            style={{ backgroundColor: gc.bg, borderColor: gc.border }}
          >
            <gc.Icon className="h-6 w-6" style={{ color: gc.color }} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {gc.greeting},{' '}
              <span style={{ color: gc.color }}>
                {user?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Assistant'}
              </span>
            </h1>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title={t('readyForPrep') || 'Ready for Prep'}
          value={readyForPrep.length}
          icon={Package}
          color="#f59e0b"
          sub={t('awaitingPreparation') || 'Awaiting preparation'}
          onClick={() => navigate('/equipment-prep')}
        />
        <StatCard
          title={t('readyForPickup') || 'Ready for Pickup'}
          value={readyForPickup.length}
          icon={CheckCircle}
          color="#2563eb"
          sub={t('preparedAndWaiting') || 'Prepared and waiting'}
          onClick={() => navigate('/equipment-prep')}
        />
        <StatCard
          title={t('currentlyBorrowed') || 'Currently Borrowed'}
          value={borrowed.length}
          icon={Clock}
          color="#22c55e"
          sub={t('activeLoans') || 'Active loans out'}
          onClick={() => navigate('/returns')}
        />
        <StatCard
          title={t('pendingReturns') || 'Pending Returns'}
          value={borrowed.length}
          icon={History}
          color="#8b5cf6"
          sub={t('awaitingReturn') || 'Awaiting return'}
          onClick={() => navigate('/returns')}
        />
      </div>

      {/* ── Equipment Prep Queue (full width) ── */}
      <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader className="px-6 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                {t('equipmentPrepQueue') || 'Equipment Prep Queue'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
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
                <TableRow className="border-slate-100">
                  <TableHead className="pl-6 text-xs font-medium text-slate-500">{t('equipment') || 'Equipment'}</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">{t('student_label') || 'Student'}</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">{t('quantity') || 'Qty'}</TableHead>
                  <TableHead className="pr-6 text-right text-xs font-medium text-slate-500">{t('action') || 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readyForPrep.slice(0, 5).map((request) => (
                  <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50">
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
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
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

      {/* ── Row: Equipment Chart + Activity Summary ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Equipment Overview Table */}
        <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">
              {t('equipmentOverview') || 'Equipment Overview'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              {t('equipmentStatusBreakdown') || 'All equipment and their current availability'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {equipment.length === 0 ? (
              <EmptyState icon={Package} message={t('noEquipment') || 'No equipment found'} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead className="pl-6 text-xs font-medium text-slate-500">{t('equipmentName') || 'Name'}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('category') || 'Category'}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('quantity') || 'Qty'}</TableHead>
                    <TableHead className="pr-6 text-xs font-medium text-slate-500">{t('status') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...equipment].sort((a, b) => new Date(b.createdAt ?? b.created_at ?? 0) - new Date(a.createdAt ?? a.created_at ?? 0)).slice(0, 5).map((item) => (
                    <TableRow key={item._id ?? item.id} className="border-slate-100 hover:bg-slate-50">
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
        <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">
              {t('activitySummary') || 'Activity Summary'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
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
      <Card className="rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader className="px-6 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                {t('equipmentCurrentlyOut') || 'Equipment Currently Out'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
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
                <TableRow className="border-slate-100">
                  <TableHead className="pl-6 text-xs font-medium text-slate-500">{t('equipment') || 'Equipment'}</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">{t('student_label') || 'Student'}</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500">{t('quantity') || 'Qty'}</TableHead>
                  <TableHead className="pr-6 text-right text-xs font-medium text-slate-500">{t('action') || 'Action'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowed.slice(0, 5).map((request) => (
                  <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50">
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
