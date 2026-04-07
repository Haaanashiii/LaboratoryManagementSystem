import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search, Plus, Pencil, Trash2, Package, ChevronLeft, ChevronRight,
  Cpu, Monitor, Network, Mouse, HardDrive, Cable, Wrench, Boxes,
  MapPin, AlertTriangle, Eye, Activity,
} from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';

/* ─── Config ─────────────────────────────────────────────────── */

const CATEGORIES = [
  { value: 'Electronics', label: 'Electronics', icon: Cpu,       dot: '#3b82f6', color: 'bg-blue-50 text-blue-700 border-blue-200'     },
  { value: 'Computing',   label: 'Computing',   icon: Monitor,   dot: '#8b5cf6', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'Networking',  label: 'Networking',  icon: Network,   dot: '#06b6d4', color: 'bg-cyan-50 text-cyan-700 border-cyan-200'       },
  { value: 'Peripherals', label: 'Peripherals', icon: Mouse,     dot: '#6366f1', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'Storage',     label: 'Storage',     icon: HardDrive, dot: '#22c55e', color: 'bg-emerald-50 text-emerald-700 border-emerald-200'},
  { value: 'Cables',      label: 'Cables',      icon: Cable,     dot: '#f97316', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'Tools',       label: 'Tools',       icon: Wrench,    dot: '#f59e0b', color: 'bg-amber-50 text-amber-700 border-amber-200'   },
  { value: 'Other',       label: 'Other',       icon: Boxes,     dot: '#64748b', color: 'bg-slate-100 text-slate-600 border-slate-200'   },
];

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];

const CONDITION_COLOR = {
  Excellent: 'bg-blue-50 text-blue-700 border-blue-200',
  Good:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  Fair:      'bg-amber-50 text-amber-700 border-amber-200',
  Poor:      'bg-orange-50 text-orange-700 border-orange-200',
  Damaged:   'bg-red-50 text-red-700 border-red-200',
};

const STATUS_COLOR = {
  active:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
  retired:     'bg-slate-100 text-slate-500 border-slate-200',
};

const PAGE_SIZE = 10;

const BLANK_FORM = {
  name: '',
  category: 'Other',
  description: '',
  location: '',
  condition: 'Good',
  total_quantity: 1,
  available_quantity: 1,
  status: 'active',
  image_url: '',
};

/* ─── Helpers ────────────────────────────────────────────────── */

const getCategoryConfig = (value) =>
  CATEGORIES.find((c) => c.value === value) || CATEGORIES.find((c) => c.value === 'Other');

/* ─── Component ──────────────────────────────────────────────── */

export default function AdminCatalog() {
  const queryClient = useQueryClient();

  const [search, setSearch]         = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [currentPage, setCurrentPage]       = useState(1);
  const [addOpen, setAddOpen]               = useState(false);
  const [editingItem, setEditingItem]       = useState(null);
  const [deletingItem, setDeletingItem]     = useState(null);
  const [viewingItem, setViewingItem]       = useState(null);
  const [addForm, setAddForm]               = useState(BLANK_FORM);
  const [editForm, setEditForm]             = useState(BLANK_FORM);

  /* ── Queries / mutations ── */

  const { data: equipment = [], isLoading, isError, error } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.entities.Equipment.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Equipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setAddOpen(false);
      setAddForm(BLANK_FORM);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Equipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Equipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setDeletingItem(null);
    },
  });

  /* ── Filtering / pagination ── */

  useEffect(() => { setCurrentPage(1); }, [search, activeCategory]);

  const filtered = equipment.filter((item) => {
    const matchSearch =
      !search.trim() ||
      (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.location || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = !activeCategory || (item.category || 'Other') === activeCategory;
    return matchSearch && matchCategory;
  });

  const countByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = equipment.filter((i) => (i.category || 'Other') === cat.value).length;
    return acc;
  }, {});

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated    = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeCatCfg = activeCategory ? getCategoryConfig(activeCategory) : null;

  /* ── Form setters ── */

  const setAdd  = (key, val) => setAddForm((p) => ({ ...p, [key]: val }));
  const setEdit = (key, val) => setEditForm((p) => ({ ...p, [key]: val }));

  const openEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      name:               item.name || '',
      category:           item.category || 'Other',
      description:        item.description || '',
      location:           item.location || '',
      condition:          item.condition || 'Good',
      total_quantity:     item.total_quantity ?? item.quantity ?? 1,
      available_quantity: item.available_quantity ?? item.available ?? 1,
      status:             item.status || 'active',
      image_url:          item.image_url || '',
    });
  };

  const handleAdd = () => {
    createMutation.mutate({
      ...addForm,
      images_urls: addForm.image_url ? [addForm.image_url] : [],
    });
  };

  const handleUpdate = () => {
    updateMutation.mutate({
      id: editingItem.id,
      data: {
        ...editForm,
        images_urls: editForm.image_url ? [editForm.image_url] : [],
      },
    });
  };

  /* ─────────────────────────────────────────────────────────── */

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Equipment Catalog</h1>
          <p className="mt-0.5 text-sm text-slate-500">{equipment.length} total items in the lab</p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-blue-600 text-xs hover:bg-blue-700"
          onClick={() => { setAddForm(BLANK_FORM); setAddOpen(true); }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Equipment
        </Button>
      </div>

      {/* ── Category pills ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {CATEGORIES.map((cat) => {
          const count   = countByCategory[cat.value] || 0;
          const isActive = activeCategory === cat.value;
          const CatIcon  = cat.icon;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat.value ? '' : cat.value)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? `${cat.color} shadow-sm`
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`rounded-lg p-1.5 ${isActive ? 'bg-white/60' : 'bg-slate-100'}`}>
                <CatIcon
                  className="h-3.5 w-3.5"
                  style={isActive ? { color: cat.dot } : { color: '#64748b' }}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] text-slate-500">{cat.label}</p>
                <p className="text-base font-semibold leading-tight text-slate-900">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Table card ── */}
      <Card className="border-slate-200 shadow-none overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {activeCatCfg && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeCatCfg.dot }} />
            )}
            <p className="text-sm font-medium text-slate-800">
              {activeCatCfg ? activeCatCfg.label : 'All Equipment'}
            </p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {filtered.length}
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

        {/* Body */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <BanterLoader />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-400" />
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
                    <TableHead className="text-xs font-medium text-slate-500">Condition</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Qty / Avail.</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                    <TableHead className="text-right text-xs font-medium text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <Package className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">
                            {activeCategory
                              ? `No ${activeCategory.toLowerCase()} equipment found`
                              : 'No equipment found'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((item) => {
                      const catCfg = getCategoryConfig(item.category);
                      const CatIcon = catCfg.icon;
                      const condColor = CONDITION_COLOR[item.condition] || CONDITION_COLOR.Good;
                      const statusColor = STATUS_COLOR[item.status] || STATUS_COLOR.active;

                      return (
                        <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/50">
                          {/* Name + thumbnail */}
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="h-8 w-8 shrink-0 rounded-lg object-cover border border-slate-100"
                                />
                              ) : (
                                <div
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                  style={{ backgroundColor: catCfg.dot + '18' }}
                                >
                                  <CatIcon className="h-4 w-4" style={{ color: catCfg.dot }} />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => setViewingItem(item)}
                                className="text-sm font-medium text-slate-900 hover:text-blue-600 hover:underline underline-offset-2 transition-colors text-left"
                              >
                                {item.name}
                              </button>
                            </div>
                          </TableCell>

                          {/* Category */}
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${catCfg.color}`}>
                              {item.category || 'Other'}
                            </span>
                          </TableCell>

                          {/* Location */}
                          <TableCell className="text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-300 shrink-0" />
                              {item.location || '—'}
                            </div>
                          </TableCell>

                          {/* Condition */}
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${condColor}`}>
                              {item.condition || 'Good'}
                            </span>
                          </TableCell>

                          {/* Qty / Available */}
                          <TableCell>
                            <span className="text-xs text-slate-800 font-medium">
                              {item.total_quantity ?? item.quantity ?? 0}
                            </span>
                            <span className="text-xs text-slate-400 mx-1">/</span>
                            <span className="text-xs text-emerald-600 font-medium">
                              {item.available_quantity ?? item.available ?? 0}
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusColor}`}>
                              {item.status || 'active'}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700"
                                onClick={() => setViewingItem(item)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-slate-300 hover:text-red-500"
                                onClick={() => setDeletingItem(item)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
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
                        className={`h-7 w-7 text-xs ${currentPage === page ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
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

      {/* ── View Dialog ── */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <Eye className="h-4 w-4 text-slate-600" />
              </div>
              Equipment Details
            </DialogTitle>
          </DialogHeader>
          {viewingItem && (() => {
            const catCfg   = getCategoryConfig(viewingItem.category);
            const CatIcon  = catCfg.icon;
            const condColor  = CONDITION_COLOR[viewingItem.condition]  || CONDITION_COLOR.Good;
            const statusColor = STATUS_COLOR[viewingItem.status] || STATUS_COLOR.active;
            return (
              <div className="py-4 space-y-3">
                {/* Thumbnail / icon banner */}
                <div className="flex flex-col items-center gap-2 pb-2">
                  {viewingItem.image_url ? (
                    <img
                      src={viewingItem.image_url}
                      alt={viewingItem.name}
                      className="h-20 w-20 rounded-xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-xl"
                      style={{ backgroundColor: catCfg.dot + '1a' }}
                    >
                      <CatIcon className="h-10 w-10" style={{ color: catCfg.dot }} />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-900">{viewingItem.name}</p>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${catCfg.color}`}>
                      {viewingItem.category || 'Other'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                  {[
                    ['Location',    viewingItem.location || '—'],
                    ['Condition',   null, <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${condColor}`}>{viewingItem.condition || 'Good'}</span>],
                    ['Status',      null, <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusColor}`}>{viewingItem.status || 'active'}</span>],
                    ['Total Qty',   viewingItem.total_quantity ?? viewingItem.quantity ?? '—'],
                    ['Available',   viewingItem.available_quantity ?? viewingItem.available ?? '—'],
                  ].map(([label, text, node], idx, arr) => (
                    <React.Fragment key={label}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                        {node ?? <p className="text-slate-800">{text}</p>}
                      </div>
                      {idx < arr.length - 1 && <div className="h-px bg-slate-100" />}
                    </React.Fragment>
                  ))}
                  {viewingItem.description && (
                    <>
                      <div className="h-px bg-slate-100" />
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1">Description</p>
                        <p className="text-slate-700 leading-relaxed">{viewingItem.description}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button size="sm" variant="outline" onClick={() => setViewingItem(null)} className="text-xs w-full">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Dialog ── */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) { setAddOpen(false); setAddForm(BLANK_FORM); } }}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <Plus className="h-4 w-4 text-blue-600" />
              </div>
              Add Equipment
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Name <span className="text-red-500">*</span></Label>
                <Input value={addForm.name} onChange={(e) => setAdd('name', e.target.value)} placeholder="e.g. Oscilloscope" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Category</Label>
                <Select value={addForm.category} onValueChange={(v) => setAdd('category', v)}>
                  <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Description</Label>
              <Textarea value={addForm.description} onChange={(e) => setAdd('description', e.target.value)} placeholder="Brief description…" className="text-sm resize-none" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Location <span className="text-red-500">*</span></Label>
                <Input value={addForm.location} onChange={(e) => setAdd('location', e.target.value)} placeholder="e.g. Cabinet A-3" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Condition</Label>
                <Select value={addForm.condition} onValueChange={(v) => setAdd('condition', v)}>
                  <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Total Qty</Label>
                <Input type="number" min={0} value={addForm.total_quantity} onChange={(e) => setAdd('total_quantity', Number(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Available</Label>
                <Input type="number" min={0} value={addForm.available_quantity} onChange={(e) => setAdd('available_quantity', Number(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Status</Label>
                <Select value={addForm.status} onValueChange={(v) => setAdd('status', v)}>
                  <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Image URL <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input value={addForm.image_url} onChange={(e) => setAdd('image_url', e.target.value)} placeholder="https://..." className="h-9 text-sm" />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4 gap-2">
            <Button size="sm" variant="outline" onClick={() => { setAddOpen(false); setAddForm(BLANK_FORM); }} className="text-xs">Cancel</Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-xs"
              onClick={handleAdd}
              disabled={createMutation.isPending || !addForm.name.trim() || !addForm.location.trim()}
            >
              {createMutation.isPending ? 'Saving…' : 'Add Equipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <Pencil className="h-4 w-4 text-slate-600" />
              </div>
              Edit Equipment
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Name <span className="text-red-500">*</span></Label>
                <Input value={editForm.name} onChange={(e) => setEdit('name', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Category</Label>
                <Select value={editForm.category} onValueChange={(v) => setEdit('category', v)}>
                  <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Description</Label>
              <Textarea value={editForm.description} onChange={(e) => setEdit('description', e.target.value)} className="text-sm resize-none" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Location <span className="text-red-500">*</span></Label>
                <Input value={editForm.location} onChange={(e) => setEdit('location', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Condition</Label>
                <Select value={editForm.condition} onValueChange={(v) => setEdit('condition', v)}>
                  <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Total Qty</Label>
                <Input type="number" min={0} value={editForm.total_quantity} onChange={(e) => setEdit('total_quantity', Number(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Available</Label>
                <Input type="number" min={0} value={editForm.available_quantity} onChange={(e) => setEdit('available_quantity', Number(e.target.value))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEdit('status', v)}>
                  <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Image URL <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input value={editForm.image_url} onChange={(e) => setEdit('image_url', e.target.value)} placeholder="https://..." className="h-9 text-sm" />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4 gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditingItem(null)} className="text-xs">Cancel</Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-xs"
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !editForm.name.trim() || !editForm.location.trim()}
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!deletingItem} onOpenChange={(open) => { if (!open) setDeletingItem(null); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              Delete Equipment
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-900">{deletingItem?.name}</span>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4 gap-2">
            <Button size="sm" variant="outline" onClick={() => setDeletingItem(null)} className="text-xs">Cancel</Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-xs text-white"
              onClick={() => deleteMutation.mutate(deletingItem.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
