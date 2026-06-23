import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import DealsPage from "./pages/DealsPage";
import ProductsPage from "./pages/ProductsPage";
import WarehousePage from "./pages/WarehousePage";
import ProductionPage from "./pages/ProductionPage";
import ProcurementPage from "./pages/ProcurementPage";
import RentPage from "./pages/RentPage";
import InstallationPage from "./pages/InstallationPage";
import MobileInstallationPage from "./pages/MobileInstallationPage";
import LegalPage from "./pages/LegalPage";
import ServicePage from "./pages/ServicePage";
import TasksPage from "./pages/TasksPage";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import ChatPage from "./pages/ChatPage";
import RegisterPage from "./pages/RegisterPage";
import ReferralPage from "./pages/ReferralPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import Layout from "./components/Layout";

<Route path="/register" element={<RegisterPage />} />

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="warehouse" element={<WarehousePage />} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="procurement" element={<ProcurementPage />} />
        <Route path="rent" element={<RentPage />} />
        <Route path="installation" element={<InstallationPage />} />
        <Route path="installer-mobile" element={<MobileInstallationPage />} />
        <Route path="legal" element={<LegalPage />} />
        <Route path="service" element={<ServicePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="knowledge" element={<KnowledgeBasePage />} />
              </Route>
    <Route path="/referrals" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
          <Route path="/referrals/sales" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
          <Route path="/referrals/earnings" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
          <Route path="/referrals/invite" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
          <Route path="/referrals/config" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
        </Routes>
  );
}
