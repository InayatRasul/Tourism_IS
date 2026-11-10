import React, { useState } from 'react';
import {
  Building2,
  CalendarPlus,
  Clock,
  FilePlus2,
  MapPin,
  PackagePlus,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useMockStore } from '../../mocks/MockStoreContext';
import { formatDateTime, formatKZT } from '../../utils/format';

export const ProviderHubPage: React.FC = () => {
  const { user } = useAuth();
  const {
    categories,
    excursions,
    trips,
    bookings,
    agencies,
    addSlotToExcursion,
    rescheduleSlot,
    cancelSlotByProvider,
    saveExcursion,
    saveTripPackage,
    cancelTripByProvider,
    saveAgencyProfile,
  } = useMockStore();

  const isManager = user?.role === 'agency_manager';
  const myAgency =
    agencies.find((a) => a.manager_user_id === user?.id) ||
    (isManager ? agencies[0] : undefined);

  const [activeTab, setActiveTab] = useState<'excursions' | 'bookings' | 'trips' | 'agency'>(
    'excursions'
  );

  // New excursion form state (FR-01, FR-08)
  const [showNewExc, setShowNewExc] = useState(false);
  const [excTitle, setExcTitle] = useState('');
  const [excCity, setExcCity] = useState('Almaty');
  const [excCatId, setExcCatId] = useState(2);
  const [excMeet, setExcMeet] = useState('');
  const [excDuration, setExcDuration] = useState(240);
  const [excPriceKZT, setExcPriceKZT] = useState(12000);
  const [excDesc, setExcDesc] = useState('');
  const [excStatus, setExcStatus] = useState<'draft' | 'published'>('published');
  const [stopsText, setStopsText] = useState(
    'Meet at Main Square | Welcome briefing\nOld Town Viewpoint | Guided walk & photos'
  );

  // Add slot state (FR-09)
  const [slotExcId, setSlotExcId] = useState<number | null>(null);
  const [slotDate, setSlotDate] = useState(() => {
    const d = new Date(Date.now() + 5 * 86400000);
    return d.toISOString().slice(0, 16);
  });
  const [slotPriceKZT, setSlotPriceKZT] = useState(15000);
  const [slotMaxP, setSlotMaxP] = useState(12);

  // New Trip Package state (FR-15)
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [tripTitle, setTripTitle] = useState('');
  const [tripDest, setTripDest] = useState('Turkestan & Otrar');
  const [tripPriceKZT, setTripPriceKZT] = useState(95000);
  const [tripSeats, setTripSeats] = useState(15);
  const [tripServices, setTripServices] = useState('Hotel, high-speed train tickets, guide, breakfasts');
  const [tripDesc, setTripDesc] = useState('');

  // Agency profile form (FR-07)
  const [agName, setAgName] = useState(myAgency?.name || 'My Local Agency');
  const [agCity, setAgCity] = useState(myAgency?.city || 'Almaty');
  const [agEmail, setAgEmail] = useState(myAgency?.contact_email || user?.email || '');
  const [agPhone, setAgPhone] = useState(myAgency?.contact_phone || user?.phone || '');
  const [agDesc, setAgDesc] = useState(myAgency?.description || '');

  const handleCreateExcursion = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find((c) => c.id === excCatId) || categories[0];
    const parsedStops = stopsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        const [t, d] = line.split('|').map((s) => s.trim());
        return {
          id: Date.now() + idx,
          excursion_id: 0,
          position: idx + 1,
          title: t || `Stop ${idx + 1}`,
          description: d || '',
          duration_minutes: 60,
        };
      });

    saveExcursion({
      owner_user_id: user?.id || 2,
      owner_name: user?.full_name || 'Guide',
      agency_id: isManager ? myAgency?.id : undefined,
      agency_name: isManager ? myAgency?.name : undefined,
      category_id: cat.id,
      category_name: cat.name,
      title: excTitle,
      description: excDesc,
      city: excCity,
      meeting_point: excMeet,
      duration_minutes: excDuration,
      base_price_minor: excPriceKZT * 100,
      status:
        isManager && myAgency?.verification_status !== 'verified' ? 'draft' : excStatus,
      image_url:
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
      stops: parsedStops,
    });
    setShowNewExc(false);
    setExcTitle('');
    setExcDesc('');
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotExcId) return;
    addSlotToExcursion(slotExcId, {
      start_at: new Date(slotDate).toISOString(),
      price_minor: slotPriceKZT * 100,
      max_participants: slotMaxP,
    });
    setSlotExcId(null);
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    saveTripPackage({
      agency_id: myAgency?.id || 1,
      agency_name: myAgency?.name || 'Steppe Explorers',
      category_id: 6,
      category_name: 'Multi-day trip',
      title: tripTitle,
      description: tripDesc,
      destination: tripDest,
      departure_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      return_at: new Date(Date.now() + 17 * 86400000).toISOString(),
      price_per_person_minor: tripPriceKZT * 100,
      total_seats: tripSeats,
      included_services: tripServices,
      status: myAgency?.verification_status === 'verified' ? 'published' : 'draft',
      image_url:
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
      days: [
        { id: Date.now() + 1, trip_package_id: 0, day_number: 1, title: 'Day 1 Arrival', description: 'Welcome tour and check-in' },
        { id: Date.now() + 2, trip_package_id: 0, day_number: 2, title: 'Day 2 Main Sightseeing', description: 'Guided exploration' },
      ],
    });
    setShowNewTrip(false);
    setTripTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Provider Workspace ({user?.role === 'guide' ? 'Independent Guide' : 'Agency Manager'})
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Manage Excursions, Slots & Participant Rosters
          </h1>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5">
          <button
            onClick={() => setActiveTab('excursions')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === 'excursions'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Excursions & Slots (FR-01)
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === 'bookings'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Participants & Bookings (FR-13)
          </button>
          <button
            onClick={() => setActiveTab('trips')}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === 'trips'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Trip Packages (FR-15)
          </button>
          {isManager && (
            <button
              onClick={() => setActiveTab('agency')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeTab === 'agency'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Agency Profile (FR-07)
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: EXCURSIONS & SLOTS */}
      {activeTab === 'excursions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              Create custom itineraries, add time slots with participant capacity limits, reschedule
              (FR-10), or cancel with automatic 100% tourist refund (FR-11).
            </p>
            <button
              onClick={() => setShowNewExc(!showNewExc)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
            >
              <FilePlus2 className="h-4 w-4" />
              {showNewExc ? 'Close Form' : 'New Excursion (FR-01)'}
            </button>
          </div>

          {showNewExc && (
            <form
              onSubmit={handleCreateExcursion}
              className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-base font-bold text-slate-900">
                Create Excursion & Ordered Itinerary Stops (FR-01, FR-08)
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600">Title</label>
                  <input
                    required
                    value={excTitle}
                    onChange={(e) => setExcTitle(e.target.value)}
                    placeholder="e.g. Issyk Lake & Golden Man Museum Tour"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600">Category</label>
                  <select
                    value={excCatId}
                    onChange={(e) => setExcCatId(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600">City</label>
                  <input
                    required
                    value={excCity}
                    onChange={(e) => setExcCity(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600">Meeting Point</label>
                  <input
                    required
                    value={excMeet}
                    onChange={(e) => setExcMeet(e.target.value)}
                    placeholder="Central Stadium Gate"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600">Duration (min)</label>
                  <input
                    type="number"
                    min={30}
                    required
                    value={excDuration}
                    onChange={(e) => setExcDuration(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600">Base Price (KZT)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={excPriceKZT}
                    onChange={(e) => setExcPriceKZT(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600">Description</label>
                <textarea
                  rows={2}
                  required
                  value={excDesc}
                  onChange={(e) => setExcDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600">
                  Ordered Itinerary Stops (one per line: Stop Title | Description)
                </label>
                <textarea
                  rows={3}
                  value={stopsText}
                  onChange={(e) => setStopsText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between">
                <select
                  value={excStatus}
                  onChange={(e) => setExcStatus(e.target.value as 'draft' | 'published')}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
                >
                  <option value="published">Publish Immediately</option>
                  <option value="draft">Save as Draft</option>
                </select>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white"
                >
                  Save Excursion
                </button>
              </div>
            </form>
          )}

          {/* List of excursions & their slots */}
          <div className="space-y-4">
            {excursions.map((exc) => (
              <div
                key={exc.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                        {exc.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {exc.category_name} · {exc.city}
                      </span>
                    </div>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">{exc.title}</h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {exc.meeting_point}
                      </span>
                      <span>·</span>
                      <span>Base price: {formatKZT(exc.base_price_minor)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSlotExcId(slotExcId === exc.id ? null : exc.id);
                      setSlotPriceKZT(Math.round(exc.base_price_minor / 100));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    + Add Slot (FR-09)
                  </button>
                </div>

                {/* Add slot inline form */}
                {slotExcId === exc.id && (
                  <form
                    onSubmit={handleAddSlot}
                    className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 sm:grid-cols-4"
                  >
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">
                        Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={slotDate}
                        onChange={(e) => setSlotDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">
                        Slot Price (KZT)
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={slotPriceKZT}
                        onChange={(e) => setSlotPriceKZT(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">
                        Max Participants (FR-01)
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={slotMaxP}
                        onChange={(e) => setSlotMaxP(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        Create Slot
                      </button>
                    </div>
                  </form>
                )}

                {/* Slots table */}
                <div className="mt-4 space-y-2">
                  {exc.slots.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold text-slate-900">
                          {formatDateTime(s.start_at)}
                        </span>
                        <span className="text-slate-600">
                          Booked: <strong>{s.booked_seats}</strong> / {s.max_participants}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formatKZT(s.price_minor)}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            s.status === 'open'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>

                      {s.status === 'open' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const nextTime = new Date(
                                new Date(s.start_at).getTime() + 2 * 3600 * 1000
                              ).toISOString();
                              rescheduleSlot(s.id, nextTime);
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Reschedule +2h (FR-10)
                          </button>
                          <button
                            onClick={() => cancelSlotByProvider(s.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancel & 100% Refund (FR-11)
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PARTICIPANT ROSTER & BOOKINGS (FR-13) */}
      {activeTab === 'bookings' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Users className="h-5 w-5 text-emerald-600" />
            Participant Contacts & Bookings Roster (FR-13)
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase">
                <tr>
                  <th className="py-2.5 pr-4">Ref Code</th>
                  <th className="py-2.5 pr-4">Offer</th>
                  <th className="py-2.5 pr-4">Participant Contact</th>
                  <th className="py-2.5 pr-4">Seats / Amount</th>
                  <th className="py-2.5 pr-4">Special Requests</th>
                  <th className="py-2.5">Status / Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="py-3 pr-4 font-mono font-bold text-slate-900">
                      {b.reference_code}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-bold text-slate-900">{b.offer_title}</div>
                      <div className="text-slate-500">{formatDateTime(b.departure_at)}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-900">{b.tourist_name}</div>
                      <div className="text-slate-500">
                        {b.contact_email} · {b.contact_phone}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <strong>{b.seats}</strong> seats · {formatKZT(b.total_amount_minor)}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {b.special_requests || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                        {b.status} / {b.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRIP PACKAGES (FR-15..17, BR-09) */}
      {activeTab === 'trips' && (
        <div className="space-y-4">
          {!isManager ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              <strong>Business Rule BR-09:</strong> Independent tour guides can create excursions and
              time slots, but only verified <strong>Agency Managers</strong> can create multi-day
              Trip Packages. Log in as <code className="font-bold">manager@tis.kz</code> to create
              trip packages.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Publish fixed-date multi-day packages with total seats and day-by-day itineraries
                  (FR-15).
                </p>
                <button
                  onClick={() => setShowNewTrip(!showNewTrip)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
                >
                  <PackagePlus className="h-4 w-4" />
                  {showNewTrip ? 'Close Form' : 'New Trip Package'}
                </button>
              </div>

              {showNewTrip && (
                <form
                  onSubmit={handleCreateTrip}
                  className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-base font-bold text-slate-900">
                    Create Multi-Day Trip Package (FR-15)
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-600">Package Title</label>
                      <input
                        required
                        value={tripTitle}
                        onChange={(e) => setTripTitle(e.target.value)}
                        placeholder="e.g. Turkestan & Aksu-Zhabagly 3-Day Cultural Tour"
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600">Destination</label>
                      <input
                        required
                        value={tripDest}
                        onChange={(e) => setTripDest(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-600">
                        Price per Person (KZT)
                      </label>
                      <input
                        type="number"
                        required
                        value={tripPriceKZT}
                        onChange={(e) => setTripPriceKZT(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600">Total Seats</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={tripSeats}
                        onChange={(e) => setTripSeats(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600">
                      Included Services
                    </label>
                    <input
                      required
                      value={tripServices}
                      onChange={(e) => setTripServices(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600">Description</label>
                    <textarea
                      rows={2}
                      required
                      value={tripDesc}
                      onChange={(e) => setTripDesc(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white"
                  >
                    Publish Trip Package
                  </button>
                </form>
              )}

              {trips.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                      {t.status}
                    </span>
                    <h3 className="mt-1 text-base font-bold text-slate-900">{t.title}</h3>
                    <p className="text-xs text-slate-500">
                      {t.destination} · {formatKZT(t.price_per_person_minor)} · Booked{' '}
                      {t.booked_seats}/{t.total_seats}
                    </p>
                  </div>
                  {t.status === 'published' && (
                    <button
                      onClick={() => cancelTripByProvider(t.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    >
                      Cancel Trip & Refund 100% (FR-17)
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* TAB 4: AGENCY PROFILE (FR-07) */}
      {activeTab === 'agency' && isManager && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveAgencyProfile(user!.id, {
              name: agName,
              city: agCity,
              contact_email: agEmail,
              contact_phone: agPhone,
              description: agDesc,
            });
          }}
          className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Building2 className="h-5 w-5 text-emerald-600" />
              Agency Profile (FR-07)
            </div>
            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 uppercase">
              Status: {myAgency?.verification_status || 'pending'}
            </span>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600">Agency Name</label>
            <input
              required
              value={agName}
              onChange={(e) => setAgName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-600">City</label>
              <input
                required
                value={agCity}
                onChange={(e) => setAgCity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Contact Phone</label>
              <input
                required
                value={agPhone}
                onChange={(e) => setAgPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600">Contact Email</label>
            <input
              type="email"
              required
              value={agEmail}
              onChange={(e) => setAgEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600">Description</label>
            <textarea
              rows={3}
              value={agDesc}
              onChange={(e) => setAgDesc(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white"
          >
            Save Agency Profile
          </button>
        </form>
      )}
    </div>
  );
};
