import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Landing from './landingPage'
import LoginPage from './pages/LoginPage'
import AdminLoginPage from './pages/AdminLoginPage'
import DashboardLayout from './components/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

// Dashboard
import Dashboard from './pages/Dashboard'

// User Management
import Users from './pages/users'

// Approvals
import LecturerApprovals from './pages/approvals/lecturerApprovals'
import HeadApproval from './pages/approvals/headApproval'
import ApprovalHistory from './pages/approvals/approvalHistory'
import AllApprovalHistory from './pages/approvals/allApprovalHistory'

// Functions
import Catalog from './pages/functions/catalog'
import AllRequests from './pages/functions/allRequest'
import FunctionsApprovalHistory from './pages/functions/approvalHistory'

// Inventory
import Inventory from './pages/inventory/inventoryy'
import MyRequests from './pages/inventory/request'
import EquipmentPrep from './pages/inventory/equipmentPrep'
import Returns from './pages/inventory/returns'

// Settings
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'

import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        
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
            <Route path="approval-history" element={<ApprovalHistory />} />
            <Route path="all-approval-history" element={<AllApprovalHistory />} />
            
            {/* Functions */}
            <Route path="catalog" element={<Catalog />} />
            <Route path="all-requests" element={<AllRequests />} />
            <Route path="functions-approval-history" element={<FunctionsApprovalHistory />} />
            
            {/* Inventory */}
            <Route path="inventory" element={<Inventory />} />
            <Route path="requests" element={<MyRequests />} />
            <Route path="equipment-prep" element={<EquipmentPrep />} />
            <Route path="returns" element={<Returns />} />
            
            {/* Profile & Settings */}
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
