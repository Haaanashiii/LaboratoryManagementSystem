import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function AllRequests() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['allRequests'],
    queryFn: () => api.entities.BorrowRequest.list('-created_date'),
  });

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
      request.borrower_name?.toLowerCase().includes(search.toLowerCase()) ||
      request.borrower_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        <h1 className="text-2xl font-semibold text-slate-900">All Requests</h1>
        <p className="mt-0.5 text-sm text-slate-500">Complete list of all equipment borrowing requests.</p>
      </div>

      <hr className="border-slate-200" />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search by equipment or borrower..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-44 bg-white border-slate-200">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_lecturer">Pending Lecturer</SelectItem>
            <SelectItem value="pending_head">Pending Head</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="ready_pickup">Ready for Pickup</SelectItem>
            <SelectItem value="borrowed">Borrowed</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-xs font-medium text-slate-500">Equipment</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Borrower</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Borrow Date</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Return Date</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                <TableHead className="text-xs font-medium text-slate-500">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-20">
                    <div className="text-center">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-600">No requests found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search or filter.</p>
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
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">{request.borrower_name}</p>
                      <p className="text-xs text-slate-400">{request.borrower_email}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {request.borrow_date && format(new Date(request.borrow_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {request.return_date && format(new Date(request.return_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {request.created_date && format(new Date(request.created_date), 'MMM d, yyyy')}
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