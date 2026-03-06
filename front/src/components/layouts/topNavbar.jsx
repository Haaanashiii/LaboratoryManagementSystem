import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Menu, Bell, LogOut, User, Settings, Loader2, Globe } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLang } from '@/components/i18n/LangContext';

const roles = [
  { value: 'admin', label: 'Admin' },
  { value: 'lecturer', label: 'Lecturer' },
  { value: 'head_of_lab', label: 'Head of Lab' },
  { value: 'lab_assistant', label: 'Lab Assistant' },
  { value: 'student', label: 'Student' }
];

export default function TopNav({ user, onMenuClick, title }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user?.role || 'student');
  const { lang, toggleLang, t } = useLang();

  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: (role) => base44.auth.updateMe({ role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setSettingsOpen(false);
      window.location.reload();
    }
  });

  const handleOpenSettings = () => {
    setSelectedRole(user?.role || 'student');
    setSettingsOpen(true);
  };

  const handleLogout = () => {
    base44.auth.logout('/Landing');
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative flex items-center gap-1 px-3"
            onClick={toggleLang}
            title={lang === 'en' ? 'Switch to Indonesian' : 'Switch to English'}
          >
            <Globe className="w-5 h-5 text-slate-600" />
            <span className="text-xs font-medium text-slate-600">{lang.toUpperCase()}</span>
          </Button>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden md:inline text-sm font-medium">{user?.full_name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleOpenSettings}>
                <Settings className="w-4 h-4 mr-2" />
                {t('settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings')}</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{user?.full_name}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>

            {/* Role Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('currentRole')}</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {t(role.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">{t('roleChangeNote')}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>{t('cancel')}</Button>
            <Button
              onClick={() => updateRoleMutation.mutate(selectedRole)}
              disabled={updateRoleMutation.isPending || selectedRole === user?.role}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updateRoleMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('saving')}</>
              ) : (
                t('saveChanges')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}