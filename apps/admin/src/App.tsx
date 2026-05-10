import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { RequireAdmin } from './components/RequireAdmin';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { UsersPage } from './pages/Users';
import { UserDetailPage } from './pages/UserDetail';
import { OrdersPage } from './pages/Orders';
import { AiLogsPage } from './pages/AiLogs';
import { ProductsPage } from './pages/Products';
import { SettingsPage } from './pages/Settings';
import { AdminLogsPage } from './pages/AdminLogs';
import { AiProvidersPage } from './pages/AiProviders';

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/users/:id" element={<UserDetailPage />} />
        <Route path="/admin/orders" element={<OrdersPage />} />
        <Route path="/admin/ai-logs" element={<AiLogsPage />} />
        <Route path="/admin/ai-providers" element={<AiProvidersPage />} />
        <Route path="/admin/products" element={<ProductsPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="/admin/logs" element={<AdminLogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
