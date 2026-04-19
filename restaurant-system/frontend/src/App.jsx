import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TablesPage from './pages/TablesPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import POSPage from './pages/POSPage';
import KitchenPage from './pages/KitchenPage';
import MenuPage from './pages/MenuPage';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import ReservationsPage from './pages/ReservationsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import LoadingSpinner from './components/common/LoadingSpinner';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route path="kitchen" element={<ProtectedRoute roles={['admin','manager','kitchen']}><KitchenPage /></ProtectedRoute>} />
        <Route path="menu" element={<ProtectedRoute roles={['admin','manager']}><MenuPage /></ProtectedRoute>} />
        <Route path="inventory" element={<ProtectedRoute roles={['admin','manager']}><InventoryPage /></ProtectedRoute>} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="reports" element={<ProtectedRoute roles={['admin','manager']}><ReportsPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute roles={['admin','manager']}><SettingsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
