import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Pencil, Upload, Loader2, Cpu, Monitor, Network, Mouse,
  HardDrive, Cable, Wrench, Boxes, Trash2, ArrowLeft,
  MapPin, Tag, Package, CheckCircle2, ImagePlus, Link2, Plus,
  AlertCircle,
} from 'lucide-react';
import { EditEquipmentSkeleton } from '@/skeleton-framework/admin';

/* ─── Static config ─────────────────────────────────────────── */

const categoryConfig = [
  { value: 'Electronics', label: 'Electronics', icon: Cpu,       color: 'text-blue-600',   bg: 'bg-blue-50',   ring: 'ring-blue-400'   },
  { value: 'Computing',   label: 'Computing',   icon: Monitor,   color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-400' },
  { value: 'Networking',  label: 'Networking',  icon: Network,   color: 'text-cyan-600',   bg: 'bg-cyan-50',   ring: 'ring-cyan-400'   },
  { value: 'Peripherals', label: 'Peripherals', icon: Mouse,     color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-400' },
  { value: 'Storage',     label: 'Storage',     icon: HardDrive, color: 'text-emerald-600',bg: 'bg-emerald-50',ring: 'ring-emerald-400'},
  { value: 'Cables',      label: 'Cables',      icon: Cable,     color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-400' },
  { value: 'Tools',       label: 'Tools',       icon: Wrench,    color: 'text-amber-600',  bg: 'bg-amber-50',  ring: 'ring-amber-400'  },
  { value: 'Other',       label: 'Other',       icon: Boxes,     color: 'text-slate-600',  bg: 'bg-slate-100', ring: 'ring-slate-400'  },
];

const conditionConfig = [
  { value: 'Excellent',         label: 'Excellent',         color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    ring: 'ring-blue-400'    },
  { value: 'Good',              label: 'Good',              color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-400' },
  { value: 'Fair',              label: 'Fair',              color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   ring: 'ring-amber-400'   },
  { value: 'Needs Maintenance', label: 'Needs Maintenance', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     ring: 'ring-red-400'     },
];

/* ─── Section wrapper ────────────────────────────────────────── */

function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-start gap-4 border-b border-slate-100 px-8 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <Icon className="h-5 w-5 text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="px-8 py-7">{children}</div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function EditEquipmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlInputRef = useRef(null);

  const [formData, setFormData] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const set = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  /* ─── Fetch existing equipment ───────────────────────────────── */
  const { data: equipment, isLoading, isError } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => api.entities.Equipment.getById(id),
    enabled: Boolean(id),
  });

  /* ─── Pre-populate form when data loads ─────────────────────── */
  useEffect(() => {
    if (equipment && !formData) {
      const existingImages = equipment.images_urls || (equipment.image_url ? [equipment.image_url] : []);
      setFormData({
        name: equipment.name || '',
        description: equipment.description || '',
        category: equipment.category || 'Other',
        images_urls: existingImages,
        total_quantity: equipment.total_quantity ?? 1,
        available_quantity: equipment.available_quantity ?? 1,
        location: equipment.location || '',
        condition: equipment.condition || 'Good',
        is_active: equipment.is_active !== false,
      });
      setImagePreviews(existingImages);
    }
  }, [equipment, formData]);

  /* ─── Update mutation ────────────────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: (data) => api.entities.Equipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      navigate('/inventory');
    },
  });

  /* ─── Image helpers ──────────────────────────────────────────── */
  const addFiles = (files) => {
    const arr = Array.from(files);
    setImageFiles((prev) => [...prev, ...arr]);
    setImagePreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
  };

  const handleFileSelect = (e) => addFiles(e.target.files || []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const removeImage = (index) => {
    const isExisting = index < (formData?.images_urls?.length ?? 0) - imageFiles.length;
    setImageFiles((prev) => {
      const fileIndex = index - ((formData?.images_urls?.length ?? 0) - imageFiles.length);
      if (fileIndex >= 0) return prev.filter((_, i) => i !== fileIndex);
      return prev;
    });
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({ ...prev, images_urls: prev.images_urls.filter((_, i) => i !== index) }));
  };

  const addImageUrl = () => {
    const url = urlInputRef.current?.value?.trim();
    if (url) {
      setFormData((prev) => ({ ...prev, images_urls: [...prev.images_urls, url] }));
      setImagePreviews((prev) => [...prev, url]);
      urlInputRef.current.value = '';
    }
  };

  /* ─── Submit ─────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Equipment name is required.');
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
        submitData = { ...submitData, images_urls: uploadedUrls };
      } catch (err) {
        setFormError(err.message || 'Image upload failed. Please try again.');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    updateMutation.mutate(submitData);
  };

  const isSubmitting = uploading || updateMutation.isPending;

  /* ─── Loading / error states ─────────────────────────────────── */
  if (isLoading) return <EditEquipmentSkeleton />;

  if (isError || (!isLoading && !equipment)) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <p className="text-sm font-medium text-slate-800">Equipment not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
        </Button>
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="w-full space-y-8 px-1 py-2">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          onClick={() => navigate('/inventory')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Equipment</h1>
          <p className="mt-1 text-sm text-slate-500">Update the details for <span className="font-medium text-slate-700">{equipment.name}</span>.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Two-column layout ─────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Left column — main fields (2/3 width) */}
          <div className="space-y-6 xl:col-span-2">

            {/* § Basic Information */}
            <Section icon={Package} title="Basic Information" description="The primary details shown across the inventory.">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Equipment Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g., Oscilloscope DS1054Z"
                    className="h-11 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Describe the equipment — specs, purpose, notable features..."
                    rows={4}
                    className="resize-none text-sm leading-relaxed"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Location</span>
                  </Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => set('location', e.target.value)}
                    placeholder="e.g., Lab Room A — Shelf 3"
                    className="h-11 text-sm"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </Section>

            {/* § Category */}
            <Section icon={Tag} title="Category" description="Select the category that best describes this equipment.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {categoryConfig.map((cat) => {
                  const isSelected = formData.category === cat.value;
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => set('category', cat.value)}
                      className={`flex flex-col items-center gap-2.5 rounded-xl border-2 px-3 py-4 text-center transition-all focus:outline-none ${
                        isSubmitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                      } ${
                        isSelected
                          ? `${cat.bg} border-transparent ring-2 ${cat.ring} shadow-sm`
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isSelected ? 'bg-white/70' : 'bg-slate-100'}`}>
                        <CatIcon className={`h-4.5 w-4.5 ${isSelected ? cat.color : 'text-slate-400'}`} style={{ width: '1.125rem', height: '1.125rem' }} />
                      </div>
                      <span className={`text-xs font-medium leading-tight ${isSelected ? cat.color : 'text-slate-600'}`}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* § Inventory Details */}
            <Section icon={CheckCircle2} title="Inventory Details" description="Quantities and physical condition of the equipment.">
              <div className="space-y-6">
                {/* Quantities */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.total_quantity}
                      onChange={(e) => set('total_quantity', parseInt(e.target.value) || 0)}
                      className="h-11 text-center text-lg font-semibold"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-slate-400">Total units owned by the lab</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.available_quantity}
                      onChange={(e) => set('available_quantity', parseInt(e.target.value) || 0)}
                      className="h-11 text-center text-lg font-semibold text-emerald-600"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-slate-400">Units ready to be borrowed</p>
                  </div>
                </div>

                {/* Quick action */}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                    disabled={isSubmitting}
                    onClick={() => set('available_quantity', 0)}
                  >
                    Mark Out of Stock
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    disabled={isSubmitting}
                    onClick={() => set('available_quantity', formData.total_quantity)}
                  >
                    Restore Full Stock
                  </Button>
                </div>

                {/* Condition pills */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Condition</Label>
                  <div className="flex flex-wrap gap-3">
                    {conditionConfig.map((cond) => {
                      const isSelected = formData.condition === cond.value;
                      return (
                        <button
                          key={cond.value}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => set('condition', cond.value)}
                          className={`rounded-full border px-5 py-2 text-sm font-medium transition-all focus:outline-none ${
                            isSubmitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${
                            isSelected
                              ? `${cond.bg} ${cond.color} ${cond.border} ring-2 ${cond.ring} shadow-sm`
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {cond.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Section>

          </div>{/* /left column */}

          {/* Right column — images (1/3 width) */}
          <div className="xl:col-span-1">
            <div className="sticky top-4 space-y-4">
              <Section icon={ImagePlus} title="Images" description="Add or replace photos for this equipment.">
                <div className="space-y-4">

                  {/* Drop zone */}
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-all ${
                      isSubmitting
                        ? 'cursor-not-allowed opacity-60'
                        : dragOver
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-sm font-medium text-slate-600">Uploading images...</p>
                      </>
                    ) : (
                      <>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${dragOver ? 'bg-blue-100' : 'bg-white'} border border-slate-200`}>
                          <Upload className={`h-5 w-5 ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            {dragOver ? 'Drop to upload' : 'Drag & drop images'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">or click to browse files</p>
                        </div>
                        <p className="text-xs text-slate-400">PNG, JPG, GIF, WEBP, SVG</p>
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/avif,image/svg+xml"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                  </label>

                  {/* URL input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        ref={urlInputRef}
                        placeholder="Paste image URL..."
                        className="h-9 pl-8 text-xs"
                        disabled={isSubmitting}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      disabled={isSubmitting}
                      onClick={addImageUrl}
                      className="h-9 w-9 shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Previews */}
                  {imagePreviews.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500">{imagePreviews.length} image{imagePreviews.length > 1 ? 's' : ''}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="group relative">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="aspect-square w-full rounded-xl border border-slate-200 object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            {index === 0 && (
                              <span className="absolute bottom-1 left-1 rounded-full bg-black/50 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                                Cover
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </Section>

              {/* Sticky action buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-sm"
                  onClick={() => navigate('/inventory')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!formData.name.trim() || isSubmitting}
                  className="flex-1 gap-2 bg-amber-600 text-sm font-medium hover:bg-amber-700"
                  onClick={handleSubmit}
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                  ) : updateMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Pencil className="h-4 w-4" /> Save Changes</>
                  )}
                </Button>
              </div>
            </div>
          </div>

        </div>{/* /two-column */}

        {/* ── Error ───────────────────────────────────────────────── */}
        {(formError || updateMutation.isError) && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100">
              <span className="text-xs font-bold text-red-600">!</span>
            </div>
            <p className="text-sm text-red-700">
              {formError || updateMutation.error?.message || 'Something went wrong. Please try again.'}
            </p>
          </div>
        )}

        {/* ── Footer actions (mobile) ──────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 sm:hidden">
          <Button
            type="button"
            variant="outline"
            className="flex-1 text-sm"
            onClick={() => navigate('/inventory')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!formData.name.trim() || isSubmitting}
            className="flex-1 gap-2 bg-amber-600 text-sm font-medium hover:bg-amber-700"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            {uploading ? 'Uploading...' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

      </form>
    </div>
  );
}
