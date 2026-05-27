import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Package, ArrowRight, Search, SlidersHorizontal, X,
} from 'lucide-react';

import { api } from '@/api/apiClient';
import { useAuth } from '@/components/hooks/useAuth.js';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import EquipmentViewModal from '@/components/equipment/EquipmentViewModal';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import BorrowRequestPreviewModal from '@/components/BorrowRequestPreviewModal';
import { useCatalogData } from './useCatalogData';
import { useTheme } from '@/components/hooks/ThemeContext';
import { useLang } from '@/components/i18n/LangContext';

const getDefaultBorrowForm = () => ({
  quantity: '',
  purpose: '',
  objective: '',
  borrow_date: format(new Date(), 'yyyy-MM-dd'),
  return_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
  lecturer_id: '',
  agree_policy: false,
});

export default function StudentCatalog() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { t, lang } = useLang();
  const [viewedEquipment, setViewedEquipment] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPhase, setSuccessPhase] = useState(0);
  const [borrowForm, setBorrowForm] = useState(getDefaultBorrowForm());
  const [borrowImgIdx, setBorrowImgIdx] = useState(0);
  const [borrowQuantityNotice, setBorrowQuantityNotice] = useState('');
  const [borrowDateNotice, setBorrowDateNotice] = useState('');
  const [borrowLecturerNotice, setBorrowLecturerNotice] = useState('');
  const [submitError, setSubmitError] = useState('');

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

  const { data: myRequests = [] } = useQuery({
    queryKey: ['borrowRequests'],
    queryFn: () => api.entities.BorrowRequest.myRequests(),
    enabled: user?.role === 'student',
  });

  const {
    data: lecturers = [],
    isLoading: lecturersLoading,
    isError: lecturersError,
  } = useQuery({
    queryKey: ['lecturerList'],
    queryFn: () => api.entities.User.byRole('lecturer'),
    enabled: user?.role === 'student',
  });

  const equipmentRequestStateMap = myRequests.reduce((acc, request) => {
    const equipmentId = request.equipment?._id || request.equipment?.id || request.equipment;
    if (!equipmentId) return acc;
    if (request.status === 'rejected') return acc;
    // Returned but student still needs to bring replacement → show for_replacement badge
    if (request.status === 'returned') {
      if (request.student_will_replace && !request.replacement_completed) {
        const currentState = acc.get(equipmentId) || 'none';
        if (!['borrowed', 'for_replacement'].includes(currentState)) {
          acc.set(equipmentId, 'for_replacement');
        }
      }
      return acc;
    }
    const currentState = acc.get(equipmentId) || 'none';
    if (request.status === 'borrowed') { acc.set(equipmentId, 'borrowed'); return acc; }
    if (!['borrowed', 'for_replacement'].includes(currentState)) { acc.set(equipmentId, 'pending'); }
    return acc;
  }, new Map());

  const pendingEquipmentIds = new Set(equipmentRequestStateMap.keys());

  const createRequestMutation = useMutation({
    mutationFn: (data) => api.entities.BorrowRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borrowRequests'] });
      setSelectedEquipment(null);
      setShowPreview(false);
      setSubmitError('');
      setSuccessPhase(0);
      setShowSuccessModal(true);
      setBorrowForm(getDefaultBorrowForm());
      setTimeout(() => setSuccessPhase(1), 1400);
    },
    onError: (err) => {
      const msg = err?.message || 'Failed to submit request. Please try again.';
      setSubmitError(msg);
      toast.error(msg);
    },
  });

  const handleBorrowSubmit = () => {
    if (!selectedEquipment) return;
    const availableQty = Number(selectedEquipment.available_quantity ?? 0);
    const parsedQuantity = Number.parseInt(String(borrowForm.quantity), 10);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) { setBorrowQuantityNotice(t('pleaseEnterValidQuantity')); return; }
    if (parsedQuantity > 10000) { setBorrowQuantityNotice(t('sdMaxQuantity')); return; }
    if (parsedQuantity > availableQty) { setBorrowQuantityNotice(t('quantityExceededShort')); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const borrowDate = new Date(borrowForm.borrow_date);
    const returnDate = new Date(borrowForm.return_date);
    if (Number.isNaN(borrowDate.getTime()) || Number.isNaN(returnDate.getTime())) { setBorrowDateNotice(t('pleaseSelectValidDates')); return; }
    borrowDate.setHours(0, 0, 0, 0); returnDate.setHours(0, 0, 0, 0);
    if (borrowDate < today) { setBorrowDateNotice(t('borrowDateCantBePast')); return; }
    if (returnDate < borrowDate) { setBorrowDateNotice(t('returnDateMustBeAfter')); return; }
    setBorrowDateNotice(''); setBorrowQuantityNotice('');
    setShowPreview(true);
  };

  const handleConfirmSubmit = () => {
    if (!selectedEquipment) return;
    const parsedQuantity = Number.parseInt(String(borrowForm.quantity), 10);
    createRequestMutation.mutate({
      equipment: selectedEquipment.id,
      ...borrowForm,
      objective: borrowForm.objective || borrowForm.purpose,
      purpose:   borrowForm.purpose   || borrowForm.objective,
      quantity:  parsedQuantity,
    });
  };

  const closeBorrowDialog = () => {
    setSelectedEquipment(null); setBorrowImgIdx(0); setBorrowForm(getDefaultBorrowForm());
    setBorrowQuantityNotice(''); setBorrowDateNotice(''); setBorrowLecturerNotice(''); setSubmitError('');
  };

  const handleViewEquipmentBorrow = (equipment) => {
    const state = equipmentRequestStateMap.get(equipment._id || equipment.id);
    if (state && state !== 'for_replacement') return;
    setViewedEquipment(null); setBorrowImgIdx(0); setSelectedEquipment(equipment);
    setBorrowForm(getDefaultBorrowForm()); setBorrowQuantityNotice(''); setBorrowDateNotice(''); setBorrowLecturerNotice('');
  };

  const selectedAvailableQty = Number(selectedEquipment?.available_quantity ?? 0);
  const parsedBorrowQuantity = Number.parseInt(String(borrowForm.quantity), 10);
  const isBorrowQuantityInvalid = !Number.isFinite(parsedBorrowQuantity) || parsedBorrowQuantity < 1;
  const isBorrowQuantityExceeded = Number.isFinite(parsedBorrowQuantity) && (parsedBorrowQuantity > selectedAvailableQty || parsedBorrowQuantity > 10000);
  const isBorrowDateInvalid = (() => {
    if (!borrowForm.borrow_date || !borrowForm.return_date) return true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const borrowDate = new Date(borrowForm.borrow_date);
    const returnDate = new Date(borrowForm.return_date);
    if (Number.isNaN(borrowDate.getTime()) || Number.isNaN(returnDate.getTime())) return true;
    borrowDate.setHours(0, 0, 0, 0); returnDate.setHours(0, 0, 0, 0);
    return borrowDate < today || returnDate < borrowDate;
  })();
  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const hasLecturers = lecturers.length > 0;

  useEffect(() => {
    const isOpen = !!selectedEquipment || !!viewedEquipment || showPreview || showSuccessModal;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedEquipment, viewedEquipment, showPreview, showSuccessModal]);

  useEffect(() => {
    if (!selectedEquipment) return;
    const imgs = selectedEquipment.images_urls?.length > 0
      ? selectedEquipment.images_urls
      : selectedEquipment.image_url ? [selectedEquipment.image_url] : [];
    if (imgs.length <= 1) return;
    const id = setInterval(() => setBorrowImgIdx(i => i === imgs.length - 1 ? 0 : i + 1), 3200);
    return () => clearInterval(id);
  }, [selectedEquipment]);

  // ── Theme tokens (mirrors StudentDashboard) ──────────────────────────────────
  const surface  = isDark ? 'glass-dark' : 'glass-light';
  const txt      = isDark ? 'text-white'      : 'text-slate-900';
  const txtsub   = isDark ? 'text-slate-400'  : 'text-slate-500';
  const txtmuted = isDark ? 'text-slate-500'  : 'text-slate-400';
  const divider  = isDark ? 'border-white/[0.07]' : 'border-white/50';

  const todayLabel = () =>
    new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).toUpperCase();

  const availableCount = filteredEquipment.filter(e => (e.available_quantity ?? e.available ?? 0) > 0).length;

  const catalogStyles = `
    @keyframes cat-fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .cat-fade { opacity: 0; animation: cat-fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
    .cat-d1 { animation-delay: 0.04s; }
    .cat-d2 { animation-delay: 0.10s; }
    .cat-d3 { animation-delay: 0.18s; }
    .cat-num { font-family: 'JetBrains Mono', monospace; }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .card-in { opacity: 0; animation: cardIn 0.32s ease forwards; }
    @keyframes borrow-enter {
      from { opacity: 0; transform: scale(0.97) translateY(10px); }
      to   { opacity: 1; transform: scale(1)    translateY(0);    }
    }
    @keyframes borrow-img-fade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .borrow-enter  { animation: borrow-enter    0.28s cubic-bezier(0.16,1,0.3,1) both; }
    .borrow-img-in { animation: borrow-img-fade 0.22s ease both; }
    input[type="date"]::-webkit-calendar-picker-indicator { margin-left: -10px; cursor: pointer; }
  `;

  return (
    <>
      <div className="space-y-4">
        <style>{catalogStyles}</style>

        {/* ── HEADER CARD ────────────────────────────────────────────────── */}
        <div className={`cat-fade cat-d1 rounded-2xl p-5 sm:p-6 ${surface}`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className={`text-[10px] font-semibold tracking-widest uppercase mb-2 ${txtmuted}`}>
                {todayLabel()}
              </p>
              <h1 className={`text-2xl sm:text-3xl font-bold leading-tight ${txt}`}>
                {t('equipmentCatalogTitle')}
              </h1>
              <p className={`text-sm mt-2 max-w-lg leading-relaxed ${txtsub}`}>
                {t('browseCatalogHeroDesc')}
              </p>
            </div>

            {!isLoading && (
              <div className="flex gap-2 shrink-0 sm:mt-1">
                {[
                  { label: t('total'),          value: filteredEquipment.length, color: '#3b82f6' },
                  { label: t('availableLabel'), value: availableCount,           color: '#22c55e' },
                ].map(s => (
                  <div
                    key={s.label}
                    className={`rounded-xl px-3.5 py-2.5 text-center min-w-[64px] border ${
                      isDark
                        ? 'bg-black/50 border-white/[0.09]'
                        : 'bg-white/70 border-slate-200'
                    }`}
                  >
                    <p className={`text-[9px] font-semibold uppercase tracking-widest ${txtmuted}`}>
                      {s.label}
                    </p>
                    <p className="cat-num text-[22px] font-black tabular-nums leading-tight mt-0.5" style={{ color: s.color }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── SEARCH + FILTER ────────────────────────────────────────────── */}
        <div className={`cat-fade cat-d2 rounded-2xl px-4 py-3 flex flex-col sm:flex-row gap-3 items-center ${surface}`}>
          <div className="relative flex-1 w-full">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              placeholder={t('sdSearchByNameDesc')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 h-10 rounded-xl border text-sm font-medium outline-none ${
                isDark
                  ? 'bg-white/[0.04] border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus:border-white/[0.20]'
                  : 'bg-white/60 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-slate-300'
              }`}
            />
          </div>
          <button
            type="button"
            onClick={() => setGroupByCategory(v => !v)}
            className={`inline-flex items-center gap-2 text-xs font-semibold px-4 h-10 rounded-xl border shrink-0 ${
              groupByCategory
                ? isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-blue-50 text-blue-700 border-blue-200'
                : isDark ? 'bg-white/[0.04] border-white/[0.08] text-slate-400' : 'bg-white/60 border-slate-200 text-slate-600'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {groupByCategory ? t('sdGroupedByCategory') : t('sdAllItems')}
          </button>
        </div>

        {/* ── EQUIPMENT GRID ─────────────────────────────────────────────── */}
        <div className="cat-fade cat-d3">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className={`h-8 w-8 animate-spin rounded-full border-4 border-t-blue-500 ${isDark ? 'border-white/10' : 'border-slate-200'}`} />
            </div>
          ) : isError ? (
            <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <Package className={`w-8 h-8 mb-3 ${txtmuted}`} />
              <p className={`text-sm font-semibold ${txtsub}`}>{t('unableLoadEquipment')}</p>
              <p className={`text-xs mt-1 ${txtmuted}`}>{error?.message || t('failedToConnect')}</p>
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <Package className={`w-8 h-8 mb-3 ${txtmuted}`} />
              <p className={`text-sm font-semibold ${txtsub}`}>{t('noEquipmentFound')}</p>
              <p className={`text-xs mt-1 ${txtmuted}`}>{t('tryAdjustingFilter')}</p>
            </div>
          ) : groupByCategory ? (
            <div className="space-y-6">
              {groupedCategories.map((cat, sectionIdx) => (
                <section key={cat} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className={`text-[10px] font-bold uppercase tracking-widest shrink-0 ${txtmuted}`}>{cat}</h2>
                    <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.07]' : 'bg-slate-200/80'}`} />
                    <span className={`text-[10px] font-semibold shrink-0 ${txtmuted}`}>
                      {groupedEquipment[cat].length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    {groupedEquipment[cat].map((item, idx) => (
                      <div
                        key={item.id}
                        className="card-in h-full"
                        style={{ animationDelay: `${0.05 + (sectionIdx * 10 + idx) * 0.03}s` }}
                      >
                        <EquipmentCard
                          equipment={item}
                          onSelect={setViewedEquipment}
                          onBorrow={(eq) => { const st = equipmentRequestStateMap.get(eq._id || eq.id); if (!st || st === 'for_replacement') setSelectedEquipment(eq); }}
                          userRole={user?.role}
                          isDark={isDark}
                          isPending={pendingEquipmentIds.has(item._id || item.id)}
                          borrowState={equipmentRequestStateMap.get(item._id || item.id) || 'none'}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {filteredEquipment.map((item, idx) => (
                <div
                  key={item.id}
                  className="card-in h-full"
                  style={{ animationDelay: `${0.05 + idx * 0.03}s` }}
                >
                  <EquipmentCard
                    equipment={item}
                    onSelect={setViewedEquipment}
                    onBorrow={(eq) => { const st = equipmentRequestStateMap.get(eq._id || eq.id); if (!st || st === 'for_replacement') setSelectedEquipment(eq); }}
                    userRole={user?.role}
                    isDark={isDark}
                    isPending={pendingEquipmentIds.has(item._id || item.id)}
                    borrowState={equipmentRequestStateMap.get(item._id || item.id) || 'none'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Equipment View Modal ─────────────────────────────────────────── */}
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

      {/* ── Borrow Dialog ───────────────────────────────────────────────── */}
      {user?.role === 'student' && (
        <Dialog open={!!selectedEquipment} onOpenChange={closeBorrowDialog}>
          <DialogContent
            hideCloseButton
            className={`p-0 gap-0 overflow-hidden rounded-2xl sm:max-w-[480px] border ${isDark ? 'bg-[#0e0e16] border-white/[0.07]' : 'bg-white border-slate-200/80'}`}
            style={{
              padding: 0,
              boxShadow: isDark
                ? '0 40px 100px rgba(0,0,0,0.90), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 24px 72px rgba(0,0,0,0.18)',
            }}
          >
            <div className="borrow-enter flex flex-col">

              {/* HEADER */}
              <div
                className="flex items-start gap-3 px-4 py-3.5 flex-shrink-0"
                style={{
                  borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #eef0f6',
                  background: isDark
                    ? 'linear-gradient(90deg, rgba(59,130,246,0.07) 0%, transparent 70%)'
                    : 'linear-gradient(90deg, rgba(59,130,246,0.04) 0%, transparent 70%)',
                }}
              >
                {(() => {
                  const allImgs = selectedEquipment?.images_urls?.length > 0
                    ? selectedEquipment.images_urls
                    : selectedEquipment?.image_url ? [selectedEquipment.image_url] : [];
                  const curImg = allImgs[0] ?? null;
                  return curImg ? (
                    <img
                      src={curImg}
                      alt={selectedEquipment?.name}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                      style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0f3460 0%, #0e4d6d 100%)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(59,130,246,0.20)' }}
                    >
                      <Package className="w-5 h-5" style={{ color: '#60a5fa' }} />
                    </div>
                  );
                })()}

                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: '#3b82f6' }}>
                    {t('equipmentRequest')}
                  </p>
                  <p className="text-[13px] font-bold leading-tight truncate" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                    {selectedEquipment?.name}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                    {selectedEquipment?.serialNumber && <span className="mr-2"># {selectedEquipment.serialNumber}</span>}
                    <span>{selectedEquipment?.available_quantity ?? 0} {t('availableLabel')}</span>
                  </p>
                </div>

                <button
                  onClick={closeBorrowDialog}
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: isDark ? '#94a3b8' : '#64748b' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* BODY */}
              <div className="px-4 py-4 space-y-4">

                {/* Quantity */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>{t('quantity')}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = Number.parseInt(String(borrowForm.quantity), 10);
                        if (!Number.isFinite(cur) || cur <= 1) return;
                        const next = cur - 1;
                        setBorrowForm({ ...borrowForm, quantity: String(next) });
                        if (next > Number(selectedEquipment?.available_quantity ?? 0)) { setBorrowQuantityNotice(t('quantityExceededShort')); return; }
                        setBorrowQuantityNotice('');
                      }}
                      className="w-10 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
                      style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', color: isDark ? '#94a3b8' : '#475569', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0' }}
                    >−</button>
                    <Input
                      type="number" min="1" max={Math.min(Number(selectedEquipment?.available_quantity ?? 0), 10000)}
                      inputMode="numeric" placeholder="--" value={borrowForm.quantity}
                      onKeyDown={(e) => { if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault(); }}
                      onChange={(e) => {
                        const nextQuantity = e.target.value.replace(/[^0-9]/g, '');
                        setBorrowForm({ ...borrowForm, quantity: nextQuantity });
                        const parsedQuantity = Number.parseInt(nextQuantity, 10);
                        if (nextQuantity === '') { setBorrowQuantityNotice(''); return; }
                        if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) { setBorrowQuantityNotice(t('pleaseEnterValidQuantity')); return; }
                        if (parsedQuantity > 10000) { setBorrowQuantityNotice(t('sdMaxQuantity')); return; }
                        if (parsedQuantity > Number(selectedEquipment?.available_quantity ?? 0)) { setBorrowQuantityNotice(t('quantityExceededShort')); return; }
                        setBorrowQuantityNotice('');
                      }}
                      className={`flex-1 h-12 rounded-xl text-lg font-bold text-center ${isDark ? 'bg-white/[0.04] border-white/10 focus:border-violet-500' : 'bg-white border-slate-200 focus:border-violet-400'}`}
                      style={isDark ? { color: '#e2e8f0' } : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = Number.parseInt(String(borrowForm.quantity), 10);
                        const maxQty = Math.min(Number(selectedEquipment?.available_quantity ?? 0), 10000);
                        const next = Number.isFinite(cur) ? Math.min(cur + 1, maxQty) : 1;
                        setBorrowForm({ ...borrowForm, quantity: String(next) });
                        if (next > Number(selectedEquipment?.available_quantity ?? 0)) { setBorrowQuantityNotice(t('quantityExceededShort')); return; }
                        setBorrowQuantityNotice('');
                      }}
                      className="w-10 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
                      style={{ background: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)', color: '#3b82f6', border: isDark ? '1px solid rgba(59,130,246,0.22)' : '1px solid rgba(59,130,246,0.18)' }}
                    >+</button>
                    <button
                      type="button"
                      onClick={() => {
                        const maxQty = Math.min(Number(selectedEquipment?.available_quantity ?? 0), 10000);
                        setBorrowForm({ ...borrowForm, quantity: String(maxQty) });
                        if (maxQty < 1) { setBorrowQuantityNotice(t('pleaseEnterValidQuantity')); return; }
                        setBorrowQuantityNotice('');
                      }}
                      className="h-12 px-3 rounded-xl flex-shrink-0 flex flex-col items-center justify-center"
                      style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0', minWidth: '2.75rem' }}
                    >
                      <span className="text-[9px] font-semibold uppercase tracking-wide leading-none" style={{ color: isDark ? '#475569' : '#94a3b8' }}>{t('maxLabel')}</span>
                      <span className="text-[11px] font-extrabold tabular-nums mt-0.5" style={{ color: isDark ? '#64748b' : '#64748b' }}>{selectedEquipment?.available_quantity ?? 0}</span>
                    </button>
                  </div>
                  {(borrowQuantityNotice || isBorrowQuantityExceeded) && (
                    <p className="text-[11px] font-medium mt-1.5" style={{ color: '#ef4444' }}>{borrowQuantityNotice || t('quantityExceededShort')}</p>
                  )}
                </div>

                {/* Borrow Period */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>{t('borrowDate')} — {t('returnDate')}</p>
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      type="date" min={todayIso} value={borrowForm.borrow_date}
                      onChange={(e) => { setBorrowDateNotice(''); setBorrowForm({ ...borrowForm, borrow_date: e.target.value }); }}
                      className={`flex-1 min-w-0 w-0 rounded-xl text-xs font-medium h-10 ${isDark ? 'bg-white/[0.04] border-white/10 focus:border-blue-500' : 'bg-white border-slate-200 focus:border-blue-400'}`}
                      style={isDark ? { color: '#e2e8f0', colorScheme: 'dark' } : { colorScheme: 'light' }}
                    />
                    <div className="flex-shrink-0 w-7 h-10 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(59,130,246,0.10)' : 'rgba(59,130,246,0.08)' }}>
                      <ArrowRight className="w-3 h-3" style={{ color: '#3b82f6' }} />
                    </div>
                    <Input
                      type="date" min={borrowForm.borrow_date || todayIso} value={borrowForm.return_date}
                      onChange={(e) => { setBorrowDateNotice(''); setBorrowForm({ ...borrowForm, return_date: e.target.value }); }}
                      className={`flex-1 min-w-0 w-0 rounded-xl text-xs font-medium h-10 ${isDark ? 'bg-white/[0.04] border-white/10 focus:border-blue-500' : 'bg-white border-slate-200 focus:border-blue-400'}`}
                      style={isDark ? { color: '#e2e8f0', colorScheme: 'dark' } : { colorScheme: 'light' }}
                    />
                  </div>
                  {(() => {
                    if (!borrowForm.borrow_date || !borrowForm.return_date) return null;
                    const d1 = new Date(borrowForm.borrow_date);
                    const d2 = new Date(borrowForm.return_date);
                    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return null;
                    const days = Math.round((d2 - d1) / 86400000);
                    if (days <= 0) return null;
                    return (
                      <p className="text-[10px] font-semibold mt-1.5 text-right" style={{ color: isDark ? '#3b82f6' : '#2563eb' }}>
                        {t('sdDuration')}: {days} {days === 1 ? t('sdDayLabel') : t('daysLabel')}
                      </p>
                    );
                  })()}
                  {borrowDateNotice && <p className="text-[11px] font-medium mt-1.5" style={{ color: '#ef4444' }}>{borrowDateNotice}</p>}
                </div>

                {/* Purpose */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>{t('objectivePurpose')}</p>
                  <Textarea
                    placeholder={t('brieflyExplainPurpose')}
                    value={borrowForm.purpose}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 500);
                      setBorrowForm({ ...borrowForm, purpose: val, objective: val });
                    }}
                    rows={3}
                    maxLength={500}
                    className={`rounded-xl text-xs resize-none font-medium w-full ${isDark ? 'bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-amber-500' : 'bg-white border-slate-200 placeholder:text-slate-400 focus:border-amber-400'}`}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10px]" style={{ color: isDark ? '#475569' : '#94a3b8' }}>{t('sdMinChars')}</p>
                    <p className="text-[10px] tabular-nums" style={{ color: isDark ? '#475569' : '#94a3b8' }}>{(borrowForm.purpose || '').length} / 500</p>
                  </div>
                </div>

                {/* Lecturer */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>{t('approvingLecturer')}</p>
                  <select
                    value={borrowForm.lecturer_id}
                    onChange={(e) => { setBorrowLecturerNotice(''); setBorrowForm({ ...borrowForm, lecturer_id: e.target.value }); }}
                    disabled={lecturersLoading || !hasLecturers}
                    className={`h-10 w-full rounded-xl border px-3 text-xs font-semibold outline-none focus:ring-1 transition-colors ${isDark ? 'bg-[#161624] border-white/10 text-slate-200 focus:border-green-500 focus:ring-green-500/20' : 'bg-white border-slate-200 text-slate-900 focus:border-green-400 focus:ring-green-400/20'} ${lecturersLoading || !hasLecturers ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={isDark ? { colorScheme: 'dark' } : { colorScheme: 'light' }}
                  >
                    <option value="" disabled>{lecturersLoading ? t('loadingLecturers') : t('selectLecturer')}</option>
                    {lecturers.map((lecturer) => (
                      <option key={lecturer.id} value={lecturer.id}>{lecturer.name}</option>
                    ))}
                  </select>
                  {lecturersError && <p className="text-[11px] font-medium mt-1.5" style={{ color: '#ef4444' }}>{t('unableLoadLecturers')}</p>}
                  {!lecturersError && !lecturersLoading && !hasLecturers && <p className="text-[11px] font-medium mt-1.5" style={{ color: '#ef4444' }}>{t('noLecturersAvailable')}</p>}
                  {borrowLecturerNotice && <p className="text-[11px] font-medium mt-1.5" style={{ color: '#ef4444' }}>{borrowLecturerNotice}</p>}
                </div>

                {/* Policy */}
                <label className="flex items-start gap-3 rounded-xl px-3.5 py-3 cursor-pointer" style={{ background: isDark ? 'rgba(245,158,11,0.07)' : '#fffbeb', border: isDark ? '1px solid rgba(245,158,11,0.18)' : '1px solid #fde68a' }}>
                  <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded border-amber-400 text-amber-500 focus:ring-amber-500 cursor-pointer" checked={borrowForm.agree_policy} onChange={(e) => setBorrowForm({ ...borrowForm, agree_policy: e.target.checked })} />
                  <div className="flex-1">
                    <p className="text-[11px] font-bold leading-none mb-1" style={{ color: isDark ? '#fbbf24' : '#92400e' }}>{t('policyLabel')}</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: isDark ? '#b45309' : '#a16207' }}>{t('policyIUnderstand')}</p>
                  </div>
                </label>
              </div>

              {/* FOOTER */}
              <div
                className="flex gap-2.5 px-4 py-3.5 flex-shrink-0"
                style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #eef0f6', background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(248,250,255,0.9)' }}
              >
                <button
                  onClick={closeBorrowDialog}
                  className={`px-5 h-10 rounded-xl text-xs font-semibold cursor-pointer flex-shrink-0 ${isDark ? 'bg-white/[0.05] border border-white/[0.08] text-slate-400' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleBorrowSubmit}
                  disabled={!borrowForm.purpose || !borrowForm.agree_policy || selectedAvailableQty < 1 || isBorrowQuantityInvalid || isBorrowQuantityExceeded || isBorrowDateInvalid}
                  className="flex-1 h-10 rounded-xl text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', boxShadow: '0 4px 20px rgba(99,102,241,0.30)' }}
                >
                  {t('reviewAndSubmit')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Preview Modal ────────────────────────────────────────────────── */}
      <BorrowRequestPreviewModal
        open={showPreview}
        formData={borrowForm}
        equipment={selectedEquipment}
        user={user}
        lecturerName={lecturers.find(l => l.id === borrowForm.lecturer_id || l._id === borrowForm.lecturer_id)?.name || ''}
        isDark={isDark}
        onEdit={() => { setShowPreview(false); setSubmitError(''); }}
        onConfirm={handleConfirmSubmit}
        isSubmitting={createRequestMutation.isPending}
        submitError={submitError}
      />

      {/* ── Success Modal ────────────────────────────────────────────────── */}
      <AlertDialog open={showSuccessModal} onOpenChange={(v) => { setShowSuccessModal(v); if (!v) setSuccessPhase(0); }}>
        <AlertDialogContent
          className={`rounded-2xl shadow-2xl max-w-xs overflow-hidden p-0 ${isDark ? 'bg-[#111118] border-white/10' : 'bg-white border-slate-200'}`}
          style={{ minHeight: 300 }}
        >
          <style>{`
            @keyframes lms2-fill { from { opacity:0; transform:scale(0.4); } to { opacity:1; transform:scale(1); } }
            @keyframes lms2-ring  { from { stroke-dashoffset:201; } to { stroke-dashoffset:0; } }
            @keyframes lms2-tick  { from { stroke-dashoffset:50;  opacity:0; } to { stroke-dashoffset:0; opacity:1; } }
            @keyframes lms2-rise  { from { opacity: 0; transform: translateY(-18px) scale(1.15); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes lms2-text-in { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
            .lms2-check-wrap { animation: lms2-fill 0.4s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
            .lms2-check-wrap.risen { animation: lms2-rise 0.55s cubic-bezier(0.16,1,0.3,1) both; }
            .lms2-ring { stroke-dasharray: 201; stroke-dashoffset: 201; animation: lms2-ring 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
            .lms2-tick { stroke-dasharray: 50; stroke-dashoffset: 50; animation: lms2-tick 0.4s cubic-bezier(0.16,1,0.3,1) 0.85s both; }
            .lms2-text { animation: lms2-text-in 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
          `}</style>

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

          {successPhase === 1 && (
            <div className="flex flex-col items-center pt-6 pb-6 px-6 gap-0">
              <div className="lms2-check-wrap risen" style={{ marginBottom: 8 }}>
                <svg viewBox="0 0 72 72" width="80" height="80" fill="none">
                  <circle cx="36" cy="36" r="32" fill={isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.10)'} />
                  <circle cx="36" cy="36" r="32" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <polyline points="21,36 31,46 51,26" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="lms2-text text-center mt-2">
                <p className={`text-lg font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{t('requestSubmitted')}</p>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('requestSubmittedDesc')}</p>
              </div>
              <div className="lms2-text w-full mt-5" style={{ animationDelay: '0.2s' }}>
                <Button
                  onClick={() => { setShowSuccessModal(false); setSuccessPhase(0); }}
                  className={`w-full rounded-xl h-10 text-white text-sm font-semibold ${isDark ? 'bg-blue-600' : 'bg-slate-900'}`}
                >
                  {t('gotIt')}
                </Button>
              </div>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
