import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Pencil, Loader2, Trash2, Users as UsersIcon, ShieldCheck, Cpu, GraduationCap, UserCog, AlertTriangle, ChevronLeft, ChevronRight, Eye, EyeOff, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AdminUserManagementSkeleton } from '@/skeleton-framework/admin';
import { useLang } from '@/components/i18n/LangContext';

const roles = [
  { value: 'student',      labelKey: 'student', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: '#3b82f6', icon: GraduationCap },
  { value: 'lecturer',     labelKey: 'lecturer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#22c55e', icon: UsersIcon },
  { value: 'lab_assistant',labelKey: 'lab_assistant', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: '#f59e0b', icon: Cpu },
  { value: 'head_of_lab',  labelKey: 'head_of_lab', color: 'bg-violet-50 text-violet-700 border-violet-200', dot: '#8b5cf6', icon: UserCog },
  { value: 'admin',        labelKey: 'admin', color: 'bg-red-50 text-red-700 border-red-200', dot: '#ef4444', icon: ShieldCheck },
];

// Roles available for assignment — admin is excluded from create/edit forms
const SELECTABLE_ROLES = roles.filter((r) => r.value !== 'admin');

const STAFF_ROLES = ['admin', 'lecturer', 'lab_assistant', 'head', 'head_of_lab'];
const PAGE_SIZE = 10;

const getAllowedDomainForRole = (role) => {
  return role === 'student' ? 'student.its.ac.id' : 'its.ac.id';
};

const validateRoleEmailDomain = (email, role) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return { isValid: true, message: '' };
  }

  const emailPattern = /^\S+@\S+\.\S+$/;
  if (!emailPattern.test(normalizedEmail)) {
    return { isValid: false, message: 'Please provide a valid email.' };
  }

  const domain = normalizedEmail.split('@')[1] || '';
  const isAllowedRegistrationDomain = domain === 'student.its.ac.id' || domain === 'its.ac.id';

  if (!isAllowedRegistrationDomain) {
    return {
      isValid: false,
      message: 'Only @student.its.ac.id or @its.ac.id emails are allowed.'
    };
  }

  if (role === 'student' && domain !== 'student.its.ac.id') {
    return { isValid: false, message: 'Student accounts must use @student.its.ac.id.' };
  }

  if (STAFF_ROLES.includes(role) && domain !== 'its.ac.id') {
    return { isValid: false, message: 'Staff roles must use @its.ac.id.' };
  }

  return { isValid: true, message: '' };
};

export default function Users() {
  const { t } = useLang();
  const [search, setSearch] = useState('');
  const [activeRole, setActiveRole] = useState('');
  const [deletingUser, setDeletingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('student');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'student',
    department: '',
    studentId: '',
    phone: '',
    status: 'active',
    password: ''
  });
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: '',
    phone: ''
  });

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
    }
  });

  const addUserMutation = useMutation({
    mutationFn: (data) => api.users.addUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddOpen(false);
      setAddForm({
        name: '',
        email: '',
        password: '',
        role: 'student',
        department: '',
        phone: ''
      });
    }
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => api.users.inviteUser(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('student');
    }
  });

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const usersByRole = roles.reduce((acc, role) => {
    acc[role.value] = users.filter((user) => (user.role || 'student') === role.value);
    return acc;
  }, {});

  const filteredUsersByRole = roles.reduce((acc, role) => {
    acc[role.value] = filteredUsers.filter((user) => (user.role || 'student') === role.value);
    return acc;
  }, {});

  const getRoleConfig = (role) => {
    return roles.find(r => r.value === role) || roles.find(r => r.value === 'student');
  };

  const getRoleLabel = (roleValue) => t(roleValue || 'student');

  const activeRoleConfig = activeRole ? getRoleConfig(activeRole) : null;
  const displayedUsers = activeRole ? (filteredUsersByRole[activeRole] || []) : filteredUsers;
  const totalPages = Math.max(1, Math.ceil(displayedUsers.length / PAGE_SIZE));
  const paginatedUsers = displayedUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const addValidation = validateRoleEmailDomain(addForm.email, addForm.role);
  const inviteValidation = validateRoleEmailDomain(inviteEmail, inviteRole);

  const openEditDialog = (user) => {
    setEditingUser(user);
    // Show password text during development for easier verification.
    setShowEditPassword(true);
    setEditForm({
      name: user.name || '',
      role: user.role || 'student',
      department: user.department || '',
      studentId: user.studentId || '',
      phone: user.phone || '',
      status: user.status || 'active',
      password: ''
    });
  };

  const handleUpdateRole = () => {
    const isEditingAdmin = editingUser?.role === 'admin';
    const staysAdmin = isEditingAdmin && editForm.role === 'admin';
    const isStudent = editForm.role === 'student';
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
        payload.studentId = editForm.studentId;
        payload.phone = editForm.phone;
      } else {
        payload.department = '';
        payload.studentId = '';
        payload.phone = '';
      }
    }

    if (editForm.password.trim()) {
      payload.password = editForm.password.trim();
    }

    updateMutation.mutate({
      id: editingUser.id,
      data: payload
    });
  };

  const handleDeleteUser = (user) => {
    setDeletingUser(user);
  };

  const confirmDelete = () => {
    if (!deletingUser) return;
    deleteMutation.mutate(deletingUser.id);
    setDeletingUser(null);
  };

  const handleAddUser = () => {
    addUserMutation.mutate({
      ...addForm,
      password: addForm.password || 'Default123'
    });
  };

  const handleInvite = () => {
    if (!inviteValidation.isValid || !inviteEmail.trim()) return;

    inviteMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole
    });
  };

  const h = new Date().getHours();
  const gc =
    h < 12 ? { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' } :
    h < 18 ? { color: '#f97316', bg: '#fff7ed', border: '#fed7aa' } :
             { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };

  if (isLoading) return <AdminUserManagementSkeleton />;

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Hero Banner ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
            style={{ backgroundColor: gc.bg, borderColor: gc.border }}
          >
            <UsersIcon className="h-6 w-6" style={{ color: gc.color }} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">User Management</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <UsersIcon className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold leading-none tabular-nums text-blue-700">{users.length}</p>
              <p className="mt-0.5 text-[10px] font-medium text-blue-500">registered user{users.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-violet-100 bg-violet-50 px-4 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
            </div>
            <div className="text-left">
              <p className="text-base font-bold leading-none tabular-nums text-violet-700">{users.filter(u => u.role !== 'student').length}</p>
              <p className="mt-0.5 text-[10px] font-medium text-violet-500">staff account{users.filter(u => u.role !== 'student').length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setIsAddOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add User
          </Button>
        </div>
      </div>

      {/* ── Role stat pills ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {roles.map((role) => {
          const count = usersByRole[role.value]?.length || 0;
          const isActive = activeRole === role.value;
          const RoleIcon = role.icon;
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => {
                setCurrentPage(1);
                setActiveRole(activeRole === role.value ? '' : role.value);
              }}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? `${role.color} shadow-sm`
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`rounded-lg p-1.5 ${isActive ? 'bg-white/60' : 'bg-slate-100'}`}>
                <RoleIcon className="h-4 w-4" style={isActive ? { color: role.dot } : { color: '#64748b' }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">{getRoleLabel(role.value)}</p>
                <p className="text-lg font-semibold leading-tight text-slate-900">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Search + Table ── */}
      <Card className="border-slate-200 shadow-none overflow-hidden">
        {/* toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {activeRoleConfig && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activeRoleConfig.dot }} />
            )}
            <p className="text-sm font-medium text-slate-800">
              {activeRoleConfig ? getRoleLabel(activeRoleConfig.value) : t('allUsers')}
            </p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {displayedUsers.length}
            </span>
            {activeRole && (
              <button
                onClick={() => {
                  setCurrentPage(1);
                  setActiveRole('');
                }}
                className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              >
                {t('clear')}
              </button>
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder={t('searchUsers')}
              name="user-search"
              autoComplete="off"
              value={search}
              onChange={(e) => {
                setCurrentPage(1);
                setSearch(e.target.value);
              }}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <UserPlus className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-800">{t('unableLoadUsers')}</p>
              <p className="max-w-xs text-center text-xs text-slate-500">
                {error?.message || t('failedConnectServer')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="text-xs font-medium text-slate-500">User</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Email</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Department</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Role</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                    <TableHead className="text-right text-xs font-medium text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <UsersIcon className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">
                            {t('noUsersFound')}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user) => {
                      const roleConfig = getRoleConfig(user.role);
                      const initials = (user.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                      const statusClass =
                        user.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : user.status === 'suspended'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200';

                      return (
                        <TableRow key={user.id} className="border-slate-50 hover:bg-slate-50/50">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                                style={{ backgroundColor: roleConfig.dot }}
                              >
                                {initials}
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewingUser(user)}
                                className="text-sm font-medium text-slate-900 hover:text-blue-600 hover:underline underline-offset-2 transition-colors text-left"
                              >
                                {user.name || '—'}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{user.email}</TableCell>
                          <TableCell className="text-xs text-slate-500">{user.department || '—'}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${roleConfig.color}`}>
                              {getRoleLabel(roleConfig.value)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusClass}`}>
                              {user.status || 'active'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700"
                                onClick={() => openEditDialog(user)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-slate-300 hover:text-red-500"
                                onClick={() => handleDeleteUser(user)}
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    {t('showingUsers')}: {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, displayedUsers.length)} {t('ofLabel')} {displayedUsers.length}
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
                        className={`h-7 w-7 text-xs ${currentPage === page ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
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
                onChange={(e) => setInviteEmail(e.target.value)}
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
                  {roles.map((role) => (
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
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) { setIsAddOpen(false); setAddForm({ name: '', email: '', password: '', role: 'student', department: '', phone: '' }); } }}>
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
            {/* Name + Email row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  value={addForm.name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Juan dela Cruz"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Role <span className="text-red-500">*</span></Label>
                <Select value={addForm.role} onValueChange={(value) => setAddForm((prev) => ({ ...prev, role: value }))}>
                  <SelectTrigger className="h-9 text-sm bg-white text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    {SELECTABLE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{getRoleLabel(role.value)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Email Address <span className="text-red-500">*</span>
                <span className="ml-1.5 font-normal text-slate-400">— must be @{getAllowedDomainForRole(addForm.role)}</span>
              </Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder={`user@${getAllowedDomainForRole(addForm.role)}`}
                className="h-9 text-sm"
              />
              {!addValidation.isValid && addForm.email && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />{addValidation.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Password
                <span className="ml-1.5 font-normal text-slate-400">(defaults to <code className="rounded bg-slate-100 px-1 text-slate-600">Default123</code> if blank)</span>
              </Label>
              <div className="relative">
                <Input
                  type={showAddPassword ? 'text' : 'password'}
                  value={addForm.password}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Set a custom password…"
                  autoComplete="new-password"
                  className="h-9 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowAddPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Phone — shown for all roles */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Phone <span className="font-normal text-slate-400">(optional)</span></Label>
              <Input
                value={addForm.phone}
                onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+63 912 345 6789"
                className="h-9 text-sm"
              />
            </div>

            {/* Student-only: department */}
            {addForm.role === 'student' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Department <span className="font-normal text-slate-400">(optional)</span></Label>
                <Input
                  value={addForm.department}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g. Information Technology"
                  className="h-9 text-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="text-xs">
              Cancel
            </Button>
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
                {(viewingUser?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              User Details
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 divide-y divide-slate-100">
              {/* Name */}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">Full Name</span>
                <span className="text-sm font-medium text-slate-900 text-right truncate">{viewingUser?.name || '—'}</span>
              </div>
              {/* Email */}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">Email</span>
                <span className="text-sm text-slate-700 text-right truncate">{viewingUser?.email || '—'}</span>
              </div>
              {/* Role */}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">Role</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getRoleConfig(viewingUser?.role).color}`}>
                  {getRoleLabel(viewingUser?.role)}
                </span>
              </div>
              {/* Department */}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">Department</span>
                <span className="text-sm text-slate-700 text-right truncate">{viewingUser?.department || '—'}</span>
              </div>
              {/* Password */}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <span className="text-xs font-medium text-slate-500 shrink-0">Password</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700 font-mono">
                    {showViewPassword ? (viewingUser?.password || '—') : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowViewPassword((v) => !v)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {showViewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => { setViewingUser(null); setShowViewPassword(false); }}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700"
              onClick={() => { openEditDialog(viewingUser); setViewingUser(null); setShowViewPassword(false); }}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
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

          {/* Identity card */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: getRoleConfig(editingUser?.role).dot }}
            >
              {(editingUser?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{editingUser?.name || '—'}</p>
              <p className="truncate text-xs text-slate-500">{editingUser?.email}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getRoleConfig(editingUser?.role).color}`}>
              {getRoleLabel(getRoleConfig(editingUser?.role).value)}
            </span>
          </div>

          <div className="py-4 space-y-4">
            {/* Name + Role row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Full Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
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
                  <Select value={editForm.role} onValueChange={(value) => setEditForm((prev) => ({ ...prev, role: value }))}>
                    <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white text-slate-900 border-slate-200">
                      {SELECTABLE_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>{getRoleLabel(role.value)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Status + Email row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}>
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

            {/* Student-only fields */}
            {editForm.role === 'student' && (
              <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <p className="text-xs font-medium text-blue-700">Student Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Student ID</Label>
                    <Input
                      value={editForm.studentId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, studentId: e.target.value }))}
                      placeholder="e.g. 5026231234"
                      className="h-9 text-sm bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Phone</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+63 912 345 6789"
                      className="h-9 text-sm bg-white"
                    />
                  </div>
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
                    onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="h-9 text-sm pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((v) => !v)}
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
                  {(deletingUser.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
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