import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Star,
  UserCheck,
  Users,
} from 'lucide-react';
import { useMockStore } from '../../mocks/MockStoreContext';
import { formatDateTime, formatKZT } from '../../utils/format';

export const ExcursionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { excursions, reviews } = useMockStore();

  const exc = excursions.find((e) => e.id === Number(id));
  if (!exc) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Excursion not found</h2>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline">
          Back to excursions
        </Link>
      </div>
    );
  }

  const excReviews = reviews.filter((r) => r.excursion_id === exc.id);

  return (
    <div className="space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Link>

      {/* Header card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-12">
          <div className="h-64 lg:col-span-5 lg:h-auto">
            <img src={exc.image_url} alt={exc.title} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  {exc.category_name}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {exc.avg_rating} ({exc.review_count} reviews)
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {exc.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{exc.description}</p>

              <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 sm:grid-cols-3">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-900">Meeting Point</div>
                    <div>{exc.meeting_point}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-900">Duration</div>
                    <div>{Math.round(exc.duration_minutes / 60)} hours ({exc.duration_minutes} min)</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-900">Provider</div>
                    <div>{exc.agency_name ? `${exc.agency_name} (Agency)` : `${exc.owner_name} (Guide)`}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <span className="text-xs text-slate-500">Base price per person</span>
                <div className="text-2xl font-extrabold text-slate-900">
                  {formatKZT(exc.base_price_minor)}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                100% refund if cancelled ≥ 24h before departure (FR-30)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two columns: Itinerary Stops + Available Time Slots */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Itinerary stops (FR-01, FR-08, FR-20) */}
        <div className="space-y-6 lg:col-span-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Ordered Itinerary Stops (FR-08)</h2>
            <ol className="mt-4 space-y-4">
              {exc.stops.map((stop) => (
                <li key={stop.id} className="flex gap-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {stop.position}
                  </div>
                  <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">{stop.title}</h3>
                      {stop.duration_minutes && (
                        <span className="text-xs font-medium text-slate-500">
                          {stop.duration_minutes} min
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{stop.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Reviews (FR-20, FR-36) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Tourist Reviews ({excReviews.length})
            </h2>
            {excReviews.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                No written reviews yet. Tourists can leave a review after completing a booking.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {excReviews.map((rev) => (
                  <div key={rev.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{rev.tourist_name}</span>
                      <span className="text-xs font-bold text-amber-600">
                        {'★'.repeat(rev.rating)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scheduled Slots (FR-02, FR-09, FR-20, UC-14/UC-15) */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Upcoming Scheduled Slots (FR-09, FR-20)
              </h2>
              <span className="text-xs font-medium text-slate-500">Select a slot to book</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Note: You can also click the <strong>Sold Out (10/10)</strong> slot to test the Lab04
              FR-02 / UC-15 automatic rejection & alternative slot suggestion flow!
            </p>

            <div className="mt-4 space-y-3">
              {exc.slots.map((slot) => {
                const remaining = slot.max_participants - slot.booked_seats;
                const isSoldOut = remaining <= 0;
                const isCancelled = slot.status === 'cancelled';

                return (
                  <div
                    key={slot.id}
                    className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${
                      isCancelled
                        ? 'border-slate-200 bg-slate-100 opacity-60'
                        : isSoldOut
                          ? 'border-amber-200 bg-amber-50/60'
                          : 'border-slate-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-bold text-slate-900">
                          {formatDateTime(slot.start_at)}
                        </span>
                        {isCancelled && (
                          <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                            Cancelled
                          </span>
                        )}
                        {!isCancelled && isSoldOut && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                            <AlertTriangle className="h-3 w-3" />
                            Sold Out (10/10)
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Booked: <strong>{slot.booked_seats}</strong> / {slot.max_participants}{' '}
                          ({remaining} remaining)
                        </span>
                        <span>·</span>
                        <span className="font-bold text-slate-900">
                          {formatKZT(slot.price_minor)} / seat
                        </span>
                      </div>
                    </div>

                    {!isCancelled && (
                      <button
                        onClick={() => navigate(`/checkout/slot/${slot.id}`)}
                        className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                          isSoldOut
                            ? 'border border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                      >
                        {isSoldOut ? 'Try Booking (Test FR-02)' : 'Book Slot'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
