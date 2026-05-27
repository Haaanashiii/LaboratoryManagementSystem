import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Upload, Loader2, Cpu, Monitor, Network, Mouse,
  HardDrive, Cable, Wrench, Boxes, Trash2, ArrowLeft,
  MapPin, Tag, Package, CheckCircle2, ImagePlus, Link2, AlertCircle,
} from 'lucide-react';
import '@/styles/equimon-admin.css';

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
  { value: 'Excellent',         label: 'Excellent',        color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    ring: 'ring-blue-400'    },
  { value: 'Good',              label: 'Good',             color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-400' },
  { value: 'Fair',              label: 'Fair',             color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   ring: 'ring-amber-400'   },
  { value: 'Needs Maintenance', label: 'Needs Maintenance',     color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     ring: 'ring-red-400'     },
];

const initialForm = {
  name: '',
  serialNumber: '',
  description: '',
  category: 'Other',
  images_urls: [],
  total_quantity: 1,
  available_quantity: 1,
  location: '',
  condition: 'Good',
  is_active: true,
};

/* ─── Section wrapper ────────────────────────────────────────── */

function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="a-panel" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, borderBottom: '1px solid var(--a-rule)', padding: '18px 22px' }}>
        <div style={{ width: 36, height: 36, background: 'var(--a-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 16, height: 16, color: 'var(--a-gold)' }} />
        </div>
        <div>
          <p style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: 'var(--a-navy)', margin: 0 }}>{title}</p>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--a-mute)', margin: '3px 0 0' }}>{description}</p>
        </div>
      </div>
      <div style={{ padding: '22px 24px' }}>{children}</div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function AddEquipmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlDebounceRef = useRef(null);

  const [formData, setFormData]     = useState(initialForm);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [failedImages, setFailedImages]   = useState(new Set());
  const [urlInput, setUrlInput]     = useState('');
  const [uploading, setUploading]   = useState(false);
  const [formError, setFormError]   = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [addSuccess, setAddSuccess] = useState(false);
  const [savedName, setSavedName]   = useState('');
  const [dragOver, setDragOver]     = useState(false);
  const [showImageLimitModal, setShowImageLimitModal] = useState(false);

  const set = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Equipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setSavedName(formData.name);
      setAddSuccess(true);
    },
  });

  /* image helpers — single image only */
  const addFiles = (files) => {
    if (imagePreviews.length > 0) { setShowImageLimitModal(true); return; }
    const file = Array.from(files)[0];
    if (!file) return;
    setImageFiles([file]);
    setImagePreviews([URL.createObjectURL(file)]);
    setFormData((prev) => ({ ...prev, images_urls: [] }));
  };

  const handleFileSelect = (e) => { addFiles(e.target.files || []); e.target.value = ''; };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({ ...prev, images_urls: prev.images_urls.filter((_, i) => i !== index) }));
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrlInput(val);
    clearTimeout(urlDebounceRef.current);
    if (imagePreviews.length > 0) { setShowImageLimitModal(true); setUrlInput(''); return; }
    const trimmed = val.trim();
    if (/^https?:\/\/.{4,}/.test(trimmed)) {
      urlDebounceRef.current = setTimeout(() => {
        setFormData((prev) => ({ ...prev, images_urls: [trimmed] }));
        setImagePreviews([trimmed]);
        setImageFiles([]);
        setUrlInput('');
      }, 700);
    }
  };

  const commitUrlInput = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (imagePreviews.length > 0) { setShowImageLimitModal(true); setUrlInput(''); return; }
    clearTimeout(urlDebounceRef.current);
    setFormData((prev) => ({ ...prev, images_urls: [trimmed] }));
    setImagePreviews([trimmed]);
    setImageFiles([]);
    setUrlInput('');
  };

  /* submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const errors = {};
    if (!formData.name.trim())     errors.name     = 'Equipment name is required.';
    if (!formData.location.trim()) errors.location  = 'Location is required.';
    if ((formData.total_quantity ?? 0) < 1) errors.total_quantity = 'Total quantity must be at least 1.';
    if ((formData.available_quantity ?? 0) > (formData.total_quantity ?? 0))
      errors.available_quantity = 'Available cannot exceed total quantity.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    let submitData = { ...formData };
    const uploadedUrls = [...formData.images_urls];

    setUploading(true);
    try {
      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const uploadedUrl = await api.entities.Equipment.uploadImage(file);
          uploadedUrls.push(uploadedUrl);
        }
      } else if (uploadedUrls.length > 0 && /^https?:\/\//i.test(uploadedUrls[0])) {
        // Pasted external URL — proxy through backend so it's stored in GridFS
        try {
          const hostedUrl = await api.entities.Equipment.uploadImageFromUrl(uploadedUrls[0]);
          uploadedUrls[0] = hostedUrl;
        } catch {
          // If proxying fails, keep the original URL (best-effort)
        }
      }
      submitData = { ...submitData, images_urls: uploadedUrls };
    } catch (err) {
      setFormError(err.message || 'Image upload failed. Please try again.');
      setUploading(false);
      return;
    }
    setUploading(false);

    createMutation.mutate(submitData);
  };

  const isSubmitting = uploading || createMutation.isPending;

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Title Strip ── */}
      <div className="a-titlestrip">
        <div>
          <div className="a-eyebrow">Inventory · Add</div>
          <h1>Add Equipment</h1>
          <div className="a-deck">Register a new item to the laboratory inventory</div>
        </div>
        <div className="a-right">
          <button type="button" className="a-btn" onClick={() => navigate('/inventory')}>
            <ArrowLeft style={{ width: 13, height: 13 }} />
            Back to Inventory
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Two-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

          {/* Left column — main fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* § Basic Information */}
            <Section icon={Package} title="Basic Information" description="The primary details shown across the inventory.">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Equipment Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="e.g., Oscilloscope DS1054Z"
                      className={`h-11 text-sm ${fieldErrors.name ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                      disabled={isSubmitting}
                    />
                    {fieldErrors.name && <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--a-bad)', marginTop: 2 }}>{fieldErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><Tag className="h-3 w-3" /> Serial Number</span>
                    </Label>
                    <Input
                      value={formData.serialNumber}
                      onChange={(e) => set('serialNumber', e.target.value)}
                      placeholder="e.g., SN-2024-00123"
                      className="h-11 text-sm font-mono"
                      disabled={isSubmitting}
                    />
                  </div>
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
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Location <span className="text-red-500">*</span></span>
                  </Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => set('location', e.target.value)}
                    placeholder="e.g., Lab Room A — Shelf 3"
                    className={`h-11 text-sm ${fieldErrors.location ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.location && <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--a-bad)', marginTop: 2 }}>{fieldErrors.location}</p>}
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
                      className={`h-11 text-center text-lg font-semibold ${fieldErrors.total_quantity ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                      disabled={isSubmitting}
                    />
                    {fieldErrors.total_quantity
                      ? <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--a-bad)', marginTop: 2 }}>{fieldErrors.total_quantity}</p>
                      : <p className="text-xs text-slate-400">Total units owned by the lab</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.available_quantity}
                      onChange={(e) => set('available_quantity', parseInt(e.target.value) || 0)}
                      className={`h-11 text-center text-lg font-semibold text-emerald-600 ${fieldErrors.available_quantity ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                      disabled={isSubmitting}
                    />
                    {fieldErrors.available_quantity
                      ? <p style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--a-bad)', marginTop: 2 }}>{fieldErrors.available_quantity}</p>
                      : <p className="text-xs text-slate-400">Units ready to be borrowed</p>}
                  </div>
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

          {/* Right column — images */}
          <div>
            <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Section icon={ImagePlus} title="Images" description="Add photos to help identify the equipment.">
                <div className="space-y-4">

                  {/* Drop zone — previews render inside */}
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 text-center transition-all ${
                      isSubmitting
                        ? 'cursor-not-allowed opacity-60'
                        : dragOver
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40'
                    } ${imagePreviews.length > 0 ? 'py-4' : 'py-10'}`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-sm font-medium text-slate-600">Uploading images...</p>
                      </>
                    ) : imagePreviews.length > 0 ? (
                      <div className="w-full space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="group relative overflow-hidden rounded-xl border border-slate-200" style={{ aspectRatio: '1 / 1' }}>
                              {failedImages.has(index) ? (
                                <div className="flex h-full w-full items-center justify-center bg-slate-100">
                                  <Package className="h-6 w-6 text-slate-300" />
                                </div>
                              ) : (
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="h-full w-full object-cover"
                                  onError={() => setFailedImages((prev) => new Set(prev).add(index))}
                                />
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); removeImage(index); }}
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
                        <p className="text-xs text-slate-400">Remove image to upload a different one</p>
                      </div>
                    ) : (
                      <>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${dragOver ? 'bg-blue-100' : 'bg-white'} border border-slate-200`}>
                          <Upload className={`h-5 w-5 ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            {dragOver ? 'Drop to upload' : 'Drag & drop image'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">or click to browse — one image only</p>
                        </div>
                        <p className="text-xs text-slate-400">PNG, JPG, GIF, WEBP, SVG</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/avif,image/svg+xml"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                  </label>

                  {/* URL input — disabled when image already selected */}
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={urlInput}
                      onChange={handleUrlChange}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commitUrlInput())}
                      placeholder={imagePreviews.length > 0 ? 'Remove image to use a URL instead' : 'Paste image URL — preview auto-adds...'}
                      className="h-9 pl-8 text-xs"
                      disabled={isSubmitting || imagePreviews.length > 0}
                    />
                  </div>

                </div>
              </Section>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="a-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/inventory')} disabled={isSubmitting}>
                  Discard
                </button>
                <button type="button" className="a-btn primary" style={{ flex: 1, justifyContent: 'center' }} disabled={!formData.name.trim() || isSubmitting} onClick={handleSubmit}>
                  {uploading ? <><Loader2 style={{ width: 14, height: 14 }} /> Uploading...</>
                    : createMutation.isPending ? <><Loader2 style={{ width: 14, height: 14 }} /> Saving...</>
                    : <><Plus style={{ width: 14, height: 14 }} /> Save Equipment</>}
                </button>
              </div>
            </div>
          </div>

        </div>{/* /two-column */}

        {/* ── Error ── */}
        {(formError || createMutation.isError) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, border: '1px solid var(--a-bad)', background: 'var(--a-bad-bg)', padding: '14px 18px' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--a-bad)', flexShrink: 0, marginTop: 1 }}>!</span>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--a-bad)', margin: 0, lineHeight: 1.5 }}>
              {formError || createMutation.error?.message || 'Something went wrong. Please try again.'}
            </p>
          </div>
        )}

      </form>

      {/* ── Image Limit Warning Modal ── */}
      {showImageLimitModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 384 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#ef4444', flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>Image Limit Reached</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                Only <strong>one image</strong> is allowed per equipment. Remove the current image first before uploading a new one.
              </p>
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="a-btn" onClick={() => setShowImageLimitModal(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {addSuccess && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 384 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 style={{ width: 16, height: 16, color: '#22c55e', flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>Equipment Added</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: '#0f172a' }}>{savedName}</strong> has been added to the inventory successfully.
              </p>
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="a-btn"
                onClick={() => {
                  setAddSuccess(false);
                  setFormData(initialForm);
                  setImageFiles([]);
                  setImagePreviews([]);
                  setFailedImages(new Set());
                  createMutation.reset();
                }}>
                <Plus style={{ width: 13, height: 13 }} /> Add Another
              </button>
              <button className="a-btn gold" onClick={() => navigate('/inventory')}>
                Back to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
