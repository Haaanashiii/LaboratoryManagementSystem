import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Bell, Lock, Database, Globe, Edit, User } from 'lucide-react';
import { api } from '@/api/apiClient';
import { useLang } from '@/components/i18n/LangContext';
import ReflectiveCard from '@/components/ui/ReflectiveCard';

export default function Settings() {
  const navigate = useNavigate();
  const { t } = useLang();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  return (
    <div className="h-full">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 h-full">
        {/* LEFT: Profile Section */}
        <div className="border-2 border-slate-200 rounded-lg p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">{t('profile')}</h2>
            <Button 
              onClick={() => navigate('/profile')}
              size="sm"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="w-4 h-4" />
              {t('edit')}
            </Button>
          </div>

          <div className="flex justify-center items-start">
            <ReflectiveCard
              overlayColor="rgba(15, 23, 42, 0.3)"
              blurStrength={12}
              glassDistortion={30}
              metalness={1}
              roughness={0.75}
              displacementStrength={20}
              noiseScale={1}
              specularConstant={5}
              grayscale={0.15}
              color="#ffffff"
              userName={user?.name || 'User'}
              userRole={user?.role || 'Student'}
              userId={user?.id || '0000-0000-0000'}
              userAvatar={user?.avatar || null}
              className="max-w-full"
              style={{ width: '100%', maxWidth: '320px' }}
            />
          </div>
        </div>

        {/* RIGHT: Settings Section */}
        <div className="border-2 border-slate-200 rounded-lg p-6 bg-white shadow-sm overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">{t('settings')}</h2>
            <p className="mt-2 text-slate-600">{t('systemSettingsDescription') || 'Configure system preferences and settings.'}</p>
          </div>

          {/* Settings Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <SettingsIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{t('general')}</h3>
                </div>
                <p className="text-sm text-slate-600">{t('generalDescription')}</p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{t('notifications')}</h3>
                </div>
                <p className="text-sm text-slate-600">{t('notificationsDescription')}</p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{t('security')}</h3>
                </div>
                <p className="text-sm text-slate-600">{t('securityDescription')}</p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <Database className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{t('database')}</h3>
                </div>
                <p className="text-sm text-slate-600">{t('databaseDescription')}</p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm sm:col-span-2">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-red-50 text-red-600">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{t('integrations')}</h3>
                </div>
                <p className="text-sm text-slate-600">{t('integrationsDescription')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
