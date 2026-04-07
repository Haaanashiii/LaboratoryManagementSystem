import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, CheckCircle, Loader2 } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  head_approved: { label: 'Needs Preparation', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ready_pickup:  { label: 'Ready for Pickup',  color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export default function EquipmentPrep() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dialogAction, setDialogAction] = useState(null); // 'prepare' or 'release'
  const queryClient = useQueryClient();

  const { data: approvedRequests = [], isLoading: loadingApproved, isError: errorApproved, error: errorMsgApproved } = useQuery({
    queryKey: ['approvedRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'head_approved' }, '-created_date'),
  });

  const { data: readyRequests = [], isLoading: loadingReady, isError: errorReady, error: errorMsgReady } = useQuery({
    queryKey: ['readyRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'ready_pickup' }, '-created_date'),
  });

  const prepareMutation = useMutation({
    mutationFn: (id) => api.entities.BorrowRequest.prepare(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['readyRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
    }
  });

  const releaseMutation = useMutation({
    mutationFn: (id) => api.entities.BorrowRequest.release(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readyRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
    }
  });

  const openPrepareDialog = (request) => {
    setSelectedRequest(request);
    setDialogAction('prepare');
  };

  const openReleaseDialog = (request) => {
    setSelectedRequest(request);
    setDialogAction('release');
  };

  const closeDialog = () => {
    setSelectedRequest(null);
    setDialogAction(null);
  };

  const handleConfirm = () => {
    if (dialogAction === 'prepare') {
      prepareMutation.mutate(selectedRequest.id);
    } else {
      releaseMutation.mutate(selectedRequest.id);
    }
  };

  const isPending = prepareMutation.isPending || releaseMutation.isPending;
  const isLoading = loadingApproved || loadingReady;
  const isError = errorApproved || errorReady;
  const error = errorMsgApproved || errorMsgReady;

  const allRequests = [
    ...approvedRequests.map((r) => ({ ...r, _section: 'prepare' })),
    ...readyRequests.map((r) => ({ ...r, _section: 'release' })),
  ];

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Equipment Preparation</h1>
          <p className="mt-0.5 text-sm text-slate-500">{allRequests.length} pending request{allRequests.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Stat Pills */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 max-w-sm">
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="rounded-lg bg-white/60 p-1.5">
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">Needs Prep</p>
            <p className="text-lg font-semibold leading-tight text-slate-900">{approvedRequests.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <div className="rounded-lg bg-white/60 p-1.5">
            <CheckCircle className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">Ready Pickup</p>
            <p className="text-lg font-semibold leading-tight text-slate-900">{readyRequests.length}</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <Card className="border-slate-200 shadow-none overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
          <p className="text-sm font-medium text-slate-800">All Requests</p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
            {allRequests.length}
          </span>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <BanterLoader />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <Package className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-800">Unable to load equipment requests</p>
              <p className="max-w-xs text-center text-xs text-slate-500">
                {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
              </p>
            </div>
          ) : allRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <Package className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No equipment to prepare</p>
              <p className="text-xs text-slate-400">All equipment has been prepared and distributed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="text-xs font-medium text-slate-500">Equipment</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Borrower</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Qty</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Borrow Date</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                    <TableHead className="text-right text-xs font-medium text-slate-500">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRequests.map((request) => {
                    const statusCfg = STATUS_CONFIG[request.status] ?? { label: request.status, color: 'bg-slate-100 text-slate-500 border-slate-200' };
                    return (
                      <TableRow key={request.id} className="border-slate-50 hover:bg-slate-50/50">
                        <TableCell>
                          <span className="text-sm font-medium text-slate-900">{request.equipment_name}</span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{request.borrower_name}</TableCell>
                        <TableCell className="text-xs text-slate-500">{request.quantity}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {format(new Date(request.borrow_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {request._section === 'prepare' ? (
                            <Button
                              size="sm"
                              className="h-7 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700"
                              onClick={() => openPrepareDialog(request)}
                              disabled={isPending}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Mark Ready
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => openReleaseDialog(request)}
                              disabled={isPending}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Confirm Pickup
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'prepare' ? 'Mark Equipment Ready' : 'Confirm Pickup'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-4 space-y-2">
              <div>
                <p className="text-xs text-slate-500">Equipment</p>
                <p className="text-sm font-medium text-slate-900">{selectedRequest?.equipment_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Borrower</p>
                <p className="text-sm font-medium text-slate-900">{selectedRequest?.borrower_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Quantity</p>
                <p className="text-sm font-medium text-slate-900">{selectedRequest?.quantity}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              {dialogAction === 'prepare'
                ? 'This will reserve the equipment and mark it as ready for pickup. The borrower will be notified.'
                : 'Confirm that the borrower has picked up the equipment. This will mark the request as actively borrowed.'
              }
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className={dialogAction === 'prepare' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : dialogAction === 'prepare' ? (
                'Mark as Ready'
              ) : (
                'Confirm Pickup'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}