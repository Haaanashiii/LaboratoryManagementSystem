import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Settings as SettingsIcon, Bell, Lock, Database, Globe } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
        <p className="mt-2 text-slate-600">Configure system preferences and settings.</p>
      </div>

      {/* Settings Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <SettingsIcon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">General Settings</h2>
            </div>
            <p className="text-slate-600">Configure general system preferences and defaults.</p>
            <div className="mt-4">
              <p className="text-sm text-slate-500">Coming soon...</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Bell className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
            </div>
            <p className="text-slate-600">Manage email and system notifications.</p>
            <div className="mt-4">
              <p className="text-sm text-slate-500">Coming soon...</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Security</h2>
            </div>
            <p className="text-slate-600">Configure security settings and permissions.</p>
            <div className="mt-4">
              <p className="text-sm text-slate-500">Coming soon...</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Database</h2>
            </div>
            <p className="text-slate-600">Manage database backups and maintenance.</p>
            <div className="mt-4">
              <p className="text-sm text-slate-500">Coming soon...</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <Globe className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Integration Settings</h2>
            </div>
            <p className="text-slate-600">Configure external integrations and API settings.</p>
            <div className="mt-4">
              <p className="text-sm text-slate-500">Coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
