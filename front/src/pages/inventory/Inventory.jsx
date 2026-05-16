import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Plus, Search, Pencil, Trash2, Package, Cpu, Monitor, Network,
  Mouse, HardDrive, Cable, Wrench, Boxes, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { InventorySkeleton } from '@/skeleton-framework/admin';
import '@/styles/equimon-admin.css';

const PAGE_SIZE = 10;

const categoryConfig = [
  { value: 'Electronics',  label: 'Electronics',  icon: Cpu       },
  { value: 'Computing',    label: 'Computing',    icon: Monitor   },
  { value: 'Networking',   label: 'Networking',   icon: Network   },
  { value: 'Peripherals',  label: 'Peripherals',  icon: Mouse     },
  { value: 'Storage',      label: 'Storage',      icon: HardDrive },
  { value: 'Cables',       label: 'Cables',       icon: Cable     },
  { value: 'Tools',        label: 'Tools',        icon: Wrench    },
  { value: 'Other',        label: 'Other',        icon: Boxes     },
];

const conditionPill = (condition) => {
  if (condition === 'Excellent')         return 'p-info';
  if (condition === 'Good')              return 'p-ok';
  if (condition === 'Fair')              return 'p-warn';
  return 'p-bad';
};

export default function Inventory() {
  const navigate = useNavigate();
  const [search, setSearch]             = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [currentPage, setCurrentPage]   = useState(1);
  const [deleteItem, setDeleteItem]     = useState(null);

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

  const publishMutation = useMutation({
    mutationFn: (id) => api.entities.Equipment.togglePublish(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success(data?.isPublished === false ? 'Hidden from students' : 'Visible to students');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update visibility'),
  });

  React.useEffect(() => { setCurrentPage(1); }, [search, activeCategory]);

  const filteredEquipment = equipment.filter(item =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase()) ||
    item.location?.toLowerCase().includes(search.toLowerCase())
  );

  const equipmentByCategory = categoryConfig.reduce((acc, cat) => {
    acc[cat.value] = equipment.filter(item => (item.category || 'Other') === cat.value).length;
    return acc;
  }, {});

  const displayedEquipment = activeCategory
    ? filteredEquipment.filter(item => (item.category || 'Other') === activeCategory)
    : filteredEquipment;

  const totalPages        = Math.max(1, Math.ceil(displayedEquipment.length / PAGE_SIZE));
  const paginatedEquipment = displayedEquipment.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeCatConfig   = activeCategory ? categoryConfig.find(c => c.value === activeCategory) : null;
  const canEdit = ['admin','head_of_lab','lab_assistant','lecturer'].includes(user?.role);

  if (isLoading) return <InventorySkeleton />;

  return (
    <div className="eq-admin" style={{ padding: '24px 28px', minHeight: '100%' }}>

      {/* ── Title Strip ── */}
      <div className="a-titlestrip">
        <div>
          <div className="a-eyebrow">Platform · Inventory</div>
          <h1>Inventory</h1>
          <div className="a-deck">Manage laboratory equipment, availability, and visibility</div>
        </div>
        <div className="a-right">
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--a-mute)' }}>
            {equipment.length} items · {equipment.filter(e => (e.available_quantity ?? 0) > 0).length} available
          </span>
          {canEdit && (
            <button className="a-btn primary" onClick={() => navigate('/inventory/add-equipment')}>
              <Plus style={{ width: 13, height: 13 }} />
              Add Equipment
            </button>
          )}
        </div>
      </div>

      {/* ── Category KPI Tabs ── */}
      <div className="a-tabs" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {categoryConfig.map(cat => {
          const isActive = activeCategory === cat.value;
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.value}
              className={`a-tab${isActive ? ' active' : ''}`}
              onClick={() => { setCurrentPage(1); setActiveCategory(activeCategory === cat.value ? '' : cat.value); }}
            >
              <div className="t-label">
                <CatIcon style={{ width: 13, height: 13 }} />
                {cat.label.toUpperCase()}
              </div>
              <div className="t-val">{equipmentByCategory[cat.value] || 0}</div>
            </button>
          );
        })}
      </div>

      {/* ── Panel + Table ── */}
      <div className="a-panel">
        <div className="p-head">
          <h2>{activeCatConfig ? activeCatConfig.label : 'All Equipment'}</h2>
          <span className="count">{displayedEquipment.length}</span>
          {activeCategory && (
            <button
              onClick={() => setActiveCategory('')}
              style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--a-mute)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear
            </button>
          )}
          <div className="spacer" />
          <div className="a-search" style={{ minWidth: 200 }}>
            <Search style={{ width: 14, height: 14, color: 'var(--a-mute)', flexShrink: 0 }} />
            <input
              placeholder="Search equipment..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', gap: 8 }}>
            <Package style={{ width: 32, height: 32, color: 'var(--a-mute-2)' }} />
            <p style={{ fontFamily: 'var(--serif)', color: 'var(--a-ink)', margin: 0 }}>Unable to load equipment</p>
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0, fontSize: 12 }}>
              {error?.message || 'Failed to connect to the server.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="a-table">
              <thead>
                <tr>
                  <th>Equipment</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th className="num">Total</th>
                  <th className="num">Available</th>
                  <th>Condition</th>
                  <th>Visibility</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {displayedEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <Package style={{ width: 28, height: 28, color: 'var(--a-mute-2)', margin: '0 auto 8px' }} />
                      <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--a-mute)', margin: 0 }}>
                        {activeCatConfig ? `No ${activeCatConfig.label.toLowerCase()} equipment found` : 'No equipment found'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedEquipment.map(item => {
                    const condPill = conditionPill(item.condition);
                    return (
                      <tr key={item.id}>
                        {/* Equipment name + image */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, border: '1px solid var(--a-rule)', background: 'var(--a-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <Package style={{ width: 16, height: 16, color: 'var(--a-mute-2)' }} />
                              )}
                            </div>
                            <div>
                              <div className="primary">{item.name}</div>
                              {item.description && (
                                <div className="muted" style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="a-pill p-mute">
                            {item.category || 'Other'}
                          </span>
                        </td>
                        <td className="muted">{item.location || '—'}</td>
                        <td className="num">{item.total_quantity}</td>
                        <td className="num" style={{ color: item.available_quantity > 0 ? 'var(--a-ok)' : 'var(--a-bad)', fontWeight: 600 }}>
                          {item.available_quantity}
                        </td>
                        <td>
                          <span className={`a-pill ${condPill}`}>
                            <span className="dot" style={{ background: 'currentColor' }} />
                            {item.condition || 'Good'}
                          </span>
                        </td>
                        <td>
                          {item.isPublished === false ? (
                            <span className="a-pill p-mute">Hidden</span>
                          ) : (
                            <span className="a-pill p-ok">
                              <span className="dot" style={{ background: 'currentColor' }} />
                              Published
                            </span>
                          )}
                        </td>
                        {canEdit && (
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {user?.role === 'admin' && (
                                <button
                                  type="button"
                                  title={item.isPublished === false ? 'Publish' : 'Unpublish'}
                                  onClick={() => publishMutation.mutate(item.id)}
                                  disabled={publishMutation.isPending}
                                  style={{
                                    position: 'relative', display: 'inline-flex', width: 36, height: 20,
                                    borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                                    background: item.isPublished === false ? 'var(--a-rule)' : 'var(--a-ok)',
                                    flexShrink: 0,
                                  }}
                                  disabled={publishMutation.isPending}
                                >
                                  <span style={{
                                    position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
                                    background: '#fff', transition: 'left 0.2s',
                                    left: item.isPublished === false ? 2 : 18,
                                  }} />
                                </button>
                              )}
                              <button
                                className="a-btn"
                                style={{ padding: '5px 8px' }}
                                onClick={() => navigate(`/inventory/edit-equipment/${item.id}`)}
                                title="Edit"
                              >
                                <Pencil style={{ width: 13, height: 13 }} />
                              </button>
                              <button
                                className="a-btn danger"
                                style={{ padding: '5px 8px' }}
                                onClick={() => setDeleteItem(item)}
                                disabled={deleteMutation.isPending}
                                title="Delete"
                              >
                                <Trash2 style={{ width: 13, height: 13 }} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="a-pagination">
                <span className="info">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, displayedEquipment.length)} of {displayedEquipment.length}
                </span>
                <div className="pages">
                  <button className="a-btn" style={{ padding: '6px 10px' }} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft style={{ width: 14, height: 14 }} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`a-btn${currentPage === page ? ' primary' : ''}`}
                      style={{ padding: '6px 10px', minWidth: 32 }}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button className="a-btn" style={{ padding: '6px 10px' }} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              Delete Equipment
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-500 leading-relaxed">
              You're about to permanently delete{' '}
              <span className="font-medium text-slate-700">"{deleteItem?.name}"</span>.{' '}
              This action <span className="font-medium text-slate-700">cannot be undone</span>.
            </p>
          </div>
          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteItem(null)} className="text-xs">Cancel</Button>
            <Button
              size="sm"
              onClick={() => deleteMutation.mutate(deleteItem.id)}
              disabled={deleteMutation.isPending}
              className="text-xs text-white bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deleting...</> : 'Delete Equipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
