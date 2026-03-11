import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ApprovalHistory() {
  const [search, setSearch] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['lecturerHistory', user?.email],
    queryFn: () => api.entities.BorrowRequest.filter({ student_email: user?.email }, '-created_date'),
    enabled: !!user?.email
  });

  const filteredRequests = requests.filter(request =>
    request.equipment_name?.toLowerCase().includes(search.toLowerCase()) ||
    request.borrower_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search history..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Equipment</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>My Remarks</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                      No approval history found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{request.equipment_name}</p>
                          <p className="text-xs text-slate-400">Qty: {request.quantity}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{request.borrower_name}</TableCell>
                      <TableCell className="text-slate-600">
                        {request.borrow_date && format(new Date(request.borrow_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-xs truncate">
                        {request.lecturer_remarks || '-'}
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
        </CardContent>
      </Card>
    </div>
  );
}