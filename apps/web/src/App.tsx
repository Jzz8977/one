import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage } from './pages/Login';
import { LoginCallbackPage } from './pages/LoginCallback';
import { RegisterPage } from './pages/Register';
import { DashboardPage } from './pages/Dashboard';
import { ProfilePage } from './pages/Profile';
import { BillingPage } from './pages/Billing';
import { CreditsPage } from './pages/Credits';
import { AiPlaygroundPage } from './pages/AiPlayground';
import { UsageLogsPage } from './pages/UsageLogs';
import { ApiKeysPage } from './pages/ApiKeys';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/callback" element={<LoginCallbackPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/credits" element={<CreditsPage />} />
        <Route path="/ai-playground" element={<AiPlaygroundPage />} />
        <Route path="/usage-logs" element={<UsageLogsPage />} />
        <Route path="/api-keys" element={<ApiKeysPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
