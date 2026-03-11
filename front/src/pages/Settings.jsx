import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Bell, Lock, Database, Globe, Edit, ChevronRight } from 'lucide-react';
import { api } from '@/api/apiClient';
import { useLang } from '@/components/i18n/LangContext';
import ProfileCard from '@/components/ui/ProfileCard';

export default function Settings() {
  const navigate = useNavigate();
  const { t } = useLang();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const settingsItems = [
    {
      icon: SettingsIcon,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      label: t('general') || 'General',
      description: t('generalDescription') || 'Manage your general preferences.',
    },
    {
      icon: Bell,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      label: t('notifications') || 'Notifications',
      description: t('notificationsDescription') || 'Control how you receive notifications.',
    },
    {
      icon: Lock,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      label: t('security') || 'Security',
      description: t('securityDescription') || 'Password, 2FA, and account security.',
    },
    {
      icon: Database,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      label: t('database') || 'Database',
      description: t('databaseDescription') || 'Data storage and backup settings.',
    },
    {
      icon: Globe,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      label: t('integrations') || 'Integrations',
      description: t('integrationsDescription') || 'Connect with external services.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 pt-1 pb-4 px-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t('settings') || 'Settings'}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('systemSettingsDescription') || 'Manage your profile and system preferences.'}</p>
      </div>

      <hr className="border-slate-200" />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">

        {/* LEFT: Profile card */}
        <div className="rounded-lg border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">{t('profile') || 'Profile'}</p>
            <Button
              onClick={() => navigate('/profile')}
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5 text-xs h-7 px-2.5 border-slate-200 text-slate-600 hover:text-slate-900"
            >
              <Edit className="w-3.5 h-3.5" />
              {t('edit') || 'Edit'}
            </Button>
          </div>

          <div className="flex justify-center">
            <ProfileCard
              name={user?.name || 'User'}
              role={user?.role?.replace(/_/g, ' ') || 'Student'}
              avatar={user?.name?.[0]?.toUpperCase() || 'U'}
              showBadge={true}
            />
          </div>
        </div>

        {/* RIGHT: Settings list */}
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {settingsItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className={`p-2 rounded-lg ${item.iconBg} ${item.iconColor} shrink-0`}>
                <item.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
