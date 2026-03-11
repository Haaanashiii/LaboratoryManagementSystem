import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Save, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useLang } from '@/components/i18n/LangContext';

export default function ProfilePage() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  // Profile Info State
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordError, setPasswordError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Initialize form data when user data loads
  React.useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
  });

  // Update Password Mutation (you'll need to implement this endpoint)
  const updatePasswordMutation = useMutation({
    mutationFn: (data) => api.auth.changePassword(data),
    onSuccess: () => {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: (error) => {
      setPasswordError(error.message || t('passwordUpdateError'));
    },
  });

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    setProfileSuccess(false);
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    // Validation
    if (passwordData.newPassword.length < 6) {
      setPasswordError(t('passwordTooShort'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(t('passwordsDoNotMatch'));
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pt-1 pb-4 px-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t('myProfile') || 'My Profile'}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('profileSubtitle') || 'Manage your personal information and account security.'}</p>
      </div>

      <hr className="border-slate-200" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Personal Information */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-medium text-slate-700">{t('personalInformation') || 'Personal Information'}</h2>
          </div>
          <div className="p-5">

            {/* Avatar */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{user?.name || '—'}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                  {user?.role?.replace(/_/g, ' ') || 'Student'}
                </span>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs text-slate-600">{t('fullName') || 'Full Name'}</Label>
                <Input
                  id="full_name"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  placeholder={t('enterFullName') || 'Enter full name'}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-slate-600">{t('email') || 'Email'}</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder={t('enterEmail') || 'Enter email'}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs text-slate-600">{t('phoneNumber') || 'Phone Number'}</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder={t('enterPhoneNumber') || 'Enter phone number'}
                  className="h-9 text-sm"
                />
              </div>

              {profileSuccess && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {t('profileUpdatedSuccess') || 'Profile updated successfully.'}
                </div>
              )}

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 h-8 px-4 text-xs"
              >
                {updateProfileMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t('saving') || 'Saving...'}</>
                ) : (
                  <><Save className="w-3.5 h-3.5 mr-1.5" />{t('saveChanges') || 'Save Changes'}</>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-medium text-slate-700">{t('changePassword') || 'Change Password'}</h2>
          </div>
          <div className="p-5">
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="text-xs text-slate-600">{t('currentPassword') || 'Current Password'}</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder={t('enterCurrentPassword') || 'Enter current password'}
                    className="h-9 text-sm pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs text-slate-600">{t('newPassword') || 'New Password'}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder={t('enterNewPassword') || 'Enter new password'}
                    className="h-9 text-sm pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs text-slate-600">{t('confirmPassword') || 'Confirm Password'}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder={t('confirmNewPassword') || 'Confirm new password'}
                    className="h-9 text-sm pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {t('passwordChangedSuccess') || 'Password changed successfully.'}
                </div>
              )}

              <Button
                type="submit"
                disabled={updatePasswordMutation.isPending}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 h-8 px-4 text-xs"
              >
                {updatePasswordMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t('updating') || 'Updating...'}</>
                ) : (
                  <><Lock className="w-3.5 h-3.5 mr-1.5" />{t('updatePassword') || 'Update Password'}</>
                )}
              </Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
