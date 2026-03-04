import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Calendar, User, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function Returns() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnRemarks, setReturnRemarks] = useState('');

  const queryClient = useQueryClient();

  const { data: borrowedRequests = [], isLoading } = useQuery({
    queryKey: ['borrowedRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'borrowed' }, '-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.BorrowRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
    }
  });

  const openReturnDialog = (request) => {
    setSelectedRequest(request);
    setReturnCondition('Good');
    setReturnRemarks('');
  };

  const closeDialog = () => {
    setSelectedRequest(null);
  };

  const handleReturn = () => {
    updateMutation.mutate({
      id: selectedRequest.id,
      data: {
        status: 'returned',
        return_condition: returnCondition,
        return_remarks: returnRemarks,
        actual_return_date: format(new Date(), 'yyyy-MM-dd')
      }
    });
  };

  const isOverdue = (returnDate) => {
    return new Date(returnDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (borrowedRequests.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-20 text-center">
          <RotateCcw className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Pending Returns</h3>
          <p className="text-slate-500">All borrowed equipment has been returned</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {borrowedRequests.map((request) => {
          const overdue = isOverdue(request.return_date);
          return (
            <Card 
              key={request.id} 
              className={`border-0 shadow-sm ${overdue ? 'border-l-4 border-l-red-500' : ''}`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      overdue ? 'bg-red-100' : 'bg-emerald-100'
                    }`}>
                      <Package className={`w-5 h-5 ${overdue ? 'text-red-600' : 'text-emerald-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900">{request.equipment_name}</h3>
                        {overdue && (
                          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">Qty: {request.quantity}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {request.borrower_name}
                        </span>
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-500' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          Due: {format(new Date(request.return_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={request.status} />
                    <Button 
                      onClick={() => openReturnDialog(request)}
                      className="bg-slate-800 hover:bg-slate-900"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Process Return
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Return Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500">Equipment</p>
              <p className="font-medium">{selectedRequest?.equipment_name}</p>
              <p className="text-sm text-slate-500 mt-2">Borrowed by</p>
              <p className="font-medium">{selectedRequest?.borrower_name}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Equipment Condition</label>
              <Select value={returnCondition} onValueChange={setReturnCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Good
                    </span>
                  </SelectItem>
                  <SelectItem value="Damaged">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Damaged
                    </span>
                  </SelectItem>
                  <SelectItem value="Lost">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Lost
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Remarks {returnCondition !== 'Good' && <span className="text-red-500">*</span>}
              </label>
              <Textarea
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                placeholder={returnCondition !== 'Good' 
                  ? "Please describe the damage or issue..."
                  : "Optional: Add any notes..."
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button 
              onClick={handleReturn}
              disabled={updateMutation.isPending || (returnCondition !== 'Good' && !returnRemarks)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                'Confirm Return'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}