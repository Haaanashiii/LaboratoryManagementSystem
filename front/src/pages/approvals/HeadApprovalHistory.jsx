import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Search, History, CheckCircle, XCircle } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format } from 'date-fns';

const STATUS_FILTERS = [
  { key: 'all',      label: 'All',      statuses: null },
  { key: 'approved', label: 'Approved', statuses: ['head_approved', 'ready_pickup', 'borrowed', 'returned'] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected'] },
];

export default function HeadApprovalHistory() {
  const { t } = useLang();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const STATUS_FILTERS = [
    { key: 'all',      label: t('allRequests'), statuses: null },
    { key: 'approved', label: t('approved'), statuses: ['head_approved', 'ready_pickup', 'borrowed', 'returned'] },
    { key: 'rejected', label: t('rejected'), statuses: ['rejected'] },
  ];

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  // Fetch all requests — backend returns unfiltered list for head_of_lab role.
  // Filter client-side to only show requests this head personally acted on.
  const { data: allRequests = [], isLoading, isError, error } = useQuery({
    queryKey: ['headApprovalHistory'],
    queryFn: () => api.entities.BorrowRequest.list(),
    enabled: !!user,
  });

  // Requests the head has personally acted on (head_approved_at is set)
  const myActedRequests = allRequests.filter(r => !!r.head_approved_at);

  const activeFilter = STATUS_FILTERS.find(f => f.key === statusFilter) ?? STATUS_FILTERS[0];

  const filteredRequests = myActedRequests
    .filter(r => !activeFilter.statuses || activeFilter.statuses.includes(r.status))
    .filter(r =>
      r.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.borrower_name?.toLowerCase().includes(search.toLowerCase())
    );

  const approvedCount = myActedRequests.filter(r =>
    APPROVED_STATUSES.includes(r.status)
  ).length;
  const rejectedCount = myActedRequests.filter(r => r.status === 'rejected').length;

  // Line chart: group by week-start, count approved vs rejected
  const activityChartData = useMemo(() => {
    const buckets = {};
    myActedRequests.forEach((r) => {
      if (!r.head_approved_at) return;
      const weekKey = format(startOfWeek(parseISO(r.head_approved_at), { weekStartsOn: 1 }), 'MMM d');
      if (!buckets[weekKey]) buckets[weekKey] = { week: weekKey, approved: 0, rejected: 0 };
      if (APPROVED_STATUSES.includes(r.status)) buckets[weekKey].approved += 1;
      else if (r.status === 'rejected') buckets[weekKey].rejected += 1;
    });
    return Object.values(buckets).sort((a, b) => new Date(a.week) - new Date(b.week));
  }, [myActedRequests]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 relative">
        <BanterLoader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto space-y-5 py-4 px-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('approvalHistory')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('approvalHistoryDesc')}</p>
        </div>
        <hr className="border-slate-200" />
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <History className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm font-medium text-slate-900">{t('unableLoadHistory')}</p>
            <p className="text-xs text-slate-500 max-w-sm">
              {error?.message || t('failedConnectServer')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 py-4 px-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('approvalHistory')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('approvalHistoryDesc')}</p>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">{approvedCount} {t('approved')}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-semibold text-red-600">{rejectedCount} {t('rejected')}</span>
          </div>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* Activity Line Chart */}
      {activityChartData.length > 0 && (
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-5 px-5">
            <p className="text-sm font-semibold text-slate-900">Approval Activity</p>
            <p className="mt-0.5 text-xs text-slate-500">Weekly approved vs rejected decisions</p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ChartContainer config={activityChartConfig} className="w-full" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityChartData} margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                    content={<ChartTooltipContent labelKey="week" />}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="approved"
                    name="Approved"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#22c55e' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rejected"
                    name="Rejected"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#ef4444' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Status chips */}
        <div className="inline-flex gap-1 p-1 bg-slate-100 rounded-xl flex-shrink-0">
          {STATUS_FILTERS.map(f => {
            const count = f.statuses
              ? myActedRequests.filter(r => f.statuses.includes(r.status)).length
              : myActedRequests.length;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`text-[0.8125rem] font-semibold px-4 py-1.5 rounded-[9px] cursor-pointer border-none outline-none transition-colors ${
                  statusFilter === f.key
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'bg-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold w-4 h-4 ${
                  statusFilter === f.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-200 text-slate-500'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder={t('searchEquipmentOrBorrower')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50/60">
                <TableHead className="text-xs font-medium text-slate-500">{t('equipment')}</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">{t('borrower')}</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">{t('borrowDate')}</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">{t('returnDate')}</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">{t('actedOn')}</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">{t('yourRemarks')}</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-20">
                    <div className="text-center">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-600">
                        {myActedRequests.length === 0 ? t('noReviewsYet') : t('noResultsFound')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {myActedRequests.length === 0
                          ? t('approvalHistoryEmptyHint')
                          : t('tryDifferentFilterOrSearch')}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">{request.equipment_name}</p>
                      <p className="text-xs text-slate-400">Qty: {request.quantity}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{request.borrower_name}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {request.borrow_date ? format(new Date(request.borrow_date), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {request.return_date ? format(new Date(request.return_date), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {request.head_approved_at ? format(new Date(request.head_approved_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-[180px]">
                      {request.head_remarks ? (
                        <span className="truncate block" title={request.head_remarks}>
                          {request.head_remarks}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredRequests.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
            <p className="text-xs text-slate-400">
              {t('recordsShown')} {filteredRequests.length} {t('ofLabel')} {myActedRequests.length} {t('recordsLabel')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
