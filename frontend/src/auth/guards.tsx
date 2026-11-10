import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types/models';
import { roleDefaultPath, useAuth } from './AuthContext';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export const RequireRole: React.FC<{ roles: UserRole[]; children: React.ReactNode }> = ({
  roles,
  children,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <h2 className="text-xl font-bold text-amber-900">Access Restricted (403 Forbidden)</h2>
          <p className="mt-2 text-sm text-amber-800">
            Your account role (<span className="font-semibold">{user.role}</span>) does not have
            permission to view this page. Required role: {roles.join(' or ')}.
          </p>
          <a
            href={roleDefaultPath(user.role)}
            className="mt-5 inline-block rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Go to my dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
