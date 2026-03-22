import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Calendar, User, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format } from 'date-fns';

export default function Returns() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [damageDetails, setDamageDetails] = useState('');
  const [damageImage, setDamageImage] = useState(null);
  const [studentWillReplace, setStudentWillReplace] = useState('');
  const [replacementCompleted, setReplacementCompleted] = useState('');

  const queryClient = useQueryClient();

  const { data: borrowedRequests = [], isLoading, isError, error } = useQuery({
    queryKey: ['borrowedRequests'],
    queryFn: () => api.entities.BorrowRequest.filter({ status: 'borrowed' }, '-created_date'),
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, returnData }) => api.entities.BorrowRequest.return(id, returnData),
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
    setDamageDetails('');
    setDamageImage(null);
    setStudentWillReplace('');
    setReplacementCompleted('');
  };

  const closeDialog = () => {
    setSelectedRequest(null);
  };

  const handleConditionChange = (value) => {
    setReturnCondition(value);

    if (value === 'Good') {
      setDamageDetails('');
      setDamageImage(null);
      setStudentWillReplace('');
      setReplacementCompleted('');
      return;
    }

    if (value === 'Damaged') {
      setStudentWillReplace('');
      setReplacementCompleted('');
      return;
    }

    if (value === 'Lost') {
      setDamageDetails('');
      setStudentWillReplace('yes');
      setReplacementCompleted('');
    }
  };

  const handleDamageImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setDamageImage(file);
  };

  const handleStudentReplacementChange = (value) => {
    setStudentWillReplace(value);
    if (value !== 'yes') {
      setReplacementCompleted('');
    }
  };

  const handleReturn = () => {
    const willReplace = returnCondition === 'Lost' ? true : studentWillReplace === 'yes';
    const hasReplacementTracking = returnCondition === 'Lost' || willReplace;

    returnMutation.mutate({
      id: selectedRequest.id,
      returnData: {
        return_condition: returnCondition,
        return_remarks: returnRemarks,
        damage_details: returnCondition === 'Damaged' ? damageDetails : '',
          damage_image: returnCondition === 'Damaged' ? damageImage : null,
        student_will_replace: returnCondition === 'Good' ? false : willReplace,
        replacement_completed: hasReplacementTracking ? replacementCompleted === 'yes' : false
      }
    });
  };

  const shouldRequireRemarks = returnCondition !== 'Good';
  const shouldRequireDamageDetails = returnCondition === 'Damaged';
  const shouldRequireReplacementDecision = returnCondition === 'Damaged';
  const shouldTrackReplacement = returnCondition === 'Lost' || (returnCondition === 'Damaged' && studentWillReplace === 'yes');

  const isFormInvalid =
    (shouldRequireRemarks && !returnRemarks.trim()) ||
    (shouldRequireDamageDetails && !damageDetails.trim()) ||
    (shouldRequireReplacementDecision && studentWillReplace === '') ||
    (shouldTrackReplacement && replacementCompleted === '');

  const isOverdue = (returnDate) => {
    return new Date(returnDate) < new Date();
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
            <RotateCcw className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm font-medium text-slate-900">Unable to load borrowed items</p>
          <p className="text-xs text-slate-500 max-w-sm">
            {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
          </p>
        </div>
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
                      overdue ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <Package className={`w-5 h-5 ${overdue ? 'text-red-600' : 'text-blue-600'}`} />
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
              <Select value={returnCondition} onValueChange={handleConditionChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
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

            {returnCondition === 'Damaged' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  What is damaged? <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={damageDetails}
                  onChange={(e) => setDamageDetails(e.target.value)}
                  placeholder="Example: cracked screen, broken cable, missing charger tip..."
                  rows={3}
                />
              </div>
            )}

            {returnCondition === 'Damaged' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Damage image (optional but recommended)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDamageImageChange}
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                {damageImage && (
                  <p className="text-xs text-slate-500">Selected: {damageImage.name}</p>
                )}
              </div>
            )}

            {returnCondition === 'Damaged' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Will the borrower replace it? <span className="text-red-500">*</span>
                </label>
                <Select value={studentWillReplace} onValueChange={handleStudentReplacementChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select replacement responsibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes, borrower will replace it</SelectItem>
                    <SelectItem value="no">No, replacement is not required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {returnCondition === 'Lost' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-medium">Lost item policy</p>
                <p>
                  {selectedRequest?.borrower_name} must replace this lost item.
                </p>
              </div>
            )}

            {shouldTrackReplacement && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Has the replacement already been completed? <span className="text-red-500">*</span>
                </label>
                <Select value={replacementCompleted} onValueChange={setReplacementCompleted}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select replacement status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes, already replaced</SelectItem>
                    <SelectItem value="no">No, still pending replacement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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
              disabled={returnMutation.isPending || isFormInvalid}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {returnMutation.isPending ? (
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