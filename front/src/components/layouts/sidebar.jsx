import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  Users, 
  BarChart3, 
  CheckSquare,
  PackageCheck,
  Settings,
  FlaskConical,
  X
} from 'lucide-react';
import { Button } from "@/components/ui/button";

const menuConfig = {
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { label: 'Inventory', icon: Package, page: 'Inventory' },
    { label: 'All Requests', icon: ClipboardList, page: 'AllRequests' },
    { label: 'Users', icon: Users, page: 'Users' },
    { label: 'Reports', icon: BarChart3, page: 'Reports' }
  ],
  lecturer: [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { label: 'Pending Approvals', icon: CheckSquare, page: 'LecturerApprovals' },
    { label: 'My History', icon: ClipboardList, page: 'ApprovalHistory' }
  ],
  head_of_lab: [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { label: 'Final Approvals', icon: CheckSquare, page: 'HeadApprovals' },
    { label: 'Lab Equipment', icon: Package, page: 'Inventory' },
    { label: 'Reports', icon: BarChart3, page: 'Reports' }
  ],
  lab_assistant: [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { label: 'Equipment Prep', icon: PackageCheck, page: 'EquipmentPrep' },
    { label: 'Returns', icon: Package, page: 'Returns' },
    { label: 'Inventory', icon: Package, page: 'Inventory' }
  ],
  student: [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { label: 'Equipment Catalog', icon: Package, page: 'Catalog' },
    { label: 'My Requests', icon: ClipboardList, page: 'MyRequests' }
  ]
};

export default function Sidebar({ user, currentPage, isOpen, onClose }) {
  const userRole = user?.role || 'student';
  const menu = menuConfig[userRole] || menuConfig.student;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-slate-900 text-white
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">LabEquip</h1>
                <p className="text-xs text-slate-400">Management System</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-slate-400"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menu.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-slate-400 capitalize">{userRole.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}