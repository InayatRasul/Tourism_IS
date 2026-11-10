import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Search, SlidersHorizontal, Star, Users } from 'lucide-react';
import { useMockStore } from '../../mocks/MockStoreContext';
import { formatDateTime, formatKZT } from '../../utils/format';

export const ExcursionsSearchPage: React.FC = () => {
  const { excursions, categories } = useMockStore();

  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('all');
  const [categoryId, setCategoryId] = useState<number | 'all'>('all');
  const [maxPriceKZT, setMaxPriceKZT] = useState<number>(50000);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc' | 'date'>('rating');

  const cities = useMemo(() => {
    const s = new Set(excursions.map((e) => e.city));
    return Array.from(s);
  }, [excursions]);

  const filtered = useMemo(() => {
    return excursions
      .filter((e) => e.status === 'published')
      .filter((e) => {
        if (
          keyword.trim() &&
          !`${e.title} ${e.description} ${e.city}`
            .toLowerCase()
            .includes(keyword.trim().toLowerCase())
        ) {
          return false;
        }
        if (city !== 'all' && e.city !== city) return false;
        if (categoryId !== 'all' && e.category_id !== categoryId) return false;
        if (e.base_price_minor / 100 > maxPriceKZT) return false;
        if (e.avg_rating < minRating) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.base_price_minor - b.base_price_minor;
        if (sortBy === 'price_desc') return b.base_price_minor - a.base_price_minor;
        if (sortBy === 'date') {
          const nextA = a.slots[0]?.start_at || '9999';
          const nextB = b.slots[0]?.start_at || '9999';
          return nextA.localeCompare(nextB);
        }
        return b.avg_rating - a.avg_rating;
      });
  }, [excursions, keyword, city, categoryId, maxPriceKZT, minRating, sortBy]);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 px-6 py-10 text-white shadow-md sm:px-10">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full bg-emerald-700/70 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-100">
            Real-Time Seat Capacity · Zero Overbooking (FR-02)
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Discover Local Excursions & Guided Day Trips
          </h1>
          <p className="mt-2 text-sm text-emerald-100/90 sm:text-base">
            Book directly with verified independent guides and small Kazakhstani excursion agencies
            with instant seat reservation and transparent 24-hour cancellation rules.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar (FR-18, FR-19) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
          Search & Filter Excursions (FR-19)
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search lake, canyon, walking tour…"
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              <option value="all">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories
                .filter((c) => c.is_active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              <option value={0}>Any Rating</option>
              <option value={4.5}>4.5+ ★</option>
              <option value={4.8}>4.8+ ★</option>
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              <option value="rating">Sort: Highest Rated</option>
              <option value="price_asc">Sort: Price Low → High</option>
              <option value="price_desc">Sort: Price High → Low</option>
              <option value="date">Sort: Earliest Slot</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <label className="font-medium">
              Max Price: <span className="font-bold text-slate-900">{maxPriceKZT.toLocaleString()} ₸</span>
            </label>
            <input
              type="range"
              min={5000}
              max={50000}
              step={1000}
              value={maxPriceKZT}
              onChange={(e) => setMaxPriceKZT(Number(e.target.value))}
              className="accent-emerald-600"
            />
          </div>
          <div>
            Showing <span className="font-bold text-slate-900">{filtered.length}</span> published
            excursion(s)
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-base font-semibold text-slate-700">No excursions match your filters.</p>
          <button
            onClick={() => {
              setKeyword('');
              setCity('all');
              setCategoryId('all');
              setMaxPriceKZT(50000);
              setMinRating(0);
            }}
            className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((exc) => {
            const openSlots = exc.slots.filter((s) => s.status === 'open');
            const nextSlot = openSlots[0];
            const totalRemaining = openSlots.reduce(
              (acc, s) => acc + (s.max_participants - s.booked_seats),
              0
            );

            return (
              <Link
                key={exc.id}
                to={`/excursions/${exc.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-48 overflow-hidden bg-slate-200">
                  <img
                    src={exc.image_url}
                    alt={exc.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-lg bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                    {exc.category_name}
                  </span>
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {exc.avg_rating} ({exc.review_count})
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <MapPin className="h-3.5 w-3.5" />
                        {exc.city}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {Math.round(exc.duration_minutes / 60)} hrs
                      </span>
                    </div>

                    <h2 className="mt-1.5 text-lg font-bold text-slate-900 group-hover:text-emerald-700">
                      {exc.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{exc.description}</p>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        By{' '}
                        <strong className="text-slate-700">
                          {exc.agency_name || exc.owner_name}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <Users className="h-3.5 w-3.5" />
                        {totalRemaining} seats across {openSlots.length} slot(s)
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-400">From </span>
                        <span className="text-lg font-extrabold text-slate-900">
                          {formatKZT(exc.base_price_minor)}
                        </span>
                        <span className="text-xs text-slate-500"> / person</span>
                      </div>
                      {nextSlot && (
                        <span className="text-[11px] text-slate-500">
                          Next: {formatDateTime(nextSlot.start_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
