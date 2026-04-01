import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const ACTION_OPTIONS = [
  'all',
  'login_success',
  'login_failed',
  'borrow_created',
  'borrow_released',
  'borrow_returned',
  'damage_verified'
];

export default function AdminAuditLogs() {
  const [filters, setFilters] = useState({
    user: '',
    action_type: 'all',
    start_date: ''
  });

  const queryFilters = useMemo(() => {
    const next = {};
    if (filters.user.trim()) next.user = filters.user.trim();
    if (filters.action_type !== 'all') next.action_type = filters.action_type;
    if (filters.start_date) next.start_date = filters.start_date;
    next.limit = 100;
    return next;
  }, [filters]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminAuditLogs', queryFilters],
    queryFn: () => api.entities.AuditLogs.list(queryFilters),
  });

  const logs = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto space-y-4 py-4 px-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Audit Logs</h1>
        <p className="text-sm text-slate-600 mt-1">Track login attempts, borrow activity, returns, and damage verification actions.</p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => refetch()}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Refresh Logs
        </Button>
      </div>

      <Card className="border-slate-200 shadow-none">
        <CardContent className="p-4">
          <div className="w-full flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Input
                placeholder="Filter by user email or id"
                value={filters.user}
                onChange={(event) => setFilters((prev) => ({ ...prev, user: event.target.value }))}
                className="w-full md:w-[320px]"
              />

              <Select value={filters.action_type} onValueChange={(value) => setFilters((prev) => ({ ...prev, action_type: value }))}>
                <SelectTrigger className="w-full md:w-[260px]">
                  <SelectValue placeholder="Action type" />
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
                <th className="text-left px-4 py-3 font-medium">Timestamp</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Entity</th>
                <th className="text-left px-4 py-3 font-medium">Details</th>
              </tr>
              </thead>
              <tbody>
              {isLoading && (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>Loading logs...</td>
                </tr>
              )}

              {!isLoading && logs.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>No logs found for current filters.</td>
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
