import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Renders children (or nested routes) only for signed-in users; otherwise redirects to /login and remembers the target. */
export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children ?? <Outlet />}</>;
}

/**
 * Client-side guard for admin pages. This is only a UX convenience:
 * the server enforces admin permissions on every admin route.
 */
export function AdminRoute({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children ?? <Outlet />}</>;
}
