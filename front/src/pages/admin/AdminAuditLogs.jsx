import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useLang } from '@/components/i18n/LangContext';

const ACTION_OPTIONS = [
  'all',
  'login_success',
  'login_failed',
  'borrow_created',
  'borrow_released',
  'borrow_returned',
  'damage_verified'
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
  const [filters, setFilters] = useState({
    user: '',
    action_type: 'all',
    start_date: '',
    end_date: ''
  });

  const queryFilters = useMemo(() => {
    const next = {};
    if (filters.user.trim()) next.user = filters.user.trim();
    if (filters.action_type !== 'all') next.action_type = filters.action_type;
    if (filters.start_date) next.start_date = filters.start_date;
    if (filters.end_date) next.end_date = filters.end_date;
    next.limit = 100;
    return next;
  }, [filters]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminAuditLogs', queryFilters],
    queryFn: () => api.entities.AuditLogs.list(queryFilters),
  });

  const logs = data?.data || [];

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
    <div className="max-w-7xl mx-auto space-y-4 py-4 px-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('adminAuditLogsTitle')}</h1>
        <p className="text-sm text-slate-600 mt-1">{t('adminAuditLogsDesc')}</p>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <span className="font-semibold">{t('important')}</span> {t('auditRetentionNotice')}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleExportPdf}
          disabled={isExporting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-70"
        >
          {isExporting ? t('exporting') : t('exportPdf')}
        </Button>
        <Button
          onClick={() => refetch()}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {t('refreshLogs')}
        </Button>
      </div>

      <Card className="border-slate-200 shadow-none">
        <CardContent className="p-4">
          <div className="w-full flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Input
                placeholder={t('filterByUserEmailOrId')}
                value={filters.user}
                onChange={(event) => setFilters((prev) => ({ ...prev, user: event.target.value }))}
                className="w-full md:w-[320px]"
              />

              <Select value={filters.action_type} onValueChange={(value) => setFilters((prev) => ({ ...prev, action_type: value }))}>
                <SelectTrigger className="w-full md:w-[260px]">
                  <SelectValue placeholder={t('actionType')} />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((action) => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="w-full md:w-[240px]">
                <Input
                  type="date"
                  value={filters.start_date}
                  onChange={(event) => setFilters((prev) => ({ ...prev, start_date: event.target.value }))}
                  className="w-full"
                />
              </div>

              <div className="w-full md:w-[240px]">
                <Input
                  type="date"
                  value={filters.end_date}
                  onChange={(event) => setFilters((prev) => ({ ...prev, end_date: event.target.value }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-none">
        <CardContent className="p-0">
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">{t('timestamp')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('user')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('action')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('status')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('entity')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('ipAddress')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('details')}</th>
              </tr>
              </thead>
              <tbody>
              {isLoading && (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>{t('loadingLogs')}</td>
                </tr>
              )}

              {!isLoading && logs.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>{t('noLogsFoundForFilters')}</td>
                </tr>
              )}

              {!isLoading && logs.map((log) => (
                <tr key={log._id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{log.user?.email || log.user_email || '-'}</td>
                  <td className="px-4 py-3">{log.action_type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                      log.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.entity_type}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{normalizeIpForDisplay(log.ip_address)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
