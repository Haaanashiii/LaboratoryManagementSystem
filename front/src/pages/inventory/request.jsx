import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Calendar } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format, isToday } from 'date-fns';

export default function MyRequests() {
  const [filter, setFilter] = useState('active');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const trackerSteps = [
    { key: 'pending_lecturer', label: 'Lecturer' },
    { key: 'pending_head', label: 'Head' },
    { key: 'head_approved', label: 'Approved' },
    { key: 'ready_pickup', label: 'Ready' },
    { key: 'borrowed', label: 'Borrowed' },
    { key: 'returned', label: 'Returned' }
  ];

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: requests = [], isLoading, isError, error } = useQuery({
    queryKey: ['myRequests'],
    queryFn: () => api.entities.BorrowRequest.myRequests(),
    enabled: !!user
  });

  const getHistoryTimestamp = (request) => {
    return (
      request.actual_return_date ||
      request.rejected_at ||
      request.released_at ||
      request.updatedAt ||
      request.created_date ||
      request.createdAt ||
      request.borrow_date
    );
  };

  const filteredRequests = requests
    .filter(r => {
      if (filter === 'active') return !['returned', 'rejected'].includes(r.status);
      if (filter === 'history') return true;
      return true;
    })
    .sort((a, b) => {
      if (filter !== 'history') return 0;

      const aTime = new Date(getHistoryTimestamp(a)).getTime();
      const bTime = new Date(getHistoryTimestamp(b)).getTime();
      return bTime - aTime;
    });

  const getHistoryDateHeader = (timestamp) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return `Today - ${format(date, 'EEEE, MMMM d, yyyy')}`;
    }

    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const historyGroups = filter === 'history'
    ? filteredRequests.reduce((groups, request) => {
        const timestamp = getHistoryTimestamp(request);
        const key = format(new Date(timestamp), 'yyyy-MM-dd');

        if (!groups[key]) {
          groups[key] = {
            key,
            title: getHistoryDateHeader(timestamp),
            requests: []
          };
        }

        groups[key].requests.push(request);
        return groups;
      }, {})
    : {};

  const getStatusStep = (status) => {
    const index = trackerSteps.findIndex((step) => step.key === status);
    return index >= 0 ? index + 1 : 1;
  };

  const renderProgressTracker = (request) => {
    if (request.status === 'rejected') {
      return (
        <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          Request was rejected.
        </div>
      );
    }

    const currentStep = getStatusStep(request.status);
    const progress = (currentStep / trackerSteps.length) * 100;

    return (
      <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600">Progress</p>
          <p className="text-xs text-slate-500">Step {currentStep} of {trackerSteps.length}</p>
        </div>

        <div className="relative mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {trackerSteps.map((step, index) => {
            const stepNumber = index + 1;
            const isDone = currentStep > stepNumber;
            const isCurrent = currentStep === stepNumber;

            return (
              <div key={step.key} className="flex flex-col items-center gap-1 text-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    isDone
                      ? 'bg-blue-600 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {stepNumber}
                </div>
                <span className={`text-[11px] md:text-xs ${isDone || isCurrent ? 'text-slate-700' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRequestCard = (request) => (
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
                {filter === 'history' && (
                  <span>
                    Updated: {format(new Date(getHistoryTimestamp(request)), 'MMM d, yyyy p')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {renderProgressTracker(request)}
      </CardContent>
    </Card>
  );

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
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
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
        filter === 'history' ? (
          <div className="space-y-6">
            {Object.values(historyGroups).map((group) => (
              <div key={group.key} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-500">{group.title}</h3>
                <div className="space-y-4">
                  {group.requests.map(renderRequestCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map(renderRequestCard)}
          </div>
        )
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