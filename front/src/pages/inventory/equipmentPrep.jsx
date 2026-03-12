import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Calendar, User, CheckCircle, Loader2 } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format } from 'date-fns';

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
      closeDialog();
    }
  });

  const releaseMutation = useMutation({
    mutationFn: (id) => api.entities.BorrowRequest.release(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readyRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 relative">
        <BanterLoader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg mx-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm font-medium text-slate-900">Unable to load equipment requests</p>
          <p className="text-xs text-slate-500 max-w-sm">
            {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
          </p>
        </div>
      </div>
    );
  }

  const hasNoRequests = approvedRequests.length === 0 && readyRequests.length === 0;

  if (hasNoRequests) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-20 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Equipment to Prepare</h3>
          <p className="text-slate-500">All equipment has been prepared and distributed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Approved - Need Preparation */}
      {approvedRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            Needs Preparation ({approvedRequests.length})
          </h2>
          <div className="space-y-3">
            {approvedRequests.map((request) => (
              <Card key={request.id} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">{request.equipment_name}</h3>
                        <p className="text-sm text-slate-500">Qty: {request.quantity}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {request.borrower_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(request.borrow_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={request.status} />
                      <Button 
                        onClick={() => openPrepareDialog(request)}
                        disabled={isPending}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Ready
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Ready for Pickup */}
      {readyRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            Ready for Pickup ({readyRequests.length})
          </h2>
          <div className="space-y-3">
            {readyRequests.map((request) => (
              <Card key={request.id} className="border-0 shadow-sm border-l-4 border-l-indigo-500">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">{request.equipment_name}</h3>
                        <p className="text-sm text-slate-500">Qty: {request.quantity}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {request.borrower_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(request.borrow_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={request.status} />
                      <Button 
                        onClick={() => openReleaseDialog(request)}
                        disabled={isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Pickup
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'prepare' ? 'Mark Equipment Ready' : 'Confirm Pickup'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-500">Equipment</p>
              <p className="font-medium">{selectedRequest?.equipment_name}</p>
              <p className="text-sm text-slate-500 mt-2">Borrower</p>
              <p className="font-medium">{selectedRequest?.borrower_name}</p>
              <p className="text-sm text-slate-500 mt-2">Quantity</p>
              <p className="font-medium">{selectedRequest?.quantity}</p>
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
              className={dialogAction === 'prepare' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
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