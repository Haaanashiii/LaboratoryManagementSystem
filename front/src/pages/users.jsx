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
import { Search, UserPlus, Pencil, Loader2, Trash2, Mail, Users as UsersIcon, ShieldCheck, Cpu, GraduationCap, UserCog, AlertTriangle } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';

const roles = [
  { value: 'student',      label: 'Student',       color: 'bg-blue-50 text-blue-700 border-blue-200',    dot: '#3b82f6', icon: GraduationCap },
  { value: 'lecturer',     label: 'Lecturer',      color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: '#22c55e', icon: UsersIcon },
  { value: 'lab_assistant',label: 'Lab Assistant', color: 'bg-amber-50 text-amber-700 border-amber-200',  dot: '#f59e0b', icon: Cpu },
  { value: 'head_of_lab',  label: 'Head of Lab',   color: 'bg-violet-50 text-violet-700 border-violet-200', dot: '#8b5cf6', icon: UserCog },
  { value: 'admin',        label: 'Admin',          color: 'bg-red-50 text-red-700 border-red-200',       dot: '#ef4444', icon: ShieldCheck },
];

const STAFF_ROLES = ['admin', 'lecturer', 'lab_assistant', 'head', 'head_of_lab'];

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
  const [search, setSearch] = useState('');
  const [activeRole, setActiveRole] = useState('');
  const [deletingUser, setDeletingUser] = useState(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'student',
    department: '',
    studentId: '',
    phone: '',
    status: 'active',
    password: ''
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('student');
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

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => api.users.inviteUser(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('student');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
    }
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

  const activeRoleConfig = activeRole ? getRoleConfig(activeRole) : null;
  const displayedUsers = activeRole ? (filteredUsersByRole[activeRole] || []) : filteredUsers;
  const shouldScrollTable = displayedUsers.length >= 5;
  const inviteValidation = validateRoleEmailDomain(inviteEmail, inviteRole);
  const addValidation = validateRoleEmailDomain(addForm.email, addForm.role);

  const openEditDialog = (user) => {
    setEditingUser(user);
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

  const handleInvite = () => {
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleAddUser = () => {
    addUserMutation.mutate({
      ...addForm,
      password: addForm.password || 'default123'
    });
  };

  return (
    <div className="w-full space-y-4 px-2 py-2">

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">User Management</h1>
          <p className="mt-0.5 text-sm text-slate-500">{users.length} total registered users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setIsAddOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add User
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-blue-600 text-xs hover:bg-blue-700"
            onClick={() => setIsInviteOpen(true)}
          >
            <Mail className="h-3.5 w-3.5" />
            Invite
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
              onClick={() => setActiveRole(activeRole === role.value ? '' : role.value)}
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
                <p className="text-xs text-slate-500 truncate">{role.label}</p>
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
              {activeRoleConfig ? activeRoleConfig.label : 'All Users'}
            </p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
              {displayedUsers.length}
            </span>
            {activeRole && (
              <button
                onClick={() => setActiveRole('')}
                className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search users..."
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
                <UserPlus className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-sm font-medium text-slate-800">Unable to load users</p>
              <p className="max-w-xs text-center text-xs text-slate-500">
                {error?.message || 'Failed to connect to the server.'}
              </p>
            </div>
          ) : (
            <div className={`overflow-x-auto ${shouldScrollTable ? 'max-h-[460px] overflow-y-auto' : ''}`}>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="text-xs font-medium text-slate-500">User</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Email</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Role</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">Status</TableHead>
                    <TableHead className="text-right text-xs font-medium text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                            <UsersIcon className="h-4 w-4 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">
                            {activeRoleConfig ? `No ${activeRoleConfig.label.toLowerCase()} users found` : 'No users found'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedUsers.map((user) => {
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
                              <span className="text-sm font-medium text-slate-900">{user.name || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{user.email}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${roleConfig.color}`}>
                              {roleConfig.label}
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
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
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
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-blue-500" />
              Add User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Full Name</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Email Address</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="user@its.ac.id"
                className="h-9 text-sm"
              />
              {!addValidation.isValid && (
                <p className="text-xs text-red-600">{addValidation.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Password <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                type="text"
                value={addForm.password}
                onChange={(e) => setAddForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="default123"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Role</Label>
              <Select value={addForm.role} onValueChange={(value) => setAddForm((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger className="h-9 text-sm bg-white text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 border-slate-200">
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">
                Required domain: <span className="font-medium text-slate-600">@{getAllowedDomainForRole(addForm.role)}</span>
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleAddUser}
              disabled={!addForm.name || !addForm.email || !addValidation.isValid || addUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {addUserMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Creating…</> : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ── */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base">Edit User</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            {/* user identity strip */}
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: getRoleConfig(editingUser?.role).dot }}
              >
                {(editingUser?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{editingUser?.name}</p>
                <p className="truncate text-xs text-slate-500">{editingUser?.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Email</Label>
                <Input value={editingUser?.email || ''} disabled className="h-9 text-sm bg-slate-50" />
              </div>

              {editForm.role !== 'admin' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700">Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Full name"
                    className="h-9 text-sm"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Role</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm((prev) => ({ ...prev, role: value }))}>
                  <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger className="h-9 text-sm bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-slate-900 border-slate-200">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editForm.role === 'student' && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Department</Label>
                    <Input
                      value={editForm.department}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                      placeholder="Department"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Student ID</Label>
                    <Input
                      value={editForm.studentId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, studentId: e.target.value }))}
                      placeholder="Student ID"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Phone</Label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                      className="h-9 text-sm"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  New Password <span className="font-normal text-slate-400">(leave blank to keep current)</span>
                </Label>
                <Input
                  type="text"
                  value={editForm.password}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleUpdateRole}
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Updating…</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent className="sm:max-w-sm bg-white text-slate-900">
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