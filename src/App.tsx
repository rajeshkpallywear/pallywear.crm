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

// === Error Boundary: Catches runtime crashes and shows a friendly error instead of blank page ===
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App Error Boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '24px', fontFamily: 'sans-serif' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '480px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Something went wrong</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>An unexpected error occurred. Please reload the page to continue.</p>
            <p style={{ color: '#ef4444', fontSize: '12px', background: '#fef2f2', borderRadius: '8px', padding: '12px', marginBottom: '24px', wordBreak: 'break-word', textAlign: 'left' }}>
              {this.state.error?.message}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{ background: '#1A0B91', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <AuthProvider>
        <LeadProvider>
          <AppRoutes />
        </LeadProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

