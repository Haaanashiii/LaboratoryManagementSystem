import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import Landing from './landingPage'
import LoginPage from './pages/LoginPage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import DashboardLayout from './components/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import RoleRoute from './components/RoleRoute'

// Dashboard
import Dashboard from './pages/dashboards/MainDashboard'

// User Management
import Users from './pages/admin/AdminUserManagement'

// Approvals
import LecturerApprovals from './pages/approvals/LecturerPendingApproval'
import HeadApproval from './pages/approvals/HeadFinalApproval'
import LecturerApprovalHistory from './pages/approvals/LecturerApprovalHistory'
import HeadApprovalHistory from './pages/approvals/HeadApprovalHistory'

// Functions
import Catalog from './pages/catalogs/CatalogRedirect'
import StudentCatalog from './pages/catalogs/StudentCatalog'
import HeadCatalog from './pages/catalogs/HeadCatalog'
import AssistantCatalog from './pages/catalogs/AssistantCatalog'
import AllRequests from './pages/requests/AllRequest'
import FunctionsApprovalHistory from './pages/approvals/MyApprovalHistory'

// Inventory
import Inventory from './pages/inventory/Inventory'
import AddEquipmentPage from './pages/inventory/AddEquipment'
import EditEquipmentPage from './pages/inventory/EditEquipment'
import MyRequests from './pages/requests/StudentRequest'
import EquipmentPrep from './pages/inventory/EquipmentPreparation'
import Returns from './pages/inventory/AssistantReturns'

// Settings
import Settings from './pages/settings/StudentSettings'
import Profile from './pages/Profile'
import AdminSettings from './pages/settings/AdminSettings'
import LecturerSettings from './pages/settings/LecturerSettings'
import HeadLabSettings from './pages/settings/HeadLabSettings'
import AssistantSettings from './pages/settings/AssistantSettings'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'
import Reports from './pages/admin/Reports'
import Maintenance from './pages/Maintenance'

import './App.css'

const HIDDEN_ADMIN_ROUTE = '/secure-admin-portal-9f3Xk'

function AdminShortcutHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAdminShortcut = (event) => {
      if (event.ctrlKey && event.altKey && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        navigate(HIDDEN_ADMIN_ROUTE)
      }
    }

    window.addEventListener('keydown', handleAdminShortcut)
    return () => window.removeEventListener('keydown', handleAdminShortcut)
  }, [navigate])

  return null
}

function MaintenanceRedirectHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleMaintenanceMode = () => {
      if (window.location.pathname !== '/maintenance') {
        navigate('/maintenance', { replace: true })
      }
    }

    window.addEventListener('app:maintenance-mode', handleMaintenanceMode)
    return () => window.removeEventListener('app:maintenance-mode', handleMaintenanceMode)
  }, [navigate])

  return null
}

function App() {
  return (
    <Router>
      <AdminShortcutHandler />
      <MaintenanceRedirectHandler />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path={HIDDEN_ADMIN_ROUTE} element={<AdminLoginPage />} />
        
        {/* Protected routes with dashboard layout */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            {/* Dashboard */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route element={<AdminRoute />}>
              <Route path="admin-dashboard" element={<Dashboard />} />
              <Route path="admin-audit-logs" element={<AdminAuditLogs />} />
            </Route>
            
            {/* User Management */}
            <Route path="users" element={<Users />} />
            
            {/* Approvals */}
            <Route path="lecturer-approvals" element={<LecturerApprovals />} />
            <Route path="head-approvals" element={<HeadApproval />} />
            <Route path="approval-history" element={<FunctionsApprovalHistory />} />
            <Route path="lecturer-approval-history" element={<LecturerApprovalHistory />} />
            <Route path="head-approval-history" element={<HeadApprovalHistory />} />
            
            {/* Functions */}
            <Route path="catalog" element={<Catalog />} />
            <Route element={<RoleRoute allowedRoles={['student']} />}>
              <Route path="catalog/student" element={<StudentCatalog />} />
            </Route>
            <Route element={<RoleRoute allowedRoles={['head_of_lab']} />}>
              <Route path="catalog/head-of-lab" element={<HeadCatalog />} />
            </Route>
            <Route element={<RoleRoute allowedRoles={['lab_assistant']} />}>
              <Route path="catalog/lab-assistant" element={<AssistantCatalog />} />
            </Route>
            <Route path="all-requests" element={<AllRequests />} />
            <Route path="all-approval-history" element={<AllRequests />} />
            <Route path="functions-approval-history" element={<FunctionsApprovalHistory />} />
            
            {/* Inventory */}
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/add-equipment" element={<AddEquipmentPage />} />
            <Route path="inventory/edit-equipment/:id" element={<EditEquipmentPage />} />
            <Route path="requests" element={<MyRequests />} />
            <Route path="equipment-prep" element={<EquipmentPrep />} />
            <Route element={<RoleRoute allowedRoles={['lab_assistant']} />}>
              <Route path="returns" element={<Returns />} />
              <Route path="assistant-settings" element={<AssistantSettings />} />
            </Route>
            
            {/* Profile & Settings */}
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route element={<AdminRoute />}>
              <Route path="admin-settings" element={<AdminSettings />} />
              <Route path="reports" element={<Reports />} />
            </Route>
            <Route element={<RoleRoute allowedRoles={['lecturer']} />}>
              <Route path="lecturer-settings" element={<LecturerSettings />} />
            </Route>
            <Route element={<RoleRoute allowedRoles={['head_of_lab']} />}>
              <Route path="head-settings" element={<HeadLabSettings />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
