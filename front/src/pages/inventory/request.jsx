import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Calendar, FileText } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format } from 'date-fns';

export default function MyRequests() {
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['myRequests'],
    queryFn: () => api.entities.BorrowRequest.myRequests(),
    enabled: !!user
  });

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['returned', 'rejected'].includes(r.status);
    if (filter === 'completed') return ['returned', 'rejected'].includes(r.status);
    return true;
  });

  const getStatusStep = (status) => {
    const steps = ['pending_lecturer', 'pending_head', 'approved', 'ready_pickup', 'borrowed', 'returned'];
    return steps.indexOf(status) + 1;
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
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg mx-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm font-medium text-slate-900">Unable to load your requests</p>
          <p className="text-xs text-slate-500 max-w-sm">
            {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList className="bg-white border">
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredRequests.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-20 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card 
              key={request.id} 
              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedRequest(request)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{request.equipment_name}</h3>
                      <p className="text-sm text-slate-500">Quantity: {request.quantity}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(request.borrow_date), 'MMM d')} - {format(new Date(request.return_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={request.status} />
                </div>

                {/* Progress Tracker */}
                {request.status !== 'rejected' && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-200">
                        <div 
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${(getStatusStep(request.status) / 6) * 100}%` }}
                        />
                      </div>
                      {['Lecturer', 'Head', 'Approved', 'Ready', 'Borrowed', 'Returned'].map((step, i) => (
                        <div key={step} className="relative z-10 flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            getStatusStep(request.status) > i 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-slate-200 text-slate-400'
                          }`}>
                            {i + 1}
                          </div>
                          <span className="text-xs text-slate-400 mt-1 hidden md:block">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Equipment</span>
                <span className="font-medium">{selectedRequest.equipment_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Quantity</span>
                <span className="font-medium">{selectedRequest.quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={selectedRequest.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Borrow Date</span>
                <span className="font-medium">{format(new Date(selectedRequest.borrow_date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Return Date</span>
                <span className="font-medium">{format(new Date(selectedRequest.return_date), 'MMM d, yyyy')}</span>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-slate-500 mb-2">Purpose</p>
                <p className="text-slate-700">{selectedRequest.purpose}</p>
              </div>

              {selectedRequest.lecturer_remarks && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-2">Lecturer Remarks</p>
                  <p className="text-slate-700">{selectedRequest.lecturer_remarks}</p>
                </div>
              )}

              {selectedRequest.head_remarks && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-2">Head of Lab Remarks</p>
                  <p className="text-slate-700">{selectedRequest.head_remarks}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}