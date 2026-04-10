import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Package, Cpu, Monitor, Network, Mouse, HardDrive, Cable, Wrench, Boxes, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { InventorySkeleton } from '@/skeleton-framework/admin';

const PAGE_SIZE = 10;

const categoryConfig = [
  { value: 'Electronics',  label: 'Electronics',  color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: '#3b82f6', icon: Cpu },
  { value: 'Computing',    label: 'Computing',    color: 'bg-violet-50 text-violet-700 border-violet-200', dot: '#8b5cf6', icon: Monitor },
  { value: 'Networking',   label: 'Networking',   color: 'bg-cyan-50 text-cyan-700 border-cyan-200',     dot: '#06b6d4', icon: Network },
  { value: 'Peripherals',  label: 'Peripherals',  color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: '#6366f1', icon: Mouse },
  { value: 'Storage',      label: 'Storage',      color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#22c55e', icon: HardDrive },
  { value: 'Cables',       label: 'Cables',       color: 'bg-orange-50 text-orange-700 border-orange-200', dot: '#f97316', icon: Cable },
  { value: 'Tools',        label: 'Tools',        color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: '#f59e0b', icon: Wrench },
  { value: 'Other',        label: 'Other',        color: 'bg-slate-50 text-slate-700 border-slate-200',   dot: '#64748b', icon: Boxes },
];

const conditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];

const conditionStyle = (condition) => {
  if (condition === 'Excellent') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (condition === 'Good')      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (condition === 'Fair')      return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
};

export default function Inventory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteItem, setDeleteItem] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: equipment = [], isLoading, isError, error } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Equipment.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['equipment'] }); setDeleteItem(null); },
  });

  React.useEffect(() => { setCurrentPage(1); }, [search, activeCategory]);

  const filteredEquipment = equipment.filter(item =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase()) ||
    item.location?.toLowerCase().includes(search.toLowerCase())
  );

  const equipmentByCategory = categoryConfig.reduce((acc, cat) => {
    acc[cat.value] = equipment.filter(item => (item.category || 'Other') === cat.value);
    return acc;
  }, {});

  const displayedEquipment = activeCategory
    ? filteredEquipment.filter(item => (item.category || 'Other') === activeCategory)
    : filteredEquipment;

  const totalPages = Math.max(1, Math.ceil(displayedEquipment.length / PAGE_SIZE));
  const paginatedEquipment = displayedEquipment.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeCategoryConfig = activeCategory ? categoryConfig.find(c => c.value === activeCategory) : null;
  const canEdit = user?.role === 'admin' || user?.role === 'head_of_lab' || user?.role === 'lab_assistant' || user?.role === 'lecturer';



  const h = new Date().getHours();
  const gc =
    h < 12 ? { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' } :
    h < 18 ? { color: '#f97316', bg: '#fff7ed', border: '#fed7aa' } :
             { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };

  if (isLoading) return <InventorySkeleton />;

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Hero Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
            style={{ backgroundColor: gc.bg, borderColor: gc.border }}
          >
            <Package className="h-6 w-6" style={{ color: gc.color }} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Inventory</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <Package className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold leading-none tabular-nums text-blue-700">{equipment.length}</p>
              <p className="mt-0.5 text-[10px] font-medium text-blue-500">total item{equipment.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <Package className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold leading-none tabular-nums text-emerald-700">{equipment.filter(e => (e.available ?? e.available_quantity ?? 0) > 0).length}</p>
              <p className="mt-0.5 text-[10px] font-medium text-emerald-500">available</p>
            </div>
          </div>
          {canEdit && (
            <Button size="sm" className="h-8 gap-1.5 bg-blue-600 text-xs hover:bg-blue-700" onClick={() => navigate('/inventory/add-equipment')}>
              <Plus className="h-3.5 w-3.5" />
              Add Equipment
            </Button>
          )}
        </div>
      </div>

      {/* ── Category stat pills ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {categoryConfig.map((cat) => {
          const count = equipmentByCategory[cat.value]?.length || 0;
          const isActive = activeCategory === cat.value;
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat.value ? '' : cat.value)}
              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? `${cat.color} shadow-sm`
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`rounded-lg p-1.5 ${isActive ? 'bg-white/60' : 'bg-slate-100'}`}>
                <CatIcon className="h-4 w-4" style={isActive ? { color: cat.dot } : { color: '#64748b' }} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-slate-500">{cat.label}</p>
                <p className="text-lg font-semibold leading-tight text-slate-900">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Search + Table Card ── */}
      <Card className="overflow-hidden border-slate-200 shadow-none">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {activeCategoryConfig && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeCategoryConfig.dot }} />
            )}
            <p className="text-sm font-medium text-slate-800">
              {activeCategoryConfig ? activeCategoryConfig.label : 'All Equipment'}
            </p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {displayedEquipment.length}
            </span>
            {activeCategory && (
              <button
                onClick={() => setActiveCategory('')}
                className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search equipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <Package className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-800">Unable to load equipment</p>
              <p className="max-w-xs text-center text-xs text-slate-500">
                {error?.message || 'Failed to connect to the server.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="text-xs font-medium text-slate-500">Equipment</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Category</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Location</TableHead>
                    <TableHead className="text-center text-xs font-medium text-slate-500">Total</TableHead>
                    <TableHead className="text-center text-xs font-medium text-slate-500">Available</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Condition</TableHead>
                    {canEdit && <TableHead className="text-right text-xs font-medium text-slate-500">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedEquipment.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 7 : 6} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <Package className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">
                            {activeCategoryConfig ? `No ${activeCategoryConfig.label.toLowerCase()} equipment found` : 'No equipment found'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEquipment.map((item) => {
                      const catConfig = categoryConfig.find(c => c.value === (item.category || 'Other')) || categoryConfig[categoryConfig.length - 1];
                      return (
                        <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Package className="h-4 w-4 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                                {item.description && (
                                  <p className="max-w-[200px] truncate text-xs text-slate-400">{item.description}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${catConfig.color}`}>
                              {item.category || 'Other'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{item.location || '—'}</TableCell>
                          <TableCell className="text-center text-sm font-medium text-slate-700">{item.total_quantity}</TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-semibold ${item.available_quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {item.available_quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${conditionStyle(item.condition)}`}>
                              {item.condition || 'Good'}
                            </span>
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700"
                                  onClick={() => navigate(`/inventory/edit-equipment/${item.id}`)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-md text-slate-300 hover:text-red-500"
                                  onClick={() => setDeleteItem(item)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, displayedEquipment.length)} of {displayedEquipment.length} items
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="icon"
                        className={`h-7 w-7 text-xs ${currentPage === page ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent className="max-w-sm overflow-hidden rounded-2xl p-0">
          {/* Illustration */}
          <div className="flex flex-col items-center bg-red-50 px-6 pt-8 pb-6">
            {/* Item image with trash overlay */}
            <div className="relative">
              <div className="flex h-50 w-50 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-4 ring-red-100">
                {deleteItem?.image_url ? (
                  <img src={deleteItem.image_url} alt={deleteItem.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-8 w-8 text-slate-300" />
                )}
              </div>
              {/* Trash badge */}
              <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 shadow">
                <Trash2 className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <h2 className="mt-5 text-base font-semibold text-slate-900">Delete Equipment?</h2>
            <p className="mt-1 text-center text-xs text-slate-500">
              You're about to permanently delete{' '}
              <span className="font-semibold text-slate-700">"{deleteItem?.name}"</span>.
              <br />This action cannot be undone.
            </p>
          </div>
          {/* Actions */}
          <div className="flex gap-2 bg-white px-6 py-4">
            <AlertDialogCancel className="h-9 flex-1 rounded-lg text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteItem.id)}
              className="h-9 flex-1 rounded-lg bg-red-600 text-xs hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}