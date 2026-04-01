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
import { Search, UserPlus, Pencil, Loader2, Trash2 } from 'lucide-react';
import BanterLoader from '@/components/ui/BanterLoader';

const roles = [
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { value: 'lecturer', label: 'Lecturer', color: 'bg-blue-100 text-blue-800' },
  { value: 'head_of_lab', label: 'Head of Lab', color: 'bg-purple-100 text-purple-800' },
  { value: 'lab_assistant', label: 'Lab Assistant', color: 'bg-amber-100 text-amber-800' },
  { value: 'student', label: 'Student', color: 'bg-blue-100 text-blue-800' }
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
  const [activeRole, setActiveRole] = useState('student');
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

  const activeRoleConfig = getRoleConfig(activeRole);
  const activeRoleUsers = filteredUsersByRole[activeRole] || [];
  const shouldScrollTable = activeRoleUsers.length >= 5;
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
    const confirmed = window.confirm(`Delete user ${user.name || user.email}? This action cannot be undone.`);
    if (!confirmed) return;
    deleteMutation.mutate(user.id);
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
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
          <Button onClick={() => setIsInviteOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Role folders */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => {
            const totalInRole = usersByRole[role.value]?.length || 0;
            const isActive = activeRole === role.value;

            return (
              <button
                key={role.value}
                type="button"
                onClick={() => setActiveRole(role.value)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{role.label}</span>
                <Badge className={isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}>
                  {totalInRole}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
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
                  <UserPlus className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-sm font-medium text-slate-900">Unable to load users</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  {error?.message || 'Failed to connect to the server. Please check your connection and try again.'}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{activeRoleConfig.label} Users</p>
                  <Badge className={activeRoleConfig.color}>{usersByRole[activeRole]?.length || 0}</Badge>
                </div>
                {search.trim() && (
                  <p className="text-xs text-slate-500">
                    Showing {activeRoleUsers.length} result{activeRoleUsers.length === 1 ? '' : 's'} for this folder
                  </p>
                )}
              </div>

              <div className={`overflow-x-auto ${shouldScrollTable ? 'max-h-[430px] overflow-y-auto' : ''}`}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRoleUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                          No users found in {activeRoleConfig.label}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeRoleUsers.map((user) => {
                        const roleConfig = getRoleConfig(user.role);
                        return (
                          <TableRow key={user.id} className="hover:bg-slate-50/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                                  {user.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <span className="font-medium text-slate-900">{user.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600">{user.email}</TableCell>
                            <TableCell>
                              <Badge className={roleConfig.color}>
                                {roleConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600">{user.department || '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                                  <Pencil className="w-4 h-4 text-slate-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(user)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
              {!inviteValidation.isValid && (
                <p className="text-xs text-red-600">{inviteValidation.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Allowed domain for {getRoleConfig(inviteRole).label}: @{getAllowedDomainForRole(inviteRole)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleInvite}
              disabled={!inviteEmail || !inviteValidation.isValid || inviteMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {inviteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                'Send Invite'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={addForm.name}
                onChange={(event) => setAddForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(event) => setAddForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="user@example.com"
              />
              {!addValidation.isValid && (
                <p className="text-xs text-red-600">{addValidation.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Password (optional)</Label>
              <Input
                type="text"
                value={addForm.password}
                onChange={(event) => setAddForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="default123"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={addForm.role} onValueChange={(value) => setAddForm((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Allowed domain for {getRoleConfig(addForm.role).label}: @{getAllowedDomainForRole(addForm.role)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddUser}
              disabled={!addForm.name || !addForm.email || !addValidation.isValid || addUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {addUserMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                {editingUser?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-medium">{editingUser?.name}</p>
                <p className="text-sm text-slate-500">{editingUser?.email}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editingUser?.email || ''} disabled />
            </div>

            {editForm.role !== 'admin' && (
              <>
                <div className="space-y-2 mt-4">
                  <Label>Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Full name"
                  />
                </div>

              </>
            )}

            <div className="space-y-2 mt-4">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 mt-4">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.role === 'student' && (
              <>
                <div className="space-y-2 mt-4">
                  <Label>Department</Label>
                  <Input
                    value={editForm.department}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, department: event.target.value }))}
                    placeholder="Department"
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Student ID</Label>
                  <Input
                    value={editForm.studentId}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, studentId: event.target.value }))}
                    placeholder="Student ID"
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Phone</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Phone"
                  />
                </div>
              </>
            )}

            <div className="space-y-2 mt-4">
              <Label>Set New Password</Label>
              <Input
                type="text"
                value={editForm.password}
                onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Leave blank to keep current password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button 
              onClick={handleUpdateRole}
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
              ) : (
                'Update User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}