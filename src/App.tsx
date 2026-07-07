/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LeadProvider } from './context/LeadContext';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Store = lazy(() => import('./pages/Store'));

import { UserRole } from './types';

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-brand-light">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-brand-primary/20"></div>
      <div className="absolute inset-0 rounded-full border-4 border-t-brand-primary border-r-brand-primary animate-spin"></div>
    </div>
    <p className="mt-4 text-brand-dark font-medium animate-pulse">Loading Pallywear CRM...</p>
  </div>
);

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  const isAdmin = user.role === UserRole.ADMIN || user.role === 'admin';
  const isStaff = user.role === UserRole.STAFF || user.role === 'staff';

  // Admin and Staff can access admin panel
  if (adminOnly && !isAdmin && !isStaff) {
    return <Navigate to="/dashboard" />;
  }

  // Staff and other roles should stay on /dashboard to see their portals
  return children;
};

function AppRoutes() {
  const { adminOnlyRegistration } = useAuth();

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Landing Page */}
          <Route path="/Pallywear" element={<Store />} />
          <Route path="/store" element={<Navigate to="/Pallywear" />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route
            path="/register"
            element={
              adminOnlyRegistration ? (
                <ProtectedRoute adminOnly={true}>
                  <Register />
                </ProtectedRoute>
              ) : (
                <Register />
              )
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/Pallywear" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LeadProvider>
        <AppRoutes />
      </LeadProvider>
    </AuthProvider>
  );
}

