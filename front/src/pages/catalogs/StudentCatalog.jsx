import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { Loader2, Package, ChevronLeft, ChevronRight } from 'lucide-react';

import { api } from '@/api/apiClient';
import { useAuth } from '@/components/hooks/useAuth.js';
import EquipmentViewModal from '@/components/equipment/EquipmentViewModal';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import CatalogContent from './CatalogContent';
import { useCatalogData } from './useCatalogData';
import { useTheme } from '@/components/hooks/ThemeContext';

const getDefaultBorrowForm = () => ({
  quantity: '1',
  purpose: '',
  borrow_date: format(new Date(), 'yyyy-MM-dd'),
  return_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  agree_policy: false,
});

export default function StudentCatalog() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [viewedEquipment, setViewedEquipment] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPhase, setSuccessPhase] = useState(0); // 0 = check only, 1 = check moved + text shown
  const [borrowForm, setBorrowForm] = useState(getDefaultBorrowForm());
  const [borrowImgIdx, setBorrowImgIdx] = useState(0);
  const [borrowQuantityNotice, setBorrowQuantityNotice] = useState('');
  const [borrowDateNotice, setBorrowDateNotice] = useState('');

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

  // Fetch the student's own requests to know which equipment is already pending/active
  const { data: myRequests = [] } = useQuery({
    queryKey: ['borrowRequests'],
    queryFn: () => api.entities.BorrowRequest.myRequests(),
    enabled: user?.role === 'student',
  });

  // Track per-equipment request state so borrowed items aren't shown as pending.
  const equipmentRequestStateMap = myRequests.reduce((acc, request) => {
    const equipmentId = request.equipment?._id || request.equipment?.id || request.equipment;
    if (!equipmentId) return acc;
    if (request.status === 'rejected' || request.status === 'returned') return acc;

    const currentState = acc.get(equipmentId) || 'none';
    if (request.status === 'borrowed') {
      acc.set(equipmentId, 'borrowed');
      return acc;
    }

    if (currentState !== 'borrowed') {
      acc.set(equipmentId, 'pending');
    }
    return acc;
  }, new Map());

  const pendingEquipmentIds = new Set(equipmentRequestStateMap.keys());

  const createRequestMutation = useMutation({
    mutationFn: (data) => api.entities.BorrowRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      setSelectedEquipment(null);
      setSuccessPhase(0);
      setShowSuccessModal(true);
      setBorrowForm(getDefaultBorrowForm());
      setTimeout(() => setSuccessPhase(1), 1400);
    },
  });

  const handleBorrowSubmit = () => {
    if (!selectedEquipment) {
      return;
    }

    const availableQty = Number(selectedEquipment.available_quantity ?? 0);
    const parsedQuantity = Number.parseInt(String(borrowForm.quantity), 10);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      setBorrowQuantityNotice('Please enter a valid quantity (minimum 1).');
      return;
    }

    if (parsedQuantity > availableQty) {
      setBorrowQuantityNotice(`Quantity exceeded. Only ${availableQty} item${availableQty === 1 ? '' : 's'} available.`);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const borrowDate = new Date(borrowForm.borrow_date);
    const returnDate = new Date(borrowForm.return_date);

    if (Number.isNaN(borrowDate.getTime()) || Number.isNaN(returnDate.getTime())) {
      setBorrowDateNotice('Please select valid borrow and return dates.');
      return;
    }

    borrowDate.setHours(0, 0, 0, 0);
    returnDate.setHours(0, 0, 0, 0);

    if (borrowDate < today) {
      setBorrowDateNotice('Borrow date cannot be yesterday or earlier.');
      return;
    }

    if (returnDate <= borrowDate) {
      setBorrowDateNotice('Return date must be after borrow date.');
      return;
    }

    setBorrowDateNotice('');

    createRequestMutation.mutate({
      equipment: selectedEquipment.id,
      ...borrowForm,
      quantity: parsedQuantity,
    });
  };

  const closeBorrowDialog = () => {
    setSelectedEquipment(null);
    setBorrowImgIdx(0);
    setBorrowForm(getDefaultBorrowForm());
    setBorrowQuantityNotice('');
    setBorrowDateNotice('');
  };

  const handleViewEquipmentBorrow = (equipment) => {
    if (pendingEquipmentIds.has(equipment._id || equipment.id)) return;
    setViewedEquipment(null);
    setBorrowImgIdx(0);
    setSelectedEquipment(equipment);
    setBorrowForm(getDefaultBorrowForm());
    setBorrowQuantityNotice('');
    setBorrowDateNotice('');
  };

  const selectedAvailableQty = Number(selectedEquipment?.available_quantity ?? 0);
  const parsedBorrowQuantity = Number.parseInt(String(borrowForm.quantity), 10);
  const isBorrowQuantityInvalid = !Number.isFinite(parsedBorrowQuantity) || parsedBorrowQuantity < 1;
  const isBorrowQuantityExceeded = Number.isFinite(parsedBorrowQuantity) && parsedBorrowQuantity > selectedAvailableQty;
  const isBorrowDateInvalid = (() => {
    if (!borrowForm.borrow_date || !borrowForm.return_date) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const borrowDate = new Date(borrowForm.borrow_date);
    const returnDate = new Date(borrowForm.return_date);
    if (Number.isNaN(borrowDate.getTime()) || Number.isNaN(returnDate.getTime())) return true;

    borrowDate.setHours(0, 0, 0, 0);
    returnDate.setHours(0, 0, 0, 0);
    return borrowDate < today || returnDate <= borrowDate;
  })();
  const todayIso = format(new Date(), 'yyyy-MM-dd');

  // Auto-advance image carousel in borrow dialog
  useEffect(() => {
    if (!selectedEquipment) return;
    const imgs = selectedEquipment.images_urls?.length > 0
      ? selectedEquipment.images_urls
      : selectedEquipment.image_url ? [selectedEquipment.image_url] : [];
    if (imgs.length <= 1) return;
    const id = setInterval(() => setBorrowImgIdx(i => i === imgs.length - 1 ? 0 : i + 1), 3200);
    return () => clearInterval(id);
  }, [selectedEquipment]);

  const catalogStyles = `
    @keyframes cat-fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .cat-fade-up { opacity: 0; animation: cat-fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
    .cat-fade-1  { animation-delay: 0.04s; }
    .cat-fade-2  { animation-delay: 0.12s; }

    @keyframes catHeroGlow {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50%       { opacity: 1;   transform: scale(1.08); }
    }
    .cat-orb   { animation: catHeroGlow 6s ease-in-out infinite; }
    .cat-orb-2 { animation: catHeroGlow 8s ease-in-out infinite reverse; }

    .cat-dark .cat-hero-banner {
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 45%, #3730a3 100%) !important;
    }

    @keyframes borrow-enter {
      from { opacity: 0; transform: scale(0.97) translateY(10px); }
      to   { opacity: 1; transform: scale(1)    translateY(0);    }
    }
    @keyframes borrow-img-fade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .borrow-enter   { animation: borrow-enter    0.28s cubic-bezier(0.16,1,0.3,1) both; }
    .borrow-img-in  { animation: borrow-img-fade 0.22s ease both; }

    .borrow-cancel {
      flex: 1;
      height: 2rem;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.06);
      color: #94a3b8;
      transition: background 0.15s, color 0.15s;
      cursor: pointer;
    }
    .borrow-cancel:hover {
      background: rgba(255,255,255,0.12);
      color: #e2e8f0;
    }
  `;

  return (
    <>
      <div className={`space-y-2 ${isDark ? 'cat-dark' : ''}`}>
        <style>{catalogStyles}</style>

        {/* ── HERO BANNER ─────────────────────────────────────────── */}
        <div className="cat-fade-up cat-fade-1 cat-hero-banner relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 shadow-xl">
          <div className="cat-orb   absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="cat-orb-2 absolute -bottom-14 -left-8  w-44 h-44 rounded-full bg-indigo-400/20 pointer-events-none" />
          <div className="absolute top-4 right-28 w-2.5 h-2.5 rounded-full bg-white/30 pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest mb-1">Laboratory Management</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">Equipment Catalog</h1>
              <p className="text-blue-200 text-sm mt-1.5 max-w-sm">
                Browse and borrow available laboratory equipment for your sessions.
              </p>
            </div>

            {/* Quick stat pills */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Total',     value: isLoading ? '—' : filteredEquipment.length },
                { label: 'Available', value: isLoading ? '—' : filteredEquipment.filter(e => (e.available_quantity ?? e.available ?? 0) > 0).length },
              ].map(s => (
                <div key={s.label} className={`rounded-xl px-3 py-2 text-center min-w-[60px] border shadow-sm ${isDark ? 'bg-[#0d0d14] border-white/[0.08]' : 'bg-white/20 backdrop-blur-sm border-white/20'}`}>
                  <p className={`text-lg font-black leading-none ${isDark ? 'text-blue-400' : 'text-white'}`}>{s.value}</p>
                  <p className={`text-[9px] font-semibold uppercase tracking-wide mt-0.5 ${isDark ? 'text-slate-500' : 'text-blue-200'}`}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CATALOG CONTENT ─────────────────────────────────────── */}
        <div className="cat-fade-up cat-fade-2">
          <CatalogContent
            header={{
              eyebrow: 'Equipment Catalog',
              title: 'Equipment Catalog',
              description: 'Browse and borrow available laboratory equipment.',
            }}
            hideHeader
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
            onBorrow={(eq) => { if (!pendingEquipmentIds.has(eq._id || eq.id)) setSelectedEquipment(eq); }}
            pendingEquipmentIds={pendingEquipmentIds}
            equipmentRequestStateMap={equipmentRequestStateMap}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Equipment View Modal */}
      {user?.role === 'student' && (
        <EquipmentViewModal
          equipment={viewedEquipment}
          open={!!viewedEquipment}
          onClose={() => setViewedEquipment(null)}
          onBorrow={handleViewEquipmentBorrow}
          isPending={viewedEquipment ? pendingEquipmentIds.has(viewedEquipment._id || viewedEquipment.id) : false}
          borrowState={viewedEquipment ? (equipmentRequestStateMap.get(viewedEquipment._id || viewedEquipment.id) || 'none') : 'none'}
          isDark={isDark}
        />
      )}

      {/* Borrow Dialog */}
      {user?.role === 'student' && (
        <Dialog open={!!selectedEquipment} onOpenChange={closeBorrowDialog}>
          <DialogContent
            className={`p-0 gap-0 overflow-hidden rounded-2xl border ${isDark ? 'bg-[#0e0e16] border-white/[0.08]' : 'bg-white border-slate-200'}`}
            style={{
              width: '90vw',
              maxWidth: 440,
              maxHeight: 'min(90dvh, 620px)',
              padding: 0,
              boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.85)' : '0 24px 64px rgba(0,0,0,0.16)',
            }}
          >
            {/* borrow-enter triggers the open animation via catalogStyles */}
            <div className="borrow-enter flex flex-col overflow-hidden">

              {/* ── TOP: Image panel ──────────────────────────────────── */}
              <div className="relative flex-shrink-0 overflow-hidden h-[160px]">
                {(() => {
                  const allImgs = selectedEquipment?.images_urls?.length > 0
                    ? selectedEquipment.images_urls
                    : selectedEquipment?.image_url ? [selectedEquipment.image_url] : [];
                  const hasMany = allImgs.length > 1;
                  const curImg  = allImgs[borrowImgIdx] ?? null;
                  return (
                    <>
                      {curImg ? (
                        <img
                          key={borrowImgIdx}
                          src={curImg}
                          alt={selectedEquipment?.name}
                          className="borrow-img-in w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center gap-3"
                          style={{
                            background: isDark
                              ? 'linear-gradient(160deg,#0d1117 0%,#111827 100%)'
                              : 'linear-gradient(160deg,#eff6ff 0%,#f8fafc 100%)',
                          }}
                        >
                          <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(59,130,246,0.08)',
                              border:     isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(59,130,246,0.14)',
                            }}
                          >
                            <Package className="w-9 h-9" style={{ color: isDark ? '#334155' : '#93c5fd' }} />
                          </div>
                          <span className="text-[11px] font-medium" style={{ color: isDark ? '#334155' : '#94a3b8' }}>
                            No image
                          </span>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: isDark
                            ? 'linear-gradient(to top, rgba(14,14,22,0.97) 0%, rgba(14,14,22,0.45) 42%, rgba(14,14,22,0.14) 100%)'
                            : 'linear-gradient(to top, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.40) 42%, transparent 100%)',
                        }}
                      />

                      {/* Category badge */}
                      {selectedEquipment?.category && (
                        <span
                          className="absolute top-4 left-4 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                          style={{
                            background:     isDark ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.92)',
                            border:         isDark ? '1px solid rgba(59,130,246,0.35)' : '1px solid rgba(59,130,246,0.20)',
                            color:          isDark ? '#93c5fd' : '#2563eb',
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          {selectedEquipment.category}
                        </span>
                      )}

                      {/* Prev / Next arrows */}
                      {hasMany && (
                        <>
                          <button
                            onClick={() => setBorrowImgIdx(i => i === 0 ? allImgs.length - 1 : i - 1)}
                            aria-label="Previous image"
                            className="absolute left-2 top-[40%] -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
                            style={{ background: 'rgba(0,0,0,0.48)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', backdropFilter: 'blur(6px)' }}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setBorrowImgIdx(i => i === allImgs.length - 1 ? 0 : i + 1)}
                            aria-label="Next image"
                            className="absolute right-2 top-[40%] -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
                            style={{ background: 'rgba(0,0,0,0.48)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', backdropFilter: 'blur(6px)' }}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* Dot indicators */}
                      {hasMany && (
                        <div className="absolute bottom-[120px] left-1/2 -translate-x-1/2 flex gap-1.5">
                          {allImgs.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setBorrowImgIdx(i)}
                              aria-label={`Image ${i + 1}`}
                              className="rounded-full transition-all"
                              style={{
                                width:      i === borrowImgIdx ? '1.1rem' : '0.35rem',
                                height:     '0.35rem',
                                background: i === borrowImgIdx ? '#3b82f6' : 'rgba(255,255,255,0.45)',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-5">
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5"
                    style={{ color: isDark ? '#475569' : '#94a3b8' }}
                  >
                    Borrow Request
                  </p>
                  <h3
                    className="text-[15px] font-bold leading-snug mb-3"
                    style={{
                      color: isDark ? '#f1f5f9' : '#0f172a',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {selectedEquipment?.name}
                  </h3>

                  {/* Availability pill */}
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background:
                          (selectedEquipment?.available_quantity ?? 0) === 0 ? '#ef4444' :
                          (selectedEquipment?.available_quantity ?? 0) <= 3 ? '#f59e0b' : '#22c55e',
                        boxShadow:
                          (selectedEquipment?.available_quantity ?? 0) === 0 ? '0 0 5px #ef444499' :
                          (selectedEquipment?.available_quantity ?? 0) <= 3 ? '0 0 5px #f59e0b99' : '0 0 5px #22c55e99',
                      }}
                    />
                    <span
                      className="text-[10px] font-semibold tabular-nums"
                      style={{ color: isDark ? '#94a3b8' : '#475569' }}
                    >
                      {selectedEquipment?.available_quantity ?? 0} available
                    </span>
                  </div>
                </div>
              </div>

              {/* ── BOTTOM/RIGHT: Form panel ──────────────────────────────── */}
              <div
                className={`flex flex-col flex-1 min-h-0 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}
                style={{ background: isDark ? '#111118' : '#ffffff' }}
              >
                {/* Header bar */}
                <div
                  className="flex items-center justify-between px-5 py-3 flex-shrink-0"
                  style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9' }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                      Equipment Request
                    </p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                      Fill in the borrow details
                    </p>
                  </div>
                </div>

                {/* Form fields */}
                <div className="px-5 py-3 space-y-2.5">

                  {/* Qty row */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                      Quantity
                      <span className="ml-1.5 font-normal normal-case" style={{ color: isDark ? '#475569' : '#cbd5e1' }}>
                        (max {selectedEquipment?.available_quantity})
                      </span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={borrowForm.quantity}
                      onChange={(e) => {
                        const nextQuantity = e.target.value;
                        setBorrowForm({ ...borrowForm, quantity: nextQuantity });

                        const parsedQuantity = Number.parseInt(nextQuantity, 10);
                        if (nextQuantity === '') {
                          setBorrowQuantityNotice('Please enter a quantity.');
                          return;
                        }

                        if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
                          setBorrowQuantityNotice('Please enter a valid quantity (minimum 1).');
                          return;
                        }

                        if (parsedQuantity > Number(selectedEquipment?.available_quantity ?? 0)) {
                          const availableQty = Number(selectedEquipment?.available_quantity ?? 0);
                          setBorrowQuantityNotice(`Quantity exceeded. Only ${availableQty} item${availableQty === 1 ? '' : 's'} available.`);
                          return;
                        }

                        setBorrowQuantityNotice('');
                      }}
                      className={`rounded-lg text-xs font-semibold h-8 w-full ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500' : 'border-slate-200 focus:border-blue-400'}`}
                      style={isDark ? { color: '#e2e8f0' } : undefined}
                    />
                    {(borrowQuantityNotice || isBorrowQuantityExceeded) && (
                      <p className="text-[11px] font-medium" style={{ color: '#ef4444' }}>
                        {borrowQuantityNotice || `Quantity exceeded. Only ${selectedAvailableQty} item${selectedAvailableQty === 1 ? '' : 's'} available.`}
                      </p>
                    )}
                  </div>

                  {/* Dates row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                        Borrow Date
                      </Label>
                      <Input
                        type="date"
                        min={todayIso}
                        value={borrowForm.borrow_date}
                        onChange={(e) => {
                          setBorrowDateNotice('');
                          setBorrowForm({ ...borrowForm, borrow_date: e.target.value });
                        }}
                        className={`rounded-lg text-xs font-medium h-8 w-full ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500' : 'border-slate-200 focus:border-blue-400'}`}
                        style={isDark ? { color: '#e2e8f0', colorScheme: 'dark' } : { colorScheme: 'light' }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                        Return Date
                      </Label>
                      <Input
                        type="date"
                        min={borrowForm.borrow_date || todayIso}
                        value={borrowForm.return_date}
                        onChange={(e) => {
                          setBorrowDateNotice('');
                          setBorrowForm({ ...borrowForm, return_date: e.target.value });
                        }}
                        className={`rounded-lg text-xs font-medium h-8 w-full ${isDark ? 'bg-white/5 border-white/10 focus:border-blue-500' : 'border-slate-200 focus:border-blue-400'}`}
                        style={isDark ? { color: '#e2e8f0', colorScheme: 'dark' } : { colorScheme: 'light' }}
                      />
                    </div>
                  </div>
                  {borrowDateNotice && (
                    <p className="text-[11px] font-medium" style={{ color: '#ef4444' }}>
                      {borrowDateNotice}
                    </p>
                  )}

                  {/* Purpose */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                      Purpose
                    </Label>
                    <Textarea
                      placeholder="Briefly explain why you need this equipment..."
                      value={borrowForm.purpose}
                      onChange={(e) => setBorrowForm({ ...borrowForm, purpose: e.target.value })}
                      rows={2}
                      className={`rounded-lg text-xs resize-none font-medium ${isDark ? 'bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-blue-500' : 'border-slate-200 placeholder:text-slate-400 focus:border-blue-400'}`}
                    />
                  </div>

                  {/* Policy (compact) */}
                  <div
                    className="rounded-xl px-3 py-2"
                    style={{
                      background: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb',
                      border: isDark ? '1px solid rgba(245,158,11,0.20)' : '1px solid #fde68a',
                    }}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border-amber-400 text-amber-500 focus:ring-amber-500"
                        checked={borrowForm.agree_policy}
                        onChange={(e) => setBorrowForm({ ...borrowForm, agree_policy: e.target.checked })}
                      />
                      <span
                        className="text-[11px] leading-relaxed"
                        style={{ color: isDark ? '#fcd34d' : '#92400e' }}
                      >
                        <span className="font-bold">Policy: </span>
                        Damaged or lost items must be replaced by the borrower. I understand and accept this responsibility.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Footer buttons */}
                <div
                  className="flex gap-2 px-5 py-3 flex-shrink-0"
                  style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9' }}
                >
                  {isDark ? (
                    <button onClick={closeBorrowDialog} className="borrow-cancel">
                      Cancel
                    </button>
                  ) : (
                    <Button
                      onClick={closeBorrowDialog}
                      className="flex-1 h-8 rounded-lg text-xs font-semibold border bg-slate-50 border-slate-200 !text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={handleBorrowSubmit}
                    disabled={createRequestMutation.isPending || !borrowForm.purpose || !borrowForm.agree_policy || selectedAvailableQty < 1 || isBorrowQuantityInvalid || isBorrowQuantityExceeded || isBorrowDateInvalid}
                    className={`flex-[2] h-8 rounded-lg text-white text-xs font-semibold transition-all disabled:opacity-35 ${isDark ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_4px_20px_rgba(59,130,246,0.35)]' : 'bg-slate-900 hover:bg-blue-600 shadow-[0_4px_16px_rgba(0,0,0,0.18)]'}`}
                  >
                    {createRequestMutation.isPending ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Submitting...</>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </div>
              </div>

            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={(v) => { setShowSuccessModal(v); if (!v) setSuccessPhase(0); }}>
        <AlertDialogContent
          className={`rounded-2xl shadow-2xl max-w-xs overflow-hidden p-0 ${isDark ? 'bg-[#111118] border-white/10' : 'bg-white border-slate-200'}`}
          style={{ minHeight: 300 }}
        >
          <style>{`
            /* ── check draw ── */
            @keyframes lms2-fill { from { opacity:0; transform:scale(0.4); } to { opacity:1; transform:scale(1); } }
            @keyframes lms2-ring  { from { stroke-dashoffset:201; } to { stroke-dashoffset:0; } }
            @keyframes lms2-tick  { from { stroke-dashoffset:50;  opacity:0; } to { stroke-dashoffset:0; opacity:1; } }
            /* ── phase 1: check settles in from above ── */
            @keyframes lms2-rise  {
              from { opacity: 0; transform: translateY(-18px) scale(1.15); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            /* ── text fades up in ── */
            @keyframes lms2-text-in {
              from { opacity:0; transform:translateY(18px); }
              to   { opacity:1; transform:translateY(0); }
            }
            .lms2-check-wrap {
              animation: lms2-fill 0.4s cubic-bezier(0.16,1,0.3,1) 0.05s both;
            }
            .lms2-check-wrap.risen {
              animation: lms2-rise 0.55s cubic-bezier(0.16,1,0.3,1) both;
            }
            .lms2-ring {
              stroke-dasharray: 201;
              stroke-dashoffset: 201;
              animation: lms2-ring 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s both;
            }
            .lms2-tick {
              stroke-dasharray: 50;
              stroke-dashoffset: 50;
              animation: lms2-tick 0.4s cubic-bezier(0.16,1,0.3,1) 0.85s both;
            }
            .lms2-text {
              animation: lms2-text-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both;
            }
          `}</style>

          {/* ── phase 0: check centered, fills the modal ── */}
          {successPhase === 0 && (
            <div className="flex items-center justify-center" style={{ height: 300 }}>
              <div className="lms2-check-wrap">
                <svg viewBox="0 0 72 72" width="120" height="120" fill="none">
                  <circle cx="36" cy="36" r="32" fill={isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.10)'} />
                  <circle className="lms2-ring" cx="36" cy="36" r="32" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <polyline className="lms2-tick" points="21,36 31,46 51,26" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          )}

          {/* ── phase 1: check at top + text + button ── */}
          {successPhase === 1 && (
            <div className="flex flex-col items-center pt-6 pb-6 px-6 gap-0">
              {/* check — risen position (smaller, top) */}
              <div className="lms2-check-wrap risen" style={{ marginBottom: 8 }}>
                <svg viewBox="0 0 72 72" width="80" height="80" fill="none">
                  <circle cx="36" cy="36" r="32" fill={isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.10)'} />
                  <circle cx="36" cy="36" r="32" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <polyline points="21,36 31,46 51,26" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {/* text */}
              <div className="lms2-text text-center mt-2">
                <p className={`text-lg font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  Request Submitted
                </p>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Your borrow request is pending lecturer approval. Track its status on the Requests page.
                </p>
              </div>

              {/* button */}
              <div className="lms2-text w-full mt-5" style={{ animationDelay: '0.2s' }}>
                <Button
                  onClick={() => { setShowSuccessModal(false); setSuccessPhase(0); }}
                  className={`w-full rounded-xl h-10 text-white text-sm font-semibold transition-colors ${
                    isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-900 hover:bg-blue-700'
                  }`}
                >
                  Got it
                </Button>
              </div>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
