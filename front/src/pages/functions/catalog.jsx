import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import EquipmentViewModal from '@/components/equipment/EquipmentViewModal';
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, SlidersHorizontal, Package, Loader2, CheckCircle } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format, addDays } from 'date-fns';

const catalogStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .catalog-fade-up {
    opacity: 0;
    animation: fadeUp 0.38s ease forwards;
  }
  .catalog-fade-up-1 { animation-delay: 0.04s; }
  .catalog-fade-up-2 { animation-delay: 0.10s; }
  .catalog-fade-up-3 { animation-delay: 0.17s; }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .card-in {
    opacity: 0;
    animation: cardIn 0.32s ease forwards;
  }
`;

const getDefaultBorrowForm = () => ({
  quantity: 1,
  purpose: '',
  borrow_date: format(new Date(), 'yyyy-MM-dd'),
  return_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  agree_policy: false,
});

export default function Catalog() {
  const [search, setSearch]                   = useState('');
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [viewedEquipment, setViewedEquipment] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showSuccessModal, setShowSuccessModal]   = useState(false);
  const [borrowForm, setBorrowForm]           = useState(getDefaultBorrowForm());

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: equipment = [], isLoading, isError, error } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  const createRequestMutation = useMutation({
    mutationFn: (data) => api.entities.BorrowRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      setSelectedEquipment(null);
      setShowSuccessModal(true);
      setBorrowForm(getDefaultBorrowForm());
    },
  });

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && item.is_active !== false;
  });

  const categories = [...new Set(equipment.map(e => e.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const groupedEquipment = filteredEquipment.reduce((acc, item) => {
    const key = item.category || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const groupedCategories = Object.keys(groupedEquipment).sort((a, b) => a.localeCompare(b));

  const handleBorrowSubmit = () => {
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
    <div className="w-full space-y-5 py-4 px-4">
      <style>{catalogStyles}</style>

      {/* Header */}
      <div className="catalog-fade-up catalog-fade-up-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Equipment Catalog</p>
          <h1 className="text-2xl font-bold text-slate-900">Equipment Catalog</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Browse and borrow available laboratory equipment.</p>
        </div>
        {!isLoading && !isError && (
          <span className="text-xs text-slate-400 font-semibold shrink-0 px-3 py-1.5 rounded-lg bg-slate-50">
            {filteredEquipment.length} item{filteredEquipment.length !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {/* Search and Filter */}
      <div className="catalog-fade-up catalog-fade-up-2 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <Input
            placeholder="Search by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400 transition-colors font-medium"
          />
        </div>
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => setGroupByCategory((v) => !v)}
            className={
              "inline-flex items-center gap-2 text-xs font-semibold px-3 h-9 rounded-lg border transition-colors " +
              (groupByCategory
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
            }
            aria-pressed={groupByCategory}
            title={groupByCategory ? 'Click to show all items' : 'Click to group by category'}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{groupByCategory ? 'Grouped by category' : 'All items'}</span>
          </button>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="catalog-fade-up catalog-fade-up-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <BanterLoader />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3 border border-red-100">
              <Package className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Unable to load equipment</p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs font-medium">
              {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
            </p>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3 border border-slate-200">
              <Package className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No equipment found</p>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">Try adjusting your search or filter.</p>
          </div>
        ) : (
          groupByCategory ? (
            <div className="space-y-8">
              {groupedCategories.map((cat, sectionIndex) => (
                <section key={cat} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">{cat}</h2>
                    <span className="text-xs font-semibold text-slate-400">
                      {groupedEquipment[cat].length} item{groupedEquipment[cat].length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    {groupedEquipment[cat].map((item, i) => (
                      <div
                        key={item.id}
                        className="card-in"
                        style={{ animationDelay: `${0.05 + (sectionIndex * 10 + i) * 0.03}s` }}
                      >
                        <EquipmentCard
                          equipment={item}
                          onSelect={setViewedEquipment}
                          onBorrow={(eq) => setSelectedEquipment(eq)}
                          userRole={user?.role}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {filteredEquipment.map((item, i) => (
                <div
                  key={item.id}
                  className="card-in"
                  style={{ animationDelay: `${0.05 + i * 0.03}s` }}
                >
                  <EquipmentCard
                    equipment={item}
                    onSelect={setViewedEquipment}
                    onBorrow={(eq) => setSelectedEquipment(eq)}
                    userRole={user?.role}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </div>

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
                  onChange={(e) => setBorrowForm({ ...borrowForm, quantity: parseInt(e.target.value) || 1 })}
                  className="border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-blue-400 font-medium"
                />
              </div>

              {/* Purpose */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Purpose</Label>
                <Textarea
                  placeholder="Explain why you need this equipment..."
                  value={borrowForm.purpose}
                  onChange={(e) => setBorrowForm({ ...borrowForm, purpose: e.target.value })}
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
                    onChange={(e) => setBorrowForm({ ...borrowForm, borrow_date: e.target.value })}
                    className="border-slate-200 rounded-lg text-sm focus:border-blue-400 focus:ring-blue-400 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Return Date</Label>
                  <Input
                    type="date"
                    value={borrowForm.return_date}
                    onChange={(e) => setBorrowForm({ ...borrowForm, return_date: e.target.value })}
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
                    onChange={(e) => setBorrowForm({ ...borrowForm, agree_policy: e.target.checked })}
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
    </div>
  );
}
