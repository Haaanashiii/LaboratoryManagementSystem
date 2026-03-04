import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function Catalog() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [borrowForm, setBorrowForm] = useState({
    quantity: 1,
    purpose: '',
    borrow_date: format(new Date(), 'yyyy-MM-dd'),
    return_date: format(addDays(new Date(), 7), 'yyyy-MM-dd')
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  const createRequestMutation = useMutation({
    mutationFn: (data) => api.entities.BorrowRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      setSelectedEquipment(null);
      setBorrowForm({
        quantity: 1,
        purpose: '',
        borrow_date: format(new Date(), 'yyyy-MM-dd'),
        return_date: format(addDays(new Date(), 7), 'yyyy-MM-dd')
      });
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
      equipment_id: selectedEquipment.id,
      equipment_name: selectedEquipment.name,
      borrower_email: user?.email,
      borrower_name: user?.full_name,
      ...borrowForm
    });
  };

  return (
    <div>
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 bg-white border-slate-200"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-48 h-12 bg-white">
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
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500">No equipment found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEquipment.map(item => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onBorrow={setSelectedEquipment}
            />
          ))}
        </div>
      )}

      {/* Borrow Dialog */}
      <Dialog open={!!selectedEquipment} onOpenChange={() => setSelectedEquipment(null)}>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEquipment(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBorrowSubmit}
              disabled={createRequestMutation.isPending || !borrowForm.purpose}
              className="bg-emerald-600 hover:bg-emerald-700"
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
    </div>
  );
}