import React, { useState } from 'react';
import {
  Ban,
  Building2,
  CheckCircle2,
  FolderKanban,
  LayoutDashboard,
  Receipt,
  Users,
  XCircle,
} from 'lucide-react';
import { useMockStore } from '../../mocks/MockStoreContext';
import { formatDateTime, formatKZT } from '../../utils/format';

export const AdminConsolePage: React.FC = () => {
  const {
    users,
    agencies,
    categories,
    excursions,
    bookings,
    toggleBlockUser,
    setAgencyVerification,
    saveCategory,
  } = useMockStore();

  const [tab, setTab] = useState<'overview' | 'users' | 'agencies' | 'categories' | 'bookings'>(
    'overview'
  );
  const [userSearch, setUserSearch] = useState('');
  const [newCatName, setNewCatName] = useState('');

  const activeExcursionsCount = excursions.filter((e) => e.status === 'published').length;
  const releasedRevenueMinor = bookings
    .filter((b) => b.payment_status === 'released_to_provider' || b.payment_status === 'paid')
    .reduce((sum, b) => sum + b.total_amount_minor, 0);

  const filteredUsers = users.filter((u) =>
    `${u.email} ${u.full_name} ${u.role}`.toLowerCase().includes(userSearch.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Platform Administration (FR-38..FR-41)
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Admin Console</h1>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5">
          {(
            [
              { id: 'overview', label: 'Overview (FR-41)', icon: LayoutDashboard },
              { id: 'users', label: 'Users (FR-38)', icon: Users },
              { id: 'agencies', label: 'Agencies (FR-39)', icon: Building2 },
              { id: 'categories', label: 'Categories (FR-40)', icon: FolderKanban },
              { id: 'bookings', label: 'All Bookings (FR-41)', icon: Receipt },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  tab === item.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* OVERVIEW (FR-41) */}
      {tab === 'overview' && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Total Users</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">{users.length}</div>
            <div className="mt-1 text-xs text-slate-500">
              {users.filter((u) => u.is_blocked).length} blocked
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Published Excursions</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {activeExcursionsCount}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {agencies.filter((a) => a.verification_status === 'pending').length} agency pending
              verification
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">Total Bookings</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">{bookings.length}</div>
            <div className="mt-1 text-xs text-slate-500">
              {bookings.filter((b) => b.status === 'confirmed').length} confirmed active
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase text-slate-500">
              Paid / Released Volume
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-700">
              {formatKZT(releasedRevenueMinor)}
            </div>
            <div className="mt-1 text-xs text-slate-500">Mock payment ledger</div>
          </div>
        </div>
      )}

      {/* USERS (FR-38) */}
      {tab === 'users' && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-900">
              User Accounts — Block / Unblock (FR-38)
            </h2>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by email, name, or role…"
              className="w-64 rounded-xl border border-slate-300 px-3 py-1.5 text-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 pr-4">ID</th>
                  <th className="py-2.5 pr-4">Email / Login</th>
                  <th className="py-2.5 pr-4">Full Name</th>
                  <th className="py-2.5 pr-4">Role</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4 font-mono text-slate-500">#{u.id}</td>
                    <td className="py-3 pr-4 font-bold text-slate-900">{u.email}</td>
                    <td className="py-3 pr-4">{u.full_name}</td>
                    <td className="py-3 pr-4 uppercase font-semibold text-slate-700">{u.role}</td>
                    <td className="py-3 pr-4">
                      {u.is_blocked ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 font-bold text-rose-700">
                          BLOCKED
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => toggleBlockUser(u.id)}
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 font-bold ${
                            u.is_blocked
                              ? 'bg-emerald-600 text-white'
                              : 'border border-rose-200 bg-rose-50 text-rose-700'
                          }`}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {u.is_blocked ? 'Unblock' : 'Block'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AGENCIES (FR-39) */}
      {tab === 'agencies' && (
        <div className="space-y-4">
          {agencies.map((ag) => (
            <div
              key={ag.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                      ag.verification_status === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ag.verification_status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {ag.verification_status}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{ag.city}</span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{ag.name}</h3>
                <p className="mt-1 text-xs text-slate-600">{ag.description}</p>
                <div className="mt-1 text-xs text-slate-500">
                  Contact: {ag.contact_email} · {ag.contact_phone}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAgencyVerification(ag.id, 'verified')}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Verify Agency
                </button>
                <button
                  onClick={() => setAgencyVerification(ag.id, 'rejected')}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CATEGORIES (FR-40) */}
      {tab === 'categories' && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCatName.trim()) return;
              saveCategory({ name: newCatName.trim(), is_active: true });
              setNewCatName('');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="New category name (e.g. Ski & Winter Tours)"
              className="w-72 rounded-xl border border-slate-300 px-3.5 py-2 text-xs"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
            >
              + Add Category (FR-40)
            </button>
          </form>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">{c.name}</div>
                  <div className="text-slate-500">
                    {c.is_active ? 'Active in search' : 'Deactivated'}
                  </div>
                </div>
                <button
                  onClick={() => saveCategory({ id: c.id, name: c.name, is_active: !c.is_active })}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL BOOKINGS & PAYMENTS (FR-41) */}
      {tab === 'bookings' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">
            All Platform Bookings & Payments (FR-41)
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 pr-4">Reference</th>
                  <th className="py-2.5 pr-4">Tourist</th>
                  <th className="py-2.5 pr-4">Offer</th>
                  <th className="py-2.5 pr-4">Departure</th>
                  <th className="py-2.5 pr-4">Amount</th>
                  <th className="py-2.5 pr-4">Booking Status</th>
                  <th className="py-2.5">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="py-3 pr-4 font-mono font-bold text-slate-900">
                      {b.reference_code}
                    </td>
                    <td className="py-3 pr-4">
                      {b.tourist_name} ({b.contact_email})
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{b.offer_title}</td>
                    <td className="py-3 pr-4">{formatDateTime(b.departure_at)}</td>
                    <td className="py-3 pr-4 font-bold">{formatKZT(b.total_amount_minor)}</td>
                    <td className="py-3 pr-4">{b.status}</td>
                    <td className="py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                        {b.payment_status} ({b.transaction_ref})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
