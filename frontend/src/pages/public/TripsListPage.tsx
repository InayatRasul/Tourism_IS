import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Star, Users } from 'lucide-react';
import { useMockStore } from '../../mocks/MockStoreContext';
import { formatDateOnly, formatKZT } from '../../utils/format';

export const TripsListPage: React.FC = () => {
  const { trips } = useMockStore();
  const published = trips.filter((t) => t.status === 'published');

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 px-6 py-10 text-white sm:px-10">
        <span className="inline-block rounded-full bg-teal-800/80 px-3 py-1 text-xs font-semibold text-teal-200">
          Verified Local Excursion Agencies Only (FR-15)
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          Multi-Day Trip Packages Across Kazakhstan
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          All-in-one multi-day expeditions with transport, accommodation, and day-by-day itineraries.
          Booked as a complete package with real-time seat tracking (FR-16).
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {published.map((trip) => {
          const remaining = trip.total_seats - trip.booked_seats;
          return (
            <Link
              key={trip.id}
              to={`/trips/${trip.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative h-56 overflow-hidden bg-slate-200">
                <img
                  src={trip.image_url}
                  alt={trip.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-lg bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white">
                  {trip.days.length} Days · {trip.agency_name}
                </span>
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-900">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {trip.avg_rating} ({trip.review_count})
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <MapPin className="h-3.5 w-3.5" />
                      {trip.destination}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateOnly(trip.departure_at)} → {formatDateOnly(trip.return_at)}
                    </span>
                  </div>

                  <h2 className="mt-2 text-xl font-bold text-slate-900 group-hover:text-emerald-700">
                    {trip.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{trip.description}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div>
                    <span className="text-xs text-slate-400">Package price</span>
                    <div className="text-xl font-extrabold text-slate-900">
                      {formatKZT(trip.price_per_person_minor)}
                      <span className="text-xs font-normal text-slate-500"> / person</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      <Users className="h-3.5 w-3.5" />
                      {remaining} / {trip.total_seats} seats left
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
