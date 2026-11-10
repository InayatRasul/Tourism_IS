import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { roleDefaultPath, useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../api/client';
import { UserRole } from '../../types/models';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>('tourist');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+770');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);

    try {
      const user = await register({
        email,
        password,
        full_name: fullName,
        phone,
        role,
      });
      navigate(roleDefaultPath(user.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details) {
          setFieldErrors(err.details);
        }
        setGeneralError(err.message);
      } else {
        setGeneralError('Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 text-emerald-700">
          <UserPlus className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Create Account (FR-04)</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Join Tourism IS</h1>
        <p className="mt-1 text-sm text-slate-500">
          Register as a Tourist, an Independent Guide, or an Excursion Agency Manager.
        </p>

        {generalError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Account Role
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'tourist', title: 'Tourist', desc: 'Book excursions & trips' },
                  { id: 'guide', title: 'Tour Guide', desc: 'Publish custom excursions' },
                  { id: 'agency_manager', title: 'Agency Manager', desc: 'Excursions & multi-day trips' },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    role === r.id
                      ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">{r.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{r.desc}</div>
                </button>
              ))}
            </div>
            {fieldErrors.role && (
              <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.role}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aruzhan Kassymova"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
            {fieldErrors.full_name && (
              <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.full_name}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+77012345678"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.phone}</p>
              )}
            </div>
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
              placeholder="At least 8 chars with a letter and a digit"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
