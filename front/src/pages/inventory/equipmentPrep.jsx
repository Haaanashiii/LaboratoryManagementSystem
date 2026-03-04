import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Calendar, User, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function EquipmentPrep() {
  const queryClient = useQueryClient();

  const { data: approvedRequests = [], isLoading: loadingApproved } = useQuery({
    queryKey: ['approvedRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'approved' }, '-created_date'),
  });

  const { data: readyRequests = [], isLoading: loadingReady } = useQuery({
    queryKey: ['readyRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'ready_pickup' }, '-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.BorrowRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['readyRequests'] });
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
    }
  });

  const handleMarkReady = (request) => {
    updateMutation.mutate({
      id: request.id,
      data: { status: 'ready_pickup' }
    });
  };

  const handleConfirmPickup = (request) => {
    updateMutation.mutate({
      id: request.id,
      data: { status: 'borrowed' }
    });
  };

  const isLoading = loadingApproved || loadingReady;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
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
                        onClick={() => handleMarkReady(request)}
                        disabled={updateMutation.isPending}
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
                        onClick={() => handleConfirmPickup(request)}
                        disabled={updateMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
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
    </div>
  );
}