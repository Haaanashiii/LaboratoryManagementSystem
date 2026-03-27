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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Package, Upload, Link, Loader2 } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const categories = ['Electronics', 'Glassware', 'Measuring', 'Safety', 'Computing', 'Chemicals', 'Tools', 'Other'];
const conditions = ['Excellent', 'Good', 'Fair', 'Needs Maintenance'];

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [imageFiles, setImageFiles] = useState([]); // Array of files
  const [imagePreviews, setImagePreviews] = useState([]); // Array of previews
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Other',
    images_urls: [], // Array of image URLs
    total_quantity: 1,
    available_quantity: 1,
    location: '',
    condition: 'Good',
    is_active: true
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Equipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      closeDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Equipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setDeleteItem(null);
    }
  });

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase()) ||
    item.location?.toLowerCase().includes(search.toLowerCase())
  );

  const openAddDialog = () => {
    setEditingItem(null);
    setImageFiles([]);
    setImagePreviews([]);
    setFormData({
      name: '',
      description: '',
      category: 'Other',
      images_urls: [],
      total_quantity: 1,
      available_quantity: 1,
      location: '',
      condition: 'Good',
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (item) => {
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
      is_active: item.is_active !== false
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImageFiles([...imageFiles, ...files]);
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index) => {
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
    setFormData({ ...formData, images_urls: formData.images_urls.filter((_, i) => i !== index) });
  };

  const addImageUrl = (url) => {
    if (url.trim()) {
      setFormData({ ...formData, images_urls: [...formData.images_urls, url] });
      setImagePreviews([...imagePreviews, url]);
    }
  };

  const handleSubmit = async () => {
    let submitData = { ...formData };
    const uploadedUrls = [...formData.images_urls];

    // Upload any new files
    if (imageFiles.length > 0) {
      try {
        setUploading(true);
        for (const file of imageFiles) {
          const uploadedUrl = await api.entities.Equipment.uploadImage(file);
          uploadedUrls.push(uploadedUrl);
        }
        submitData.images_urls = uploadedUrls;
      } catch (err) {
        console.error('Image upload failed:', err);
        window.alert(err.message || 'Image upload failed. Please try again.');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'head_of_lab' || user?.role === 'lab_assistant';

  return (
    <div>
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white"
          />
        </div>
        {canEdit && (
          <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Equipment
          </Button>
        )}
      </div>

      {/* Equipment Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 relative">
              <BanterLoader />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20">
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
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Equipment</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                    <TableHead>Condition</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipment.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-slate-400 line-clamp-1">{item.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{item.location || '-'}</TableCell>
                      <TableCell className="text-center font-medium">{item.total_quantity}</TableCell>
                      <TableCell className="text-center">
                        <span className={item.available_quantity > 0 ? 'text-blue-600 font-medium' : 'text-red-600 font-medium'}>
                          {item.available_quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          item.condition === 'Excellent' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          item.condition === 'Good' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          item.condition === 'Fair' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          'bg-red-100 text-red-800 border-red-200'
                        }>
                          {item.condition}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                              <Pencil className="w-4 h-4 text-slate-400" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteItem(item)}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Equipment' : 'Add New Equipment'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Equipment name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.map(cond => (
                      <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Quantity *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.total_quantity}
                  onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Available Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.available_quantity}
                  onChange={(e) => setFormData({ ...formData, available_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Lab Room A, Shelf 3"
              />
            </div>

            <div className="space-y-2">
              <Label>Images (Multiple)</Label>
              <div className="space-y-3">
                {/* Upload button */}
                <div>
                  <label className="relative flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors overflow-hidden">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="text-sm text-slate-500">Uploading...</span>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-6 h-6 mx-auto text-slate-400" />
                        <span className="text-sm text-slate-500 mt-1 block">Click to add images</span>
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
                </div>

                {/* Image previews grid */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-slate-200"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* URL input section */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Or add image URL:</p>
                  <div className="flex gap-2">
                    <Input
                      id="imageUrlInput"
                      placeholder="https://..."
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById('imageUrlInput');
                        if (input?.value) {
                          addImageUrl(input.value);
                          input.value = '';
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
              ) : (createMutation.isPending || updateMutation.isPending) ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                editingItem ? 'Update' : 'Add Equipment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteItem.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}