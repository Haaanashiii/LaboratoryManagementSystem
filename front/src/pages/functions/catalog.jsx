import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Package, Loader2, CheckCircle } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { format, addDays } from 'date-fns';

export default function Catalog() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [borrowForm, setBorrowForm] = useState({
    quantity: 1,
    purpose: '',
    borrow_date: format(new Date(), 'yyyy-MM-dd'),
    return_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    agree_policy: false
  });

  const getDefaultBorrowForm = () => ({
    quantity: 1,
    purpose: '',
    borrow_date: format(new Date(), 'yyyy-MM-dd'),
    return_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    agree_policy: false
  });

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
    }
  });

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                         item.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory && item.is_active !== false;
  });

  const categories = [...new Set(equipment.map(e => e.category).filter(Boolean))];

  const handleBorrowSubmit = () => {
    createRequestMutation.mutate({
      equipment: selectedEquipment.id,
      ...borrowForm
    });
  };

  const closeBorrowDialog = () => {
    setSelectedEquipment(null);
    setBorrowForm(getDefaultBorrowForm());
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 py-4 px-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Equipment Catalog</h1>
        <p className="mt-0.5 text-sm text-slate-500">Browse and borrow available laboratory equipment.</p>
      </div>

      <hr className="border-slate-200" />

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-44 bg-white border-slate-200">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Equipment Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 relative">
          <BanterLoader />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm font-medium text-slate-900">Unable to load equipment</p>
            <p className="text-xs text-slate-500 max-w-sm">
              {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
            </p>
          </div>
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">No equipment found</p>
          <p className="text-xs text-slate-400">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEquipment.map(item => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onBorrow={user?.role === 'student' ? setSelectedEquipment : null}
              userRole={user?.role}
            />
          ))}
        </div>
      )}

      {/* Borrow Dialog - Only for students */}
      {user?.role === 'student' && (
      <Dialog open={!!selectedEquipment} onOpenChange={closeBorrowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Borrow {selectedEquipment?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity (Available: {selectedEquipment?.available_quantity})</Label>
              <Input
                type="number"
                min="1"
                max={selectedEquipment?.available_quantity}
                value={borrowForm.quantity}
                onChange={(e) => setBorrowForm({ ...borrowForm, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea
                placeholder="Explain why you need this equipment..."
                value={borrowForm.purpose}
                onChange={(e) => setBorrowForm({ ...borrowForm, purpose: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Borrow Date</Label>
                <Input
                  type="date"
                  value={borrowForm.borrow_date}
                  onChange={(e) => setBorrowForm({ ...borrowForm, borrow_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Return Date</Label>
                <Input
                  type="date"
                  value={borrowForm.return_date}
                  onChange={(e) => setBorrowForm({ ...borrowForm, return_date: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
              <p className="text-sm font-medium text-amber-900">Borrower Agreement Policy</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Damaged items may be subject to replacement depending on the damage and severity. Lost items must be replaced by the borrower.
              </p>
              <label className="flex items-start gap-2 text-xs text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  checked={borrowForm.agree_policy}
                  onChange={(e) => setBorrowForm({ ...borrowForm, agree_policy: e.target.checked })}
                />
                <span>
                  I understand and agree to this policy, including replacement responsibility when applicable.
                </span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeBorrowDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleBorrowSubmit}
              disabled={createRequestMutation.isPending || !borrowForm.purpose || !borrowForm.agree_policy}
              className="bg-slate-900 hover:bg-slate-700"
            >
              {createRequestMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Request Submitted Successfully!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Your borrow request has been submitted and is pending lecturer approval. 
              You can track the status in your requests page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-700"
            >
              Got it
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
