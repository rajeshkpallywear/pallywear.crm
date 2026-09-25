/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-nocheck
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LeadProvider } from './context/LeadContext';
import { lazyWithRetry } from './utils/lazyWithRetry';

const Login = lazyWithRetry(() => import('./pages/Login'));
const Register = lazyWithRetry(() => import('./pages/Register'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const Store = lazyWithRetry(() => import('./pages/Store'));
const LeadDashboard = lazyWithRetry(() => import('./pages/LeadDashboard'));
const FlagshipUpper = lazyWithRetry(() => import('./pages/FlagshipUpper'));
const HRDashboard = lazyWithRetry(() => import('./pages/HRDashboard'));
const PublicOrderPayment = lazyWithRetry(() => import('./pages/PublicOrderPayment'));

import { UserRole } from './types';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App Error Boundary caught:', error, info);
  }

  handleReload = (forceFresh = false) => {
    try {
      sessionStorage.removeItem('lazy_chunk_retry_timestamp');
      sessionStorage.removeItem('vite_preload_reload_ts');
      sessionStorage.removeItem('retry-lazy-refreshed');
      if (forceFresh && 'caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {
      // ignore cache clearing errors
    }

    if (forceFresh) {
      const url = new URL(window.location.href);
      url.searchParams.set('_v', Date.now().toString());
      window.location.href = url.toString();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || '';
      const isChunkError =
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('error loading dynamically imported module') ||
        errorMessage.includes('dynamically imported module') ||
        (this.state.error as any)?.name === 'ChunkLoadError';

      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '24px', fontFamily: 'sans-serif' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 32px', maxWidth: '480px', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '44px', marginBottom: '16px' }}>{isChunkError ? '🚀' : '⚠️'}</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              {isChunkError ? 'New Update Available' : 'Something went wrong'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
              {isChunkError
                ? 'A new version of Pallywear CRM was deployed. Please reload to load the latest application update.'
                : 'An unexpected error occurred while loading this page.'}
            </p>

            {errorMessage && (
              <p style={{ color: '#ef4444', fontSize: '12px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '10px 12px', marginBottom: '24px', wordBreak: 'break-word', textAlign: 'left', maxHeight: '100px', overflowY: 'auto' }}>
                {errorMessage}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => this.handleReload(true)}
                style={{ background: '#1A0B91', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(26,11,145,0.25)' }}
              >
                {isChunkError ? 'Update App & Reload' : 'Reload Page'}
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/login';
                }}
                style={{ background: 'transparent', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Go to Login Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PageLoader = () => {
  const [showFailsafe, setShowFailsafe] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setShowFailsafe(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen dashboard-page-bg">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-brand-primary/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-t-brand-primary border-r-brand-primary animate-spin"></div>
      </div>
      <p className="mt-4 text-brand-dark font-medium animate-pulse">Loading Pallywear CRM...</p>
      {showFailsafe && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-xs text-gray-500 font-medium">Taking longer than expected?</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.reload();
              }}
              className="px-3.5 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-all cursor-pointer border-none"
            >
              Refresh Application
            </button>
            <button
              onClick={() => {
                window.location.href = '/login';
              }}
              className="px-3.5 py-1.5 bg-white text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-all cursor-pointer"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ProtectedRoute = ({
  children,
  adminOnly = false,
  leadDashboardOnly = false,
  hrOrAdminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  leadDashboardOnly?: boolean;
  hrOrAdminOnly?: boolean;
}) => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = user.role === UserRole.ADMIN || user.role === 'admin';
  const isStaff = user.role === UserRole.STAFF || user.role === 'staff';
  const isHR = user.role === UserRole.HR || user.role === 'hr';
  const isMarketing = user.role === UserRole.MARKETING || user.role === 'marketing';
  const isOnlineTeam = user.role === UserRole.ONLINETEAM || user.role === 'onlineteam';

  // Admin and Staff can access admin panel
  if (adminOnly && !isAdmin && !isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  // Only Admin and HR role can access HR Dashboard
  if (hrOrAdminOnly && !isAdmin && !isHR) {
    return <Navigate to="/dashboard" replace />;
  }

  // Only Admin and Online Team can access Lead Dashboard (Marketing role permanently excluded)
  if (leadDashboardOnly && !isAdmin && !isOnlineTeam) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) {
    const isAdmin = user.role === UserRole.ADMIN || user.role === 'admin';
    const isHR = user.role === UserRole.HR || user.role === 'hr';
    const isSalesHead = user.role === UserRole.SALES_HEAD || user.role === 'sales_head';
    const isOperationsHead = user.role === UserRole.OPERATIONS_HEAD || user.role === 'operations_head';
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isHR) return <Navigate to="/hr-dashboard" replace />;
    if (isSalesHead) return <Navigate to="/dashboard" replace />;
    if (isOperationsHead) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/Pallywear" replace />;
};

function AppRoutes() {
  const { adminOnlyRegistration } = useAuth();

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Landing Page */}
          <Route path="/Pallywear" element={<Store />} />
          <Route path="/store" element={<Navigate to="/Pallywear" replace />} />
          <Route path="/flagship-upper" element={<FlagshipUpper />} />
          <Route path="/flagship" element={<FlagshipUpper />} />

          {/* Client-Facing Public Payment Gateway */}
          <Route path="/pay/:id" element={<PublicOrderPayment />} />
          <Route path="/payment/:id" element={<PublicOrderPayment />} />

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

          {/* Dashboards */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/sales-head"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/operations-head"
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

          <Route
            path="/lead-dashboard"
            element={
              <ProtectedRoute leadDashboardOnly={true}>
                <LeadDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/hr-dashboard"
            element={
              <ProtectedRoute hrOrAdminOnly={true}>
                <HRDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/hr" element={<Navigate to="/hr-dashboard" replace />} />

          {/* Redirects */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
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

