import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Mail,
  MessageSquarePlus,
  Ticket,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useMockStore } from '../../mocks/MockStoreContext';
import { formatDateTime, formatKZT, hoursUntil } from '../../utils/format';

export const MyBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const { bookings, cancelBookingByTourist, submitReview, notifications } = useMockStore();

  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Show current tourist's bookings, or all sample tourist bookings so new registered accounts can also explore
  const myBookings = bookings.filter(
    (b) => b.tourist_id === user?.id || b.tourist_id === 4
  );

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBookingId || !user) return;
    submitReview({
      bookingId: reviewBookingId,
      touristId: user.id,
      touristName: user.full_name,
      rating,
      comment,
    });
    setReviewBookingId(null);
    setComment('');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Tourist Dashboard (UC-17, UC-18, UC-19)
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            My Bookings & Reference Codes
          </h1>
        </div>
        <Link
          to="/"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
        >
          + Book Another Excursion
        </Link>
      </div>

      <div className="space-y-4">
        {myBookings.map((b) => {
          const hrs = hoursUntil(b.departure_at);
          const isFuture = hrs > 0;
          const isRefundable = hrs >= 24;

          return (
            <div
              key={b.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white">
                      <Ticket className="h-3.5 w-3.5 text-emerald-400" />
                      {b.reference_code}
                    </span>
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                        b.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Status: {b.status.replace(/_/g, ' ')}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Payment: {b.payment_status.replace(/_/g, ' ')} ({b.transaction_ref})
                    </span>
                  </div>

                  <h2 className="mt-2.5 text-lg font-bold text-slate-900">{b.offer_title}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      Departure: <strong>{formatDateTime(b.departure_at)}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Seats: <strong>{b.seats}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Total Paid: <strong>{formatKZT(b.total_amount_minor)}</strong>
                    </span>
                    {b.refunded_amount_minor > 0 && (
                      <span className="font-bold text-emerald-700">
                        (Refunded: {formatKZT(b.refunded_amount_minor)})
                      </span>
                    )}
                  </div>
                  {b.special_requests && (
                    <p className="mt-1.5 text-xs italic text-slate-500">
                      Special request: “{b.special_requests}”
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2">
                  {b.status === 'confirmed' && isFuture && (
                    <>
                      <span
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                          isRefundable
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {isRefundable
                          ? `≥ 24h left (${Math.round(hrs)}h) → 100% Refundable (FR-30)`
                          : `< 24h left (${Math.round(hrs)}h) → Non-Refundable (BR-01)`}
                      </span>

                      {confirmCancelId === b.id ? (
                        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5">
                          <span className="text-xs font-bold text-rose-900">
                            {isRefundable
                              ? 'Confirm 100% refund cancellation?'
                              : 'Warning (BR-01): <24h is non-refundable! Confirm?'}
                          </span>
                          <button
                            onClick={() => {
                              cancelBookingByTourist(b.id);
                              setConfirmCancelId(null);
                            }}
                            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-500"
                          >
                            Yes, Cancel
                          </button>
                          <button
                            onClick={() => setConfirmCancelId(null)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmCancelId(b.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel Booking
                        </button>
                      )}
                    </>
                  )}

                  {b.status === 'completed' && !b.has_review && (
                    <button
                      onClick={() => setReviewBookingId(b.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-400"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      Leave Review (FR-35)
                    </button>
                  )}

                  {b.status === 'completed' && b.has_review && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Review Submitted
                    </span>
                  )}
                </div>
              </div>

              {/* Inline Review Form (FR-35) */}
              {reviewBookingId === b.id && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4"
                >
                  <div className="text-xs font-bold text-slate-900">
                    Rate Your Completed Experience — {b.offer_title}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-700">Rating (1–5):</label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold"
                    >
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {r} ★
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share how the guide, itinerary, and timing went…"
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white"
                    >
                      Publish Review
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewBookingId(null)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {/* Email Notification Log Preview (FR-03, §4.10) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Mail className="h-4 w-4 text-emerald-600" />
          Email Notification Log (FR-03, FR-10, FR-34)
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Every booking confirmation, schedule change, or cancellation is logged in{' '}
          <code className="rounded bg-slate-100 px-1">notification_logs</code>:
        </p>
        <div className="mt-3 space-y-2">
          {notifications.slice(0, 6).map((n) => (
            <div
              key={n.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2 text-xs"
            >
              <div>
                <span className="font-semibold text-slate-900">{n.subject}</span>
                <span className="ml-2 text-slate-500">→ {n.recipient_email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  {n.status.toUpperCase()}
                </span>
                <span className="text-[11px] text-slate-400">{formatDateTime(n.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-xs text-slate-600">
        <AlertCircle className="h-4 w-4 shrink-0 text-slate-500" />
        <span>
          Tip: Booking <strong>TIS-8F3K2A</strong> departs in 4 days (test ≥24h full refund), while{' '}
          <strong>TIS-4L9P1Q</strong> departs in 18 hours (test &lt;24h BR-01 non-refundable
          release to provider).
        </span>
      </div>
    </div>
  );
};
