import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, History } from 'lucide-react';
import { format } from 'date-fns';

export default function ApprovalHistory() {
  const [search, setSearch] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['lecturerHistory', user?.email],
    queryFn: () => api.entities.BorrowRequest.filter({ lecturer_email: user?.email }, '-created_date'),
    enabled: !!user?.email
  });

  const filteredRequests = requests.filter(request =>
    request.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
    request.borrower_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 py-4 px-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Approval History</h1>
        <p className="mt-0.5 text-sm text-slate-500">A record of all requests you have reviewed.</p>
      </div>

      <hr className="border-slate-200" />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          placeholder="Search history..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-slate-200"
        />
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-xs font-medium text-slate-500">Equipment</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Borrower</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Date</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">My Remarks</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-20">
                    <div className="text-center">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-600">No history found</p>
                      <p className="text-xs text-slate-400">Your reviewed requests will appear here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">{request.equipment_name}</p>
                      <p className="text-xs text-slate-400">Qty: {request.quantity}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{request.borrower_name}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {request.borrow_date && format(new Date(request.borrow_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 max-w-xs truncate">
                      {request.lecturer_remarks || '—'}
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
      </div>
    </div>
  );
}