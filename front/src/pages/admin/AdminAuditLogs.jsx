import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search, RefreshCw, Download, ClipboardList,
  LogIn, ShieldAlert, PackagePlus, PackageCheck, RotateCcw, AlertTriangle, LayoutList,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { useLang } from '@/components/i18n/LangContext';

const PAGE_SIZE = 15;

const ACTION_CONFIG = [
  { value: 'all',            label: 'All Logs',       color: 'bg-slate-50 text-slate-700 border-slate-200',      dot: '#64748b', icon: LayoutList },
  { value: 'login_success',  label: 'Login Success',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#22c55e', icon: LogIn },
  { value: 'login_failed',   label: 'Login Failed',   color: 'bg-red-50 text-red-700 border-red-200',             dot: '#ef4444', icon: ShieldAlert },
  { value: 'borrow_created', label: 'Borrow Created', color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: '#3b82f6', icon: PackagePlus },
  { value: 'borrow_released',label: 'Released',       color: 'bg-violet-50 text-violet-700 border-violet-200',    dot: '#8b5cf6', icon: PackageCheck },
  { value: 'borrow_returned',label: 'Returned',       color: 'bg-cyan-50 text-cyan-700 border-cyan-200',          dot: '#06b6d4', icon: RotateCcw },
  { value: 'damage_verified',label: 'Damage Verified',color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: '#f59e0b', icon: AlertTriangle },
];

const normalizeIpForDisplay = (value) => {
  if (!value) return '-';
  const ip = String(value).trim();
  if (!ip) return '-';
  if (ip === '::1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
};

export default function AdminAuditLogs() {
  const { t } = useLang();
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [activeAction, setActiveAction] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const queryFilters = useMemo(() => {
    const next = {};
    if (search.trim()) next.user = search.trim();
    if (startDate) next.start_date = startDate;
    if (endDate) next.end_date = endDate;
    next.limit = 1000;
    return next;
  }, [search, startDate, endDate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminAuditLogs', queryFilters],
    queryFn: () => api.entities.AuditLogs.list(queryFilters),
  });

  const allLogs = data?.data || [];

  const logsByAction = useMemo(() =>
    ACTION_CONFIG.reduce((acc, cfg) => {
      acc[cfg.value] = cfg.value === 'all'
        ? allLogs
        : allLogs.filter((l) => l.action_type === cfg.value);
      return acc;
    }, {}),
  [allLogs]);

  const displayedLogs = logsByAction[activeAction] || allLogs;
  const totalPages = Math.max(1, Math.ceil(displayedLogs.length / PAGE_SIZE));
  const paginatedLogs = displayedLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeConfig = ACTION_CONFIG.find((c) => c.value === activeAction) || ACTION_CONFIG[0];

  const handleActionChange = (value) => {
    setActiveAction(value);
    setCurrentPage(1);
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const exportFilters = { ...queryFilters, limit: 5000 };
      const blob = await api.entities.AuditLogs.exportPdf(exportFilters);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'audit_logs.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || t('failedExportAuditPdf'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{t('adminAuditLogsTitle')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{allLogs.length} {t('adminAuditLogsDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('refreshLogs')}
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-emerald-600 text-xs hover:bg-emerald-700 disabled:opacity-70"
            onClick={handleExportPdf}
            disabled={isExporting}
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? t('exporting') : t('exportPdf')}
          </Button>
        </div>
      </div>

      {/* ── Action type stat cards ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {ACTION_CONFIG.map((cfg) => {
          const count = logsByAction[cfg.value]?.length || 0;
          const isActive = activeAction === cfg.value;
          const CfgIcon = cfg.icon;
          return (
            <button
              key={cfg.value}
              type="button"
              onClick={() => handleActionChange(cfg.value)}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? `${cfg.color} shadow-sm`
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`rounded-lg p-1.5 ${isActive ? 'bg-white/60' : 'bg-slate-100'}`}>
                <CfgIcon className="h-4 w-4" style={isActive ? { color: cfg.dot } : { color: '#64748b' }} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-slate-500">{cfg.label}</p>
                <p className="text-lg font-semibold leading-tight text-slate-900">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Search + Table Card ── */}
      <Card className="overflow-hidden border-slate-200 shadow-none">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {activeAction !== 'all' && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeConfig.dot }} />
            )}
            <p className="text-sm font-medium text-slate-800">{activeConfig.label}</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {displayedLogs.length}
            </span>
            {activeAction !== 'all' && (
              <button
                onClick={() => handleActionChange('all')}
                className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              >
                {t('clear')}
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t('filterByUserEmailOrId')}
                value={search}
                onChange={(e) => { setCurrentPage(1); setSearch(e.target.value); }}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setCurrentPage(1); setStartDate(e.target.value); }}
              className="h-8 w-full text-xs sm:w-36"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setCurrentPage(1); setEndDate(e.target.value); }}
              className="h-8 w-full text-xs sm:w-36"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <BanterLoader />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="text-xs font-medium text-slate-500">{t('timestamp')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('user')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('action')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('status')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('entity')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('ipAddress')}</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">{t('details')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <ClipboardList className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">{t('noLogsFoundForFilters')}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log) => {
                      const actionCfg = ACTION_CONFIG.find((c) => c.value === log.action_type);
                      return (
                        <TableRow key={log._id} className="border-slate-50 hover:bg-slate-50/50 align-top">
                          <TableCell className="whitespace-nowrap text-xs">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {log.user?.email || log.user_email || '-'}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                              actionCfg ? actionCfg.color : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {actionCfg && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: actionCfg.dot }} />}
                              {log.action_type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                              log.status === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {log.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{log.entity_type || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-slate-500">{normalizeIpForDisplay(log.ip_address)}</TableCell>
                          <TableCell className="max-w-xs truncate text-xs text-slate-500">
                            {log.details ? JSON.stringify(log.details) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, displayedLogs.length)} of {displayedLogs.length} logs
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="icon"
                        className={`h-7 w-7 text-xs ${currentPage === page ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
