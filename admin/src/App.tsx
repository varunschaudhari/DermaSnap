import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import DoctorDashboard from './pages/doctor/Dashboard';
import PatientDetail from './pages/doctor/PatientDetail';
import ScanDetail from './pages/doctor/ScanDetail';
import Reports from './pages/doctor/Reports';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminRoles from './pages/admin/Roles';
import AdminUserDetail from './pages/admin/UserDetail';
import AppLayout from './components/AppLayout';
import { AppModule, canAccessModule, getDefaultRouteForRole } from './config/rbac';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function ModuleRoute({ module, children }: { module: AppModule; children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessModule(user.role, module)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getDefaultRouteForRole(user.role)} replace /> : <Login />} />
      <Route
        path="/doctor"
        element={
          <ProtectedRoute>
            <ModuleRoute module="doctorDashboard">
              <AppLayout>
                <DoctorDashboard />
              </AppLayout>
            </ModuleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/patient/:patientId"
        element={
          <ProtectedRoute>
            <ModuleRoute module="patientManagement">
              <AppLayout>
                <PatientDetail />
              </AppLayout>
            </ModuleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/scan/:scanId"
        element={
          <ProtectedRoute>
            <ModuleRoute module="scanDetails">
              <AppLayout>
                <ScanDetail />
              </AppLayout>
            </ModuleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/doctor/reports"
        element={
          <ProtectedRoute>
            <ModuleRoute module="reports">
              <AppLayout>
                <Reports />
              </AppLayout>
            </ModuleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <ModuleRoute module="adminDashboard">
              <AppLayout>
                <AdminDashboard />
              </AppLayout>
            </ModuleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <ModuleRoute module="adminUsers">
              <AppLayout>
                <AdminUsers />
              </AppLayout>
            </ModuleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute>
            <ModuleRoute module="adminRoles">
              <AppLayout>
                <AdminRoles />
              </AppLayout>
            </ModuleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:userId"
        element={
          <ProtectedRoute>
            <ModuleRoute module="adminUsers">
              <AppLayout>
                <AdminUserDetail />
              </AppLayout>
            </ModuleRoute>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
