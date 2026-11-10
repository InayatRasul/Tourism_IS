import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useMockStore } from '../../mocks/MockStoreContext';
import { formatDateTime } from '../../utils/format';

export const ProfilePage: React.FC = () => {
  const { user, updateProfileLocal } = useAuth();
  const { showToast } = useMockStore();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileLocal({ full_name: fullName, phone });
    setNewPassword('');
    showToast('Profile settings updated (FR-06).');
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          Account Settings (FR-06)
        </span>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">My Profile</h1>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
          <UserCheck className="h-6 w-6 text-emerald-600" />
          <div className="text-xs">
            <div className="font-bold text-slate-900">
              {user.email} · Role: <span className="uppercase">{user.role}</span>
            </div>
            <div className="text-slate-500">Account created: {formatDateTime(user.created_at)}</div>
          </div>
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
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
          />
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
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Change Password (optional)
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Save Profile
        </button>
      </form>
    </div>
  );
};
