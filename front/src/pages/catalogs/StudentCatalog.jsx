import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { Loader2, Package } from 'lucide-react';

import { api } from '@/api/apiClient';
import { useAuth } from '@/components/hooks/useAuth.js';
import EquipmentViewModal from '@/components/equipment/EquipmentViewModal';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import CatalogContent from './CatalogContent';
import { useCatalogData } from './useCatalogData';
import { useTheme } from '@/components/hooks/ThemeContext';

const getDefaultBorrowForm = () => ({
  quantity: 1,
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
    createRequestMutation.mutate({ equipment: selectedEquipment.id, ...borrowForm });
  };

  const closeBorrowDialog = () => {
    setSelectedEquipment(null);
    setBorrowForm(getDefaultBorrowForm());
  };

  const handleViewEquipmentBorrow = (equipment) => {
    setViewedEquipment(null);
    setSelectedEquipment(equipment);
    setBorrowForm(getDefaultBorrowForm());
  };

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
            onBorrow={setSelectedEquipment}
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
          isDark={isDark}
        />
      )}

      {/* Borrow Dialog */}
      {user?.role === 'student' && (
        <Dialog open={!!selectedEquipment} onOpenChange={closeBorrowDialog}>
          <DialogContent className={`sm:max-w-md max-h-[90vh] overflow-y-auto rounded-xl shadow-lg ${isDark ? 'bg-[#111118] border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`}>
            <DialogHeader>
              <DialogTitle className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Borrow Equipment
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Equipment Name */}
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Item</p>
                <p className={`text-sm font-bold ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>{selectedEquipment?.name}</p>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <Label className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                  Quantity
                  <span className={`ml-2 font-normal normal-case ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    (max {selectedEquipment?.available_quantity})
                  </span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedEquipment?.available_quantity}
                  value={borrowForm.quantity}
                  onChange={(event) => setBorrowForm({ ...borrowForm, quantity: parseInt(event.target.value, 10) || 1 })}
                  className={`rounded-lg text-sm font-medium ${isDark ? 'bg-white/5 border-white/10 text-slate-200 focus:border-blue-500 focus:ring-blue-500' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-400'}`}
                />
              </div>

              {/* Purpose */}
              <div className="space-y-1.5">
                <Label className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Purpose</Label>
                <Textarea
                  placeholder="Explain why you need this equipment..."
                  value={borrowForm.purpose}
                  onChange={(event) => setBorrowForm({ ...borrowForm, purpose: event.target.value })}
                  rows={3}
                  className={`rounded-lg text-sm resize-none font-medium ${isDark ? 'bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-400'}`}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Borrow Date</Label>
                  <Input
                    type="date"
                    value={borrowForm.borrow_date}
                    onChange={(event) => setBorrowForm({ ...borrowForm, borrow_date: event.target.value })}
                    className={`rounded-lg text-sm font-medium ${isDark ? 'bg-white/5 border-white/10 text-slate-200 focus:border-blue-500 focus:ring-blue-500 [color-scheme:dark]' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-400 [color-scheme:light]'}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Return Date</Label>
                  <Input
                    type="date"
                    value={borrowForm.return_date}
                    onChange={(event) => setBorrowForm({ ...borrowForm, return_date: event.target.value })}
                    className={`rounded-lg text-sm font-medium ${isDark ? 'bg-white/5 border-white/10 text-slate-200 focus:border-blue-500 focus:ring-blue-500 [color-scheme:dark]' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-400 [color-scheme:light]'}`}
                  />
                </div>
              </div>

              {/* Policy */}
              <div className={`rounded-lg border p-4 space-y-2.5 ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>Agreement Policy</p>
                <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-amber-300/80' : 'text-amber-850'}`}>
                  Damaged items may be subject to replacement depending on the damage and severity. Lost items must be replaced by the borrower.
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    checked={borrowForm.agree_policy}
                    onChange={(event) => setBorrowForm({ ...borrowForm, agree_policy: event.target.checked })}
                  />
                  <span className={`text-xs leading-relaxed font-medium ${isDark ? 'text-amber-300/80' : 'text-amber-900'}`}>
                    I understand and agree to this policy, including replacement responsibility when applicable.
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                onClick={closeBorrowDialog}
                variant="ghost"
                className={`rounded-lg text-sm font-semibold border ${isDark ? 'bg-white/5 border-white/10 !text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 !text-slate-700 hover:bg-slate-50'}`}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBorrowSubmit}
                disabled={createRequestMutation.isPending || !borrowForm.purpose || !borrowForm.agree_policy}
                className={`rounded-lg text-white text-sm transition-colors disabled:opacity-40 font-semibold ${isDark ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-900 hover:bg-blue-600'}`}
              >
                {createRequestMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Submitting...</>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
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
