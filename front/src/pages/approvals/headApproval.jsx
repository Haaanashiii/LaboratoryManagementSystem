import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Calendar, User, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format } from 'date-fns';

export default function HeadApproval() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [action, setAction] = useState(null);

  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['pendingHeadRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'pending_head' }),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, remarks }) => api.entities.BorrowRequest.headAction(id, action, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingHeadRequests'] });
      queryClient.invalidateQueries({ queryKey: ['allRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      closeDialog();
    }
  });

  const openApproveDialog = (request) => {
    setSelectedRequest(request);
    setAction('approve');
    setRemarks('');
  };

  const openRejectDialog = (request) => {
    setSelectedRequest(request);
    setAction('reject');
    setRemarks('');
  };

  const closeDialog = () => {
    setSelectedRequest(null);
    setAction(null);
    setRemarks('');
  };

  const handleSubmit = () => {
    actionMutation.mutate({
      id: selectedRequest.id,
      action: action,
      remarks: remarks
    });
  };

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
          <h1 className="text-2xl font-semibold text-slate-900">Final Approvals</h1>
          <p className="mt-0.5 text-sm text-slate-500">Requests awaiting your final approval</p>
        </div>
        <hr className="border-slate-200" />
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm font-medium text-slate-900">Unable to load requests</p>
            <p className="text-xs text-slate-500 max-w-sm">
              {error?.message || 'Failed to connect to the server.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 py-4 px-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Final Approvals</h1>
        <p className="mt-0.5 text-sm text-slate-500">Review and give final approval for borrowing requests verified by lecturers.</p>
      </div>

      <hr className="border-slate-200" />

      {requests.length === 0 ? (
        <div className="py-20 text-center">
          <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">All caught up!</p>
          <p className="text-xs text-slate-400">No pending requests require your approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="border border-slate-200 rounded-lg hover:border-slate-400 transition-colors bg-white">
              <div className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 text-sm leading-tight">{request.equipment_name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Qty: {request.quantity}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {request.borrower_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(request.borrow_date), 'MMM d')} – {format(new Date(request.return_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {request.lecturer_remarks && (
                        <p className="text-xs text-slate-400 mt-2">
                          <span className="font-medium">Lecturer remarks:</span> {request.lecturer_remarks}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:flex-shrink-0">
                    <StatusBadge status={request.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => openRejectDialog(request)}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-green-700 hover:bg-green-800 text-white"
                      onClick={() => openApproveDialog(request)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>

                {request.purpose && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-0.5">Purpose</p>
                    <p className="text-sm text-slate-700">{request.purpose}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval/Rejection Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Final Approval' : 'Reject Request'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              {action === 'approve'
                ? `Give final approval for ${selectedRequest?.borrower_name}'s request for ${selectedRequest?.equipment_name}? This will allow the lab assistant to prepare the equipment.`
                : `Reject ${selectedRequest?.borrower_name}'s request for ${selectedRequest?.equipment_name}?`
              }
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Remarks {action === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={action === 'approve'
                  ? "Optional: Add any notes..."
                  : "Please provide a reason for rejection..."
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={actionMutation.isPending || (action === 'reject' && !remarks)}
              className={action === 'approve'
                ? 'bg-green-700 hover:bg-green-800'
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {actionMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : action === 'approve' ? (
                'Approve Request'
              ) : (
                'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}