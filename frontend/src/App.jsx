import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Auth
import Login from './pages/auth/Login';

// Layouts
import AdminLayout from './components/ui/AdminLayout';
import EmployeeLayout from './components/ui/EmployeeLayout';
import SuperadminLayout from './components/ui/SuperadminLayout';

// Superadmin
import SADashboard from './pages/superadmin/Dashboard';
import SACompanies from './pages/superadmin/Companies';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import Clients from './pages/admin/Clients';
import ClientDetail from './pages/admin/ClientDetail';
import Employees from './pages/admin/Employees';
import EmployeeDetail from './pages/admin/EmployeeDetail';
import Standards from './pages/admin/Standards';
import Stages from './pages/admin/Stages';
import SchedulerAdmin from './pages/admin/Scheduler';
import ExpensesAdmin from './pages/admin/Expenses';
import Reports from './pages/admin/Reports';

// Employee
import EmpDashboard from './pages/employee/Dashboard';
import EmpScheduler from './pages/employee/Scheduler';
import EmpExpenses from './pages/employee/Expenses';
import EmpTraining from './pages/employee/Training';
import EmpReports from './pages/employee/Reports';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'superadmin') return <Navigate to="/superadmin" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  return <Navigate to="/employee" />;
}

export default function App() {
  const { fetchMe } = useAuthStore();
  useEffect(() => { fetchMe(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RoleRedirect />} />

        {/* Superadmin */}
        <Route path="/superadmin" element={
          <ProtectedRoute roles={['superadmin']}><SuperadminLayout /></ProtectedRoute>
        }>
          <Route index element={<SADashboard />} />
          <Route path="companies" element={<SACompanies />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/:id" element={<EmployeeDetail />} />
          <Route path="standards" element={<Standards />} />
          <Route path="stages" element={<Stages />} />
          <Route path="scheduler" element={<SchedulerAdmin />} />
          <Route path="expenses" element={<ExpensesAdmin />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Employee */}
        <Route path="/employee" element={
          <ProtectedRoute roles={['employee']}><EmployeeLayout /></ProtectedRoute>
        }>
          <Route index element={<EmpDashboard />} />
          <Route path="scheduler" element={<EmpScheduler />} />
          <Route path="expenses" element={<EmpExpenses />} />
          <Route path="training" element={<EmpTraining />} />
          <Route path="reports" element={<EmpReports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
