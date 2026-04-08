import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Package, Upload, Loader2, Cpu, Monitor, Network, Mouse, HardDrive, Cable, Wrench, Boxes, ChevronLeft, ChevronRight } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';

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
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Other',
    images_urls: [],
    total_quantity: 1,
    available_quantity: 1,
    location: '',
    condition: 'Good',
    is_active: true,
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

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Equipment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['equipment'] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Equipment.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['equipment'] }); closeDialog(); },
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
  const canEdit = user?.role === 'admin' || user?.role === 'head_of_lab' || user?.role === 'lab_assistant';

  const openAddDialog = () => {
    setFormError('');
    setEditingItem(null);
    setImageFiles([]);
    setImagePreviews([]);
    setFormData({ name: '', description: '', category: 'Other', images_urls: [], total_quantity: 1, available_quantity: 1, location: '', condition: 'Good', is_active: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setFormError('');
    setEditingItem(item);
    setImageFiles([]);
    setImagePreviews(item.images_urls || (item.image_url ? [item.image_url] : []));
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category || 'Other',
      images_urls: item.images_urls || (item.image_url ? [item.image_url] : []),
      total_quantity: item.total_quantity,
      available_quantity: item.available_quantity,
      location: item.location || '',
      condition: item.condition || 'Good',
      is_active: item.is_active !== false,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setImageFiles([]);
    setImagePreviews([]);
    setFormError('');
    setFormData({
      name: '',
      description: '',
      category: 'Other',
      images_urls: [],
      total_quantity: 1,
      available_quantity: 1,
      location: '',
      condition: 'Good',
      is_active: true,
    });
  };

  const parseQuantityInput = (value) => {
    if (value === '') return '';
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return '';
    return Math.max(0, parsed);
  };

  const normalizeQuantity = (value) => {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({ ...prev, images_urls: prev.images_urls.filter((_, i) => i !== index) }));
  };

  const addImageUrl = (url) => {
    if (url.trim()) {
      setFormData(prev => ({ ...prev, images_urls: [...prev.images_urls, url] }));
      setImagePreviews(prev => [...prev, url]);
    }
  };

  const handleSubmit = async () => {
    setFormError('');

    const totalQuantity = normalizeQuantity(formData.total_quantity);
    const availableQuantity = normalizeQuantity(formData.available_quantity);

    if (!formData.name?.trim()) {
      setFormError('Equipment name is required.');
      return;
    }

    if (!formData.location?.trim()) {
      setFormError('Location is required.');
      return;
    }

    if (availableQuantity > totalQuantity) {
      setFormError('Available quantity cannot be greater than total quantity.');
      return;
    }

    let submitData = { ...formData };
    const uploadedUrls = [...formData.images_urls];

    if (imageFiles.length > 0) {
      try {
        setUploading(true);
        for (const file of imageFiles) {
          const uploadedUrl = await api.entities.Equipment.uploadImage(file);
          uploadedUrls.push(uploadedUrl);
        }
        submitData.images_urls = uploadedUrls;
      } catch (err) {
        setFormError(err.message || 'Image upload failed. Please try again.');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    submitData = {
      ...submitData,
      total_quantity: totalQuantity,
      available_quantity: availableQuantity,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Inventory</h1>
          <p className="mt-0.5 text-sm text-slate-500">{equipment.length} total equipment items</p>
        </div>
        {canEdit && (
          <Button size="sm" className="h-8 gap-1.5 bg-blue-600 text-xs hover:bg-blue-700" onClick={openAddDialog}>
            <Plus className="h-3.5 w-3.5" />
            Add Equipment
          </Button>
        )}
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
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <BanterLoader />
            </div>
          ) : isError ? (
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
                                  onClick={() => openEditDialog(item)}
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

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          closeDialog();
          return;
        }
        setIsDialogOpen(true);
      }}>
        <DialogContent className="rounded-2xl bg-white text-slate-900 sm:max-w-2xl">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${editingItem ? 'bg-amber-50' : 'bg-blue-50'}`}>
                {editingItem
                  ? <Pencil className="h-4 w-4 text-amber-600" />
                  : <Plus className="h-4 w-4 text-blue-600" />
                }
              </div>
              {editingItem ? 'Edit Equipment' : 'Add New Equipment'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* Row 1: Name + Location */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Name <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Equipment name"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Location <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Lab Room A, Shelf 3"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Row 2: Category + Condition + Total + Available */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Category <span className="text-red-500">*</span></Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="h-9 bg-white text-sm text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-900">
                    {categoryConfig.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Condition</Label>
                <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                  <SelectTrigger className="h-9 bg-white text-sm text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-900">
                    {conditions.map(cond => (
                      <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Total Qty <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.total_quantity}
                  onChange={(e) => setFormData({ ...formData, total_quantity: parseQuantityInput(e.target.value) })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Available</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.available_quantity}
                  onChange={(e) => setFormData({ ...formData, available_quantity: parseQuantityInput(e.target.value) })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            {editingItem && (
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => setFormData((prev) => ({ ...prev, available_quantity: 0 }))}
                >
                  Mark Out of Stock
                </Button>
              </div>
            )}

            {/* Row 3: Description + Images side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Images</Label>
                <label className="flex w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-3 transition-colors hover:border-blue-400">
                  {uploading ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-xs text-slate-500">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Upload className="h-4 w-4 text-slate-400" />
                      <span className="text-xs text-slate-500">Click to upload</span>
                    </div>
                  )}
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/avif,image/svg+xml"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <div className="flex gap-2">
                  <Input id="imageUrlInput" placeholder="Or paste image URL..." className="h-8 text-xs" />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('imageUrlInput');
                      if (input?.value) { addImageUrl(input.value); input.value = ''; }
                    }}
                    className="h-8 shrink-0 bg-blue-600 text-xs hover:bg-blue-700"
                  >
                    Add
                  </Button>
                </div>
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="group relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="h-12 w-full rounded-lg border border-slate-200 object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute right-0.5 top-0.5 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {formError && (
            <div className="mb-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={closeDialog} className="text-xs">Cancel</Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!formData.name || !formData.location.trim() || createMutation.isPending || updateMutation.isPending || uploading}
              className="bg-blue-600 text-xs hover:bg-blue-700"
            >
              {uploading ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Uploading...</>
              ) : (createMutation.isPending || updateMutation.isPending) ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</>
              ) : (
                editingItem ? 'Update Equipment' : 'Add Equipment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent className="rounded-2xl bg-white text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              Delete Equipment
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1 text-xs text-slate-500">
              Are you sure you want to delete{' '}
              <span className="font-medium text-slate-700">"{deleteItem?.name}"</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteItem.id)}
              className="h-8 bg-red-600 text-xs hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}