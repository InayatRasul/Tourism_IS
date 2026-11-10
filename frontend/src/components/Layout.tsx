import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Compass,
  CalendarCheck,
  Briefcase,
  ShieldAlert,
  User as UserIcon,
  LogOut,
  RotateCcw,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useMockStore } from '../mocks/MockStoreContext';
import { onServiceUnavailableChange } from '../api/client';
import { healthApi } from '../api/auth';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast, resetDemoData, showToast } = useMockStore();
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = useState<'ok' | 'down' | 'checking'>('checking');

  useEffect(() => {
    onServiceUnavailableChange((unavailable) => {
      if (unavailable) {
        setDbStatus('down');
        navigate('/unavailable');
      }
    });
    healthApi()
      .then(() => setDbStatus('ok'))
      .catch(() => setDbStatus('down'));
  }, [navigate]);

  const handleCheckHealth = async () => {
    setDbStatus('checking');
    try {
      await healthApi();
      setDbStatus('ok');
      showToast('API & PostgreSQL health check passed (200 OK).');
    } catch {
      setDbStatus('down');
      navigate('/unavailable');
    }
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-emerald-50 text-emerald-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900">Tourism IS</span>
                <span className="ml-2 hidden rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 sm:inline-block">
                  Kazakhstan
                </span>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              <NavLink to="/" end className={navClass}>
                Excursions
              </NavLink>
              <NavLink to="/trips" className={navClass}>
                Trip Packages
              </NavLink>

              {user?.role === 'tourist' && (
                <NavLink to="/me/bookings" className={navClass}>
                  <CalendarCheck className="h-4 w-4" />
                  My Bookings
                </NavLink>
              )}

              {(user?.role === 'guide' || user?.role === 'agency_manager') && (
                <NavLink to="/provider" className={navClass}>
                  <Briefcase className="h-4 w-4" />
                  Provider Hub
                </NavLink>
              )}

              {user?.role === 'admin' && (
                <NavLink to="/admin" className={navClass}>
                  <ShieldAlert className="h-4 w-4" />
                  Admin Console
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/me"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm hover:bg-slate-100"
                >
                  <UserIcon className="h-4 w-4 text-emerald-600" />
                  <div className="text-left leading-tight">
                    <div className="font-semibold text-slate-800">{user.full_name}</div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500">
                      {user.role.replace('_', ' ')}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  title="Sign out"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-md items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-950/95 px-4 py-3 text-sm font-medium text-white shadow-xl">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <div>
            <span className="font-semibold text-slate-700">Tourism IS</span> — Plan Trips & Plan
            Excursions · KBTU Course Project
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCheckHealth}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              DB Status:{' '}
              <span
                className={
                  dbStatus === 'ok'
                    ? 'font-semibold text-emerald-600'
                    : dbStatus === 'down'
                      ? 'font-semibold text-rose-600'
                      : 'text-slate-500'
                }
              >
                {dbStatus.toUpperCase()}
              </span>
            </button>
            <button
              onClick={resetDemoData}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Demo Store
            </button>
            <Link to="/unavailable" className="text-slate-400 underline hover:text-slate-600">
              Preview 503 Page (NFR-02)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
