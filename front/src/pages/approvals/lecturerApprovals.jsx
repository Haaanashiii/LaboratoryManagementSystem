import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Calendar, User, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function LecturerApprovals() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [action, setAction] = useState(null); // 'approve' or 'reject'

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['pendingLecturerRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'pending_lecturer' }, '-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.BorrowRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingLecturerRequests'] });
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
    updateMutation.mutate({
      id: selectedRequest.id,
      data: {
        status: action === 'approve' ? 'pending_head' : 'rejected',
        lecturer_remarks: remarks,
        lecturer_email: user?.email
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-20 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">All caught up!</h3>
          <p className="text-slate-500">No pending requests require your verification</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">{request.equipment_name}</h3>
                  <p className="text-sm text-slate-500">Quantity: {request.quantity}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <User className="w-4 h-4" />
                      {request.borrower_name}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(request.borrow_date), 'MMM d')} - {format(new Date(request.return_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 lg:flex-shrink-0">
                <StatusBadge status={request.status} />
                <Button 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => openRejectDialog(request)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => openApproveDialog(request)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify
                </Button>
              </div>
            </div>

            {request.purpose && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-slate-500 mb-1">Purpose:</p>
                <p className="text-slate-700">{request.purpose}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Approval/Rejection Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Verify Request' : 'Reject Request'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-slate-600 mb-4">
              {action === 'approve' 
                ? `Verify ${selectedRequest?.borrower_name}'s request for ${selectedRequest?.equipment_name}?`
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
                  ? "Optional: Add any notes or instructions..."
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
              disabled={updateMutation.isPending || (action === 'reject' && !remarks)}
              className={action === 'approve' 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {updateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : action === 'approve' ? (
                'Verify & Forward'
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