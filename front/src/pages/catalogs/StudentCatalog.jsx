import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { CheckCircle, Loader2 } from 'lucide-react';

import { api } from '@/api/apiClient';
import { useAuth } from '@/components/hooks/useAuth.js';
import EquipmentViewModal from '@/components/equipment/EquipmentViewModal';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import CatalogContent from './CatalogContent';
import { useCatalogData } from './useCatalogData';

const getDefaultBorrowForm = () => ({
  quantity: 1,
  purpose: '',
  borrow_date: format(new Date(), 'yyyy-MM-dd'),
  return_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  agree_policy: false,
});

export default function StudentCatalog() {
  const { user } = useAuth();
  const [viewedEquipment, setViewedEquipment] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [borrowForm, setBorrowForm] = useState(getDefaultBorrowForm());

  const {
    search,
    setSearch,
    groupByCategory,
    setGroupByCategory,
    filteredEquipment,
    groupedEquipment,
    groupedCategories,
    isLoading,
    isError,
    error,
  } = useCatalogData();

  const queryClient = useQueryClient();

  const createRequestMutation = useMutation({
    mutationFn: (data) => api.entities.BorrowRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      setSelectedEquipment(null);
      setShowSuccessModal(true);
      setBorrowForm(getDefaultBorrowForm());
    },
  });

  const handleBorrowSubmit = () => {
    if (!selectedEquipment) {
      return;
    }
    createRequestMutation.mutate({ equipment: selectedEquipment.id, ...borrowForm });
  };

  const closeBorrowDialog = () => {
    setSelectedEquipment(null);
    setBorrowForm(getDefaultBorrowForm());
  };

  const handleViewEquipmentBorrow = (equipment) => {
    setViewedEquipment(null);
    setSelectedEquipment(equipment);
    setBorrowForm(getDefaultBorrowForm());
  };

  return (
    <>
      <CatalogContent
        header={{
          eyebrow: 'Equipment Catalog',
          title: 'Equipment Catalog',
          description: 'Browse and borrow available laboratory equipment.',
        }}
        search={search}
        onSearchChange={setSearch}
        groupByCategory={groupByCategory}
        onToggleGroupBy={() => setGroupByCategory((value) => !value)}
        filteredEquipment={filteredEquipment}
        groupedEquipment={groupedEquipment}
        groupedCategories={groupedCategories}
        isLoading={isLoading}
        isError={isError}
        error={error}
        userRole={user?.role}
        onSelect={setViewedEquipment}
        onBorrow={setSelectedEquipment}
      />

      {/* Equipment View Modal */}
      {user?.role === 'student' && (
        <EquipmentViewModal
          equipment={viewedEquipment}
          open={!!viewedEquipment}
          onClose={() => setViewedEquipment(null)}
          onBorrow={handleViewEquipmentBorrow}
        />
      )}

      {/* Borrow Dialog */}
      {user?.role === 'student' && (
        <Dialog open={!!selectedEquipment} onOpenChange={closeBorrowDialog}>
          <DialogContent className="sm:max-w-md rounded-xl border-slate-200 shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Borrow Equipment
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Equipment Name */}
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Item</p>
                <p className="text-sm font-bold text-blue-900">{selectedEquipment?.name}</p>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Quantity
                  <span className="ml-2 text-slate-400 font-normal normal-case">
                    (max {selectedEquipment?.available_quantity})
                  </span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedEquipment?.available_quantity}
                  value={borrowForm.quantity}
                  onChange={(event) => setBorrowForm({ ...borrowForm, quantity: parseInt(event.target.value, 10) || 1 })}
                  className="border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-blue-400 font-medium"
                />
              </div>

              {/* Purpose */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Purpose</Label>
                <Textarea
                  placeholder="Explain why you need this equipment..."
                  value={borrowForm.purpose}
                  onChange={(event) => setBorrowForm({ ...borrowForm, purpose: event.target.value })}
                  rows={3}
                  className="border-slate-200 rounded-lg text-sm resize-none focus:border-blue-400 focus:ring-blue-400 font-medium"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Borrow Date</Label>
                  <Input
                    type="date"
                    value={borrowForm.borrow_date}
                    onChange={(event) => setBorrowForm({ ...borrowForm, borrow_date: event.target.value })}
                    className="border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-blue-400 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Return Date</Label>
                  <Input
                    type="date"
                    value={borrowForm.return_date}
                    onChange={(event) => setBorrowForm({ ...borrowForm, return_date: event.target.value })}
                    className="border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-blue-400 font-medium"
                  />
                </div>
              </div>

              {/* Policy */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2.5">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-widest">Agreement Policy</p>
                <p className="text-xs text-amber-850 leading-relaxed font-medium">
                  Damaged items may be subject to replacement depending on the damage and severity. Lost items must be replaced by the borrower.
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    checked={borrowForm.agree_policy}
                    onChange={(event) => setBorrowForm({ ...borrowForm, agree_policy: event.target.checked })}
                  />
                  <span className="text-xs text-amber-900 leading-relaxed font-medium">
                    I understand and agree to this policy, including replacement responsibility when applicable.
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={closeBorrowDialog}
                className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBorrowSubmit}
                disabled={createRequestMutation.isPending || !borrowForm.purpose || !borrowForm.agree_policy}
                className="rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-sm transition-colors disabled:opacity-40 font-semibold"
              >
                {createRequestMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Submitting...</>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent className="rounded-xl border-slate-200 shadow-lg max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-lg font-bold text-slate-900">
              Request Submitted
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-slate-600 leading-relaxed font-medium">
              Your borrow request is pending lecturer approval. Track its status on the Requests page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-sm transition-colors font-semibold"
            >
              Got it
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
