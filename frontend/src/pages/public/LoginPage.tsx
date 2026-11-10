import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import { roleDefaultPath, useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../api/client';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await login({ email, password });
      navigate(from || roleDefaultPath(u.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const quickFill = (loginVal: string, pwVal: string) => {
    setEmail(loginVal);
    setPassword(pwVal);
    setError(null);
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-8 py-6 md:grid-cols-12">
      {/* Form card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 md:col-span-7">
        <div className="flex items-center gap-2.5 text-emerald-700">
          <LogIn className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Real PostgreSQL Auth</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Sign in to Tourism IS</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your email (or <code className="rounded bg-slate-100 px-1.5 py-0.5">admin</code>) and
          password.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Email or Username
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. tourist@tis.kz or admin"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don’t have an account yet?{' '}
          <Link to="/register" className="font-semibold text-emerald-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      {/* Seeded accounts helper */}
      <div className="flex flex-col justify-between rounded-2xl border border-emerald-200 bg-emerald-950 p-6 text-white sm:p-7 md:col-span-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3 py-1 text-xs font-semibold text-emerald-200">
            <Sparkles className="h-3.5 w-3.5" />
            Seeded Database Accounts
          </div>
          <h2 className="mt-3 text-lg font-bold">One-Click Role Logins</h2>
          <p className="mt-1 text-xs text-emerald-200/90">
            These accounts are automatically seeded in PostgreSQL on startup. Click any role below to
            fill credentials:
          </p>

          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => quickFill('admin', 'admin')}
              className="flex w-full items-center justify-between rounded-xl border border-emerald-700/70 bg-emerald-900/60 px-3.5 py-2.5 text-left text-xs transition hover:bg-emerald-800/80"
            >
              <div>
                <div className="font-bold text-white">Admin (Platform Administrator)</div>
                <div className="text-emerald-300">Login: admin · Password: admin</div>
              </div>
              <KeyRound className="h-4 w-4 text-emerald-300" />
            </button>

            <button
              type="button"
              onClick={() => quickFill('tourist@tis.kz', 'Passw0rd!')}
              className="flex w-full items-center justify-between rounded-xl border border-emerald-700/70 bg-emerald-900/60 px-3.5 py-2.5 text-left text-xs transition hover:bg-emerald-800/80"
            >
              <div>
                <div className="font-bold text-white">Tourist (Timur Tourist)</div>
                <div className="text-emerald-300">tourist@tis.kz · Passw0rd!</div>
              </div>
              <KeyRound className="h-4 w-4 text-emerald-300" />
            </button>

            <button
              type="button"
              onClick={() => quickFill('guide@tis.kz', 'Passw0rd!')}
              className="flex w-full items-center justify-between rounded-xl border border-emerald-700/70 bg-emerald-900/60 px-3.5 py-2.5 text-left text-xs transition hover:bg-emerald-800/80"
            >
              <div>
                <div className="font-bold text-white">Independent Guide (Aidar Guide)</div>
                <div className="text-emerald-300">guide@tis.kz · Passw0rd!</div>
              </div>
              <KeyRound className="h-4 w-4 text-emerald-300" />
            </button>

            <button
              type="button"
              onClick={() => quickFill('manager@tis.kz', 'Passw0rd!')}
              className="flex w-full items-center justify-between rounded-xl border border-emerald-700/70 bg-emerald-900/60 px-3.5 py-2.5 text-left text-xs transition hover:bg-emerald-800/80"
            >
              <div>
                <div className="font-bold text-white">Agency Manager (Steppe Explorers)</div>
                <div className="text-emerald-300">manager@tis.kz · Passw0rd!</div>
              </div>
              <KeyRound className="h-4 w-4 text-emerald-300" />
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-xl bg-emerald-900/50 p-3 text-[11px] text-emerald-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span>
            Passwords are verified against bcrypt hashes in PostgreSQL and return a signed HS256 JWT
            token (FR-05, NFR-03).
          </span>
        </div>
      </div>
    </div>
  );
};
