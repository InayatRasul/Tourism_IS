import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, MapPin, ShieldCheck, Users } from 'lucide-react';
import { useMockStore } from '../../mocks/MockStoreContext';
import { formatDateTime, formatKZT } from '../../utils/format';

export const TripDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { trips } = useMockStore();

  const trip = trips.find((t) => t.id === Number(id));
  if (!trip) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Trip package not found</h2>
        <Link
          to="/trips"
          className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline"
        >
          Back to trip packages
        </Link>
      </div>
    );
  }

  const remaining = trip.total_seats - trip.booked_seats;

  return (
    <div className="space-y-8">
      <Link
        to="/trips"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to trip packages
      </Link>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-12">
          <div className="h-64 lg:col-span-5 lg:h-auto">
            <img src={trip.image_url} alt={trip.title} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified Agency: {trip.agency_name}
              </div>
              <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {trip.title}
              </h1>
              <p className="mt-2 text-sm text-slate-600">{trip.description}</p>

              <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 sm:grid-cols-3">
                <div>
                  <div className="font-bold text-slate-900">Destination</div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    {trip.destination}
                  </div>
                </div>
                <div>
                  <div className="font-bold text-slate-900">Departure → Return</div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    {formatDateTime(trip.departure_at)}
                  </div>
                </div>
                <div>
                  <div className="font-bold text-slate-900">Availability</div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                    {remaining} of {trip.total_seats} seats left
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-950">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Included Services (FR-15)
                </div>
                <p className="mt-1 text-emerald-900/90">{trip.included_services}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <div>
                <span className="text-xs text-slate-500">Fixed package price per person</span>
                <div className="text-2xl font-extrabold text-slate-900">
                  {formatKZT(trip.price_per_person_minor)}
                </div>
              </div>
              <button
                onClick={() => navigate(`/checkout/trip/${trip.id}`)}
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
              >
                Book Trip Package
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Day-by-day itinerary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Day-by-Day Itinerary (FR-15)</h2>
        <div className="mt-4 space-y-4">
          {trip.days.map((d) => (
            <div
              key={d.id}
              className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white">
                Day {d.day_number}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{d.title}</h3>
                <p className="mt-1 text-xs text-slate-600">{d.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
