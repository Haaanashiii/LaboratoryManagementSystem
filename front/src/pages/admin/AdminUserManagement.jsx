import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Search, UserPlus, Pencil, Loader2, Trash2,
  Users as UsersIcon, ShieldCheck, Cpu, GraduationCap, UserCog,
  AlertTriangle, Eye, EyeOff, Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AdminUserManagementSkeleton } from '@/skeleton-framework/admin';
import { useLang } from '@/components/i18n/LangContext';
import '@/styles/equimon-admin.css';

const roles = [
  { value: 'student',       labelKey: 'student',       dot: '#3b82f6', icon: GraduationCap },
  { value: 'lecturer',      labelKey: 'lecturer',      dot: '#22c55e', icon: UsersIcon     },
  { value: 'lab_assistant', labelKey: 'lab_assistant', dot: '#f59e0b', icon: Cpu           },
  { value: 'head_of_lab',   labelKey: 'head_of_lab',   dot: '#8b5cf6', icon: UserCog       },
  { value: 'admin',         labelKey: 'admin',         dot: '#ef4444', icon: ShieldCheck   },
];

const SELECTABLE_ROLES = roles.filter(r => r.value !== 'admin');
const STAFF_ROLES = ['admin', 'lecturer', 'lab_assistant', 'head', 'head_of_lab'];
const PAGE_SIZE = 10;

const getAllowedDomainForRole = (role) =>
  role === 'student' ? 'student.its.ac.id' : 'its.ac.id';

const validateRoleEmailDomain = (email, role) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return { isValid: true, message: '' };
  const emailPattern = /^\S+@\S+\.\S+$/;
  if (!emailPattern.test(normalizedEmail)) return { isValid: false, message: 'Please provide a valid email.' };
  const domain = normalizedEmail.split('@')[1] || '';
  const isAllowedDomain = domain === 'student.its.ac.id' || domain === 'its.ac.id';
  if (!isAllowedDomain) return { isValid: false, message: 'Only @student.its.ac.id or @its.ac.id emails are allowed.' };
  if (role === 'student' && domain !== 'student.its.ac.id') return { isValid: false, message: 'Student accounts must use @student.its.ac.id.' };
  if (STAFF_ROLES.includes(role) && domain !== 'its.ac.id') return { isValid: false, message: 'Staff roles must use @its.ac.id.' };
  return { isValid: true, message: '' };
};

const getPaginationRange = (current, total, delta = 2) => {
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);
  const range = [1];
  if (left > 2) range.push('...');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push('...');
  if (total > 1) range.push(total);
  return range;
};

const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 28, height: 28, padding: '0 6px', borderRadius: 6,
  border: '1px solid var(--a-rule)', background: 'var(--a-surface)',
  fontSize: 12, color: 'var(--a-ink)', cursor: 'pointer',
};
const btnActive = { ...btnBase, background: 'var(--a-navy)', color: '#fff', borderColor: 'var(--a-navy)' };

function Pager({ page, total, onPage }) {
  if (total <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button style={btnBase} onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>Prev</button>
      {getPaginationRange(page, total).map((item, idx) =>
        item === '...' ? (
          <span key={`e-${idx}`} style={{ padding: '0 4px', fontSize: 12, color: 'var(--a-mute)' }}>…</span>
        ) : (
          <button key={item} style={page === item ? btnActive : btnBase} onClick={() => onPage(item)}>{item}</button>
        )
      )}
      <button style={btnBase} onClick={() => onPage(Math.min(total, page + 1))} disabled={page === total}>Next</button>
    </div>
  );
}

export default function Users() {
  const { t } = useLang();
  const [search, setSearch]               = useState('');
  const [activeRole, setActiveRole]       = useState('');
  const [deletingUser, setDeletingUser]   = useState(null);
  const [viewingUser, setViewingUser]     = useState(null);
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [showAddPassword, setShowAddPassword]   = useState(false);
  const [isAddOpen, setIsAddOpen]         = useState(false);
  const [isInviteOpen, setIsInviteOpen]   = useState(false);
  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviteRole, setInviteRole]       = useState('student');
  const [editingUser, setEditingUser]     = useState(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [currentPage, setCurrentPage]     = useState(1);
  const [editForm, setEditForm] = useState({ name: '', role: 'student', department: '', studentId: '', phone: '', status: 'active', password: '' });
  const [addForm, setAddForm]   = useState({ name: '', email: '', password: '', role: 'student', department: '', phone: '' });

  const queryClient = useQueryClient();

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.entities.User.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.User.update(id, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (variables?.data?.password) {
        toast.success('Password changed successfully.');
      } else {
        toast.success('User updated successfully.');
      }
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to update user. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const addUserMutation = useMutation({
    mutationFn: (data) => api.users.addUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddOpen(false);
      setAddForm({ name: '', email: '', password: '', role: 'student', department: '', phone: '' });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => api.users.inviteUser(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('student');
    },
  });

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const usersByRole = roles.reduce((acc, role) => {
    acc[role.value] = users.filter(u => (u.role || 'student') === role.value);
    return acc;
  }, {});

  const filteredUsersByRole = roles.reduce((acc, role) => {
    acc[role.value] = filteredUsers.filter(u => (u.role || 'student') === role.value);
    return acc;
  }, {});

  const getRoleConfig = (role) => roles.find(r => r.value === role) || roles.find(r => r.value === 'student');
  const getRoleLabel = (roleValue) => t(roleValue || 'student');

  const activeRoleConfig = activeRole ? getRoleConfig(activeRole) : null;
  const displayedUsers   = activeRole ? (filteredUsersByRole[activeRole] || []) : filteredUsers;
  const totalPages       = Math.max(1, Math.ceil(displayedUsers.length / PAGE_SIZE));
  const paginatedUsers   = displayedUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const addValidation    = validateRoleEmailDomain(addForm.email, addForm.role);
  const inviteValidation = validateRoleEmailDomain(inviteEmail, inviteRole);

  const openEditDialog = (user) => {
    setEditingUser(user);
    setShowEditPassword(true);
    setEditForm({ name: user.name || '', role: user.role || 'student', department: user.department || '', studentId: user.studentId || '', phone: user.phone || '', status: user.status || 'active', password: '' });
  };

  const handleUpdateRole = () => {
    const isEditingAdmin = editingUser?.role === 'admin';
    const staysAdmin = isEditingAdmin && editForm.role === 'admin';
    const isStudent  = editForm.role === 'student';
    const payload = {};
    if (staysAdmin) {
      payload.role = editForm.role;
      payload.status = editForm.status;
    } else {
      payload.name = editForm.name;
      payload.role = editForm.role;
      payload.status = editForm.status;
      if (isStudent) {
        payload.department = editForm.department;
        payload.studentId  = editForm.studentId;
        payload.phone      = editForm.phone;
      } else {
        payload.department = '';
        payload.studentId  = '';
        payload.phone      = '';
      }
    }
    if (editForm.password.trim()) payload.password = editForm.password.trim();
    updateMutation.mutate({ id: editingUser.id, data: payload });
  };

  const handleDeleteUser = (user) => setDeletingUser(user);
  const confirmDelete = () => {
    if (!deletingUser) return;
    deleteMutation.mutate(deletingUser.id);
    setDeletingUser(null);
  };

  const handleAddUser = () => {
    addUserMutation.mutate({ ...addForm, password: addForm.password || 'Default123' });
  };

  const handleInvite = () => {
    if (!inviteValidation.isValid || !inviteEmail.trim()) return;
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  if (isLoading) return <AdminUserManagementSkeleton />;

  return (
    <div className="eq-admin" style={{ paddingBottom: 40 }}>

      {/* Title Strip */}
      <div className="a-titlestrip">
        <div style={{ flex: 1 }}>
          <div className="a-eyebrow">System · Administration</div>
          <h1>User Management</h1>
          <p className="a-deck">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="a-right">
          <button className="a-btn gold" onClick={() => setIsAddOpen(true)}>
            <UserPlus style={{ width: 13, height: 13 }} />
            Add User
          </button>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>

        {/* Role KPI Tabs */}
        <div className="a-tabs" style={{ marginTop: 20, gridTemplateColumns: `repeat(${roles.length}, 1fr)` }}>
          {roles.map(role => {
            const RoleIcon = role.icon;
            return (
              <button
                key={role.value}
                type="button"
                className={`a-tab${activeRole === role.value ? ' active' : ''}`}
                onClick={() => { setCurrentPage(1); setActiveRole(activeRole === role.value ? '' : role.value); }}
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '12px 16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RoleIcon style={{ width: 13, height: 13 }} />
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{getRoleLabel(role.value)}</span>
                </div>
                <span style={{ fontSize: 24, fontFamily: 'var(--serif)', fontWeight: 700, lineHeight: 1, marginTop: 2 }}>
                  {(usersByRole[role.value]?.length || 0).toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table Panel */}
        <div className="a-panel" style={{ marginTop: 16 }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--a-rule)', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>
                {activeRoleConfig ? getRoleLabel(activeRoleConfig.value) : t('allUsers')}
              </span>
              <span className="a-pill p-mute">{displayedUsers.length.toLocaleString()}</span>
              {activeRole && (
                <button
                  onClick={() => { setCurrentPage(1); setActiveRole(''); }}
                  style={{ fontSize: 11, color: 'var(--a-mute)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {t('clear')}
                </button>
              )}
            </div>
            <div className="a-search" style={{ width: 240 }}>
              <Search style={{ width: 14, height: 14 }} />
              <input
                type="search"
                placeholder={t('searchUsers')}
                name="user-search"
                autoComplete="off"
                value={search}
                onChange={e => { setCurrentPage(1); setSearch(e.target.value); }}
              />
            </div>
          </div>

          {isError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 64, color: 'var(--a-mute)' }}>
              <UsersIcon style={{ width: 32, height: 32 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-ink)' }}>{t('unableLoadUsers')}</p>
              <p style={{ fontSize: 12 }}>{error?.message || t('failedConnectServer')}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="a-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 56, color: 'var(--a-mute)', fontSize: 13 }}>
                        {t('noUsersFound')}
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map(user => {
                      const roleConfig = getRoleConfig(user.role);
                      const initials   = (user.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                      const statusPill = user.status === 'active' ? 'p-ok' : user.status === 'suspended' ? 'p-bad' : 'p-mute';
                      return (
                        <tr key={user.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: roleConfig.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                {initials}
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewingUser(user)}
                                style={{ fontSize: 13, fontWeight: 600, color: 'var(--a-navy)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                              >
                                {user.name || '—'}
                              </button>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--a-ink-2)' }}>{user.email}</td>
                          <td style={{ fontSize: 12, color: 'var(--a-ink-2)' }}>{user.department || '—'}</td>
                          <td>
                            <span className="a-pill p-mute" style={{ whiteSpace: 'nowrap' }}>
                              {getRoleLabel(roleConfig.value)}
                            </span>
                          </td>
                          <td>
                            <span className={`a-pill ${statusPill}`} style={{ whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                              {user.status || 'active'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                              <button
                                className="a-btn"
                                onClick={() => openEditDialog(user)}
                                style={{ padding: '0 8px' }}
                              >
                                <Pencil style={{ width: 13, height: 13 }} />
                              </button>
                              <button
                                className="a-btn"
                                onClick={() => handleDeleteUser(user)}
                                disabled={deleteMutation.isPending}
                                style={{ padding: '0 8px', color: 'var(--a-warn)' }}
                              >
                                <Trash2 style={{ width: 13, height: 13 }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--a-rule)' }}>
              <span style={{ fontSize: 12, color: 'var(--a-mute)' }}>
                {t('showingUsers')}: {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, displayedUsers.length)} {t('ofLabel')} {displayedUsers.length}
              </span>
              <Pager page={currentPage} total={totalPages} onPage={setCurrentPage} />
            </div>
          )}
        </div>

      </div>

      {/* ── Invite Dialog ── */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-blue-500" />
              Invite New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="user@its.ac.id"
                className="h-9 text-sm"
              />
              {!inviteValidation.isValid && (
                <p className="text-xs text-red-600">{inviteValidation.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="h-9 text-sm bg-white text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 border-slate-200">
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>{getRoleLabel(role.value)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">
                Required domain: <span className="font-medium text-slate-600">@{getAllowedDomainForRole(inviteRole)}</span>
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={!inviteEmail || !inviteValidation.isValid || inviteMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {inviteMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Sending…</> : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add User Dialog ── */}
      <Dialog open={isAddOpen} onOpenChange={open => { if (!open) { setIsAddOpen(false); setAddForm({ name: '', email: '', password: '', role: 'student', department: '', phone: '' }); } }}>
        <DialogContent className="sm:max-w-lg rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <UserPlus className="h-4 w-4 text-blue-600" />
              </div>
              Add New User
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  value={addForm.name}
                  onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Juan dela Cruz"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Role <span className="text-red-500">*</span></Label>
                <Select value={addForm.role} onValueChange={value => setAddForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    {SELECTABLE_ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>{getRoleLabel(role.value)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Email Address <span className="text-red-500">*</span>
                <span className="ml-1.5 font-normal text-slate-400">— must be @{getAllowedDomainForRole(addForm.role)}</span>
              </Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={e => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder={`user@${getAllowedDomainForRole(addForm.role)}`}
                className="h-9 text-sm"
              />
              {!addValidation.isValid && addForm.email && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />{addValidation.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Password
                <span className="ml-1.5 font-normal text-slate-400">(defaults to <code className="rounded bg-slate-100 px-1 text-slate-600">Default123</code> if blank)</span>
              </Label>
              <div className="relative">
                <Input
                  type={showAddPassword ? 'text' : 'password'}
                  value={addForm.password}
                  onChange={e => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Set a custom password…"
                  autoComplete="new-password"
                  className="h-9 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowAddPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Phone <span className="font-normal text-slate-400">(optional)</span></Label>
              <Input
                value={addForm.phone}
                onChange={e => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+63 912 345 6789"
                className="h-9 text-sm"
              />
            </div>
            {addForm.role === 'student' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Department <span className="font-normal text-slate-400">(optional)</span></Label>
                <Input
                  value={addForm.department}
                  onChange={e => setAddForm(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g. Information Technology"
                  className="h-9 text-sm"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="text-xs">Cancel</Button>
            <Button
              size="sm"
              onClick={handleAddUser}
              disabled={!addForm.name || !addForm.email || !addValidation.isValid || addUserMutation.isPending}
              className="bg-blue-600 text-xs hover:bg-blue-700"
            >
              {addUserMutation.isPending
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Creating…</>
                : <><UserPlus className="mr-1.5 h-3.5 w-3.5" />Create User</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View User Dialog ── */}
      <Dialog open={!!viewingUser} onOpenChange={() => { setViewingUser(null); setShowViewPassword(false); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: getRoleConfig(viewingUser?.role).dot }}
              >
                {(viewingUser?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              User Details
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 divide-y divide-slate-100">
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">Full Name</span>
                <span className="text-sm font-medium text-slate-900 text-right truncate">{viewingUser?.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">Email</span>
                <span className="text-sm text-slate-700 text-right truncate">{viewingUser?.email || '—'}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">Role</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 border-slate-200`}>
                  {getRoleLabel(viewingUser?.role)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">Department</span>
                <span className="text-sm text-slate-700 text-right truncate">{viewingUser?.department || '—'}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">Password</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700 font-mono">
                    {showViewPassword ? (viewingUser?.password || '—') : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowViewPassword(v => !v)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {showViewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button size="sm" variant="outline" className="text-xs" onClick={() => { setViewingUser(null); setShowViewPassword(false); }}>Close</Button>
            <Button
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700"
              onClick={() => { openEditDialog(viewingUser); setViewingUser(null); setShowViewPassword(false); }}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ── */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white text-slate-900">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <Pencil className="h-4 w-4 text-slate-600" />
              </div>
              Edit User
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: getRoleConfig(editingUser?.role).dot }}
            >
              {(editingUser?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{editingUser?.name || '—'}</p>
              <p className="truncate text-xs text-slate-500">{editingUser?.email}</p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {getRoleLabel(getRoleConfig(editingUser?.role).value)}
            </span>
          </div>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Full Name</Label>
                <Input
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  disabled={editingUser?.role === 'admin'}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Role</Label>
                {editingUser?.role === 'admin' ? (
                  <Input value="Admin" disabled className="h-9 text-sm bg-slate-50" />
                ) : (
                  <Select value={editForm.role} onValueChange={value => setEditForm(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200">
                      {SELECTABLE_ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>{getRoleLabel(role.value)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Status</Label>
                <Select value={editForm.status} onValueChange={value => setEditForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Email</Label>
                <Input value={editingUser?.email || ''} disabled className="h-9 text-sm bg-slate-50 text-slate-400" />
              </div>
            </div>
            {editForm.role === 'student' && (
              <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <p className="text-xs font-medium text-blue-700">Student Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Student ID</Label>
                    <Input
                      value={editForm.studentId}
                      onChange={e => setEditForm(prev => ({ ...prev, studentId: e.target.value }))}
                      placeholder="e.g. 5026231234"
                      className="h-9 text-sm bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Phone</Label>
                    <Input
                      value={editForm.phone}
                      onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+63 912 345 6789"
                      className="h-9 text-sm bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Department</Label>
                  <Input
                    value={editForm.department}
                    onChange={e => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. Informatics Engineering"
                    className="h-9 text-sm bg-white"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                New Password <span className="font-normal text-slate-400">(leave blank to keep current)</span>
              </Label>
              <div className="relative">
                <Input
                  type={showEditPassword ? 'text' : 'password'}
                  value={editForm.password}
                  onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={() => setEditingUser(null)} className="text-xs">Cancel</Button>
            <Button
              size="sm"
              onClick={handleUpdateRole}
              disabled={updateMutation.isPending}
              className="bg-blue-600 text-xs hover:bg-blue-700"
            >
              {updateMutation.isPending
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</>
                : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Delete User
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-medium text-slate-900">{deletingUser?.name || deletingUser?.email}</span>?
              This cannot be undone.
            </p>
            {deletingUser && (
              <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: getRoleConfig(deletingUser.role).dot }}
                >
                  {(deletingUser.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-900">{deletingUser.name}</p>
                  <p className="truncate text-xs text-slate-500">{deletingUser.email}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingUser(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Deleting…</>
                : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
