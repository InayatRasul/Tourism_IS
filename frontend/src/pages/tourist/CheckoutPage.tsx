import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Calendar, CheckCircle2, CreditCard, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { SoldOutResult, useMockStore } from '../../mocks/MockStoreContext';
import { formatDateTime, formatKZT } from '../../utils/format';

export const CheckoutPage: React.FC = () => {
  const { kind, id } = useParams<{ kind: 'slot' | 'trip'; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { excursions, trips, bookExcursionSlot, bookTripPackage } = useMockStore();

  const [seats, setSeats] = useState(1);
  const [contactEmail, setContactEmail] = useState(user?.email.includes('@') ? user.email : 'tourist@tis.kz');
  const [contactPhone, setContactPhone] = useState(user?.phone || '+77033334455');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentToken, setPaymentToken] = useState('mock-ok');
  const [soldOutState, setSoldOutState] = useState<SoldOutResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const numId = Number(id);
  const isSlot = kind === 'slot';

  const exc = isSlot
    ? excursions.find((e) => e.slots.some((s) => s.id === numId))
    : undefined;
  const slot = isSlot ? exc?.slots.find((s) => s.id === numId) : undefined;
  const trip = !isSlot ? trips.find((t) => t.id === numId) : undefined;

  if ((isSlot && (!exc || !slot)) || (!isSlot && !trip)) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Offer not found</h2>
        <Link to="/" className="mt-2 inline-block text-sm font-semibold text-emerald-700 underline">
          Return to search
        </Link>
      </div>
    );
  }

  const unitPrice = isSlot ? slot!.price_minor : trip!.price_per_person_minor;
  const remainingSeats = isSlot
    ? slot!.max_participants - slot!.booked_seats
    : trip!.total_seats - trip!.booked_seats;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSoldOutState(null);

    if (!contactEmail.trim() || !contactPhone.trim()) {
      setErrorMsg('Contact email and phone number are mandatory at checkout (FR-22, BR-05).');
      return;
    }

    try {
      if (isSlot) {
        const res = bookExcursionSlot({
          slotId: slot!.id,
          touristId: user!.id,
          touristName: user!.full_name,
          seats,
          contactEmail,
          contactPhone,
          specialRequests: specialRequests.trim() || undefined,
          paymentToken,
        });
        if (res.soldOut) {
          setSoldOutState(res);
          return;
        }
        navigate('/me/bookings');
      } else {
        const res = bookTripPackage({
          tripId: trip!.id,
          touristId: user!.id,
          touristName: user!.full_name,
          seats,
          contactEmail,
          contactPhone,
          specialRequests: specialRequests.trim() || undefined,
          paymentToken,
        });
        if (!res.ok) {
          setErrorMsg(res.message);
          return;
        }
        navigate('/me/bookings');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Checkout failed.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          Atomic Seat Reservation & Mock Payment (FR-02, FR-22..28)
        </span>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Complete Your Booking</h1>
      </div>

      {/* Lab04 Sold Out Banner with Alternatives (FR-02, FR-21, UC-15) */}
      {soldOutState && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
                HTTP 409 · SOLD_OUT (Lab04 FR-02 / FR-21 Acceptance Criterion)
              </div>
              <h2 className="mt-1 text-lg font-extrabold text-amber-950">{soldOutState.message}</h2>
              <p className="mt-1 text-xs text-amber-900">
                Alternative available time slots for <strong>{exc?.title}</strong> with at least{' '}
                {seats} open seat(s):
              </p>

              {soldOutState.alternatives.length === 0 ? (
                <p className="mt-3 text-xs font-semibold text-amber-900">
                  No other slots currently have enough open seats for this excursion.
                </p>
              ) : (
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {soldOutState.alternatives.map((alt) => (
                    <button
                      key={alt.id}
                      type="button"
                      onClick={() => {
                        setSoldOutState(null);
                        navigate(`/checkout/slot/${alt.id}`);
                      }}
                      className="flex items-center justify-between rounded-xl border border-amber-300 bg-white px-4 py-3 text-left text-xs shadow-sm transition hover:border-emerald-600"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {formatDateTime(alt.start_at)}
                        </div>
                        <div className="text-slate-600">
                          {alt.max_participants - alt.booked_seats} seats left ·{' '}
                          {formatKZT(alt.price_minor)}
                        </div>
                      </div>
                      <span className="rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white">
                        Switch Slot
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Checkout Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Number of Seats (1–10, FR-23)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={seats}
              onChange={(e) => setSeats(Math.max(1, Math.min(10, Number(e.target.value))))}
              className="mt-1.5 w-32 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold focus:border-emerald-600 focus:outline-none"
            />
            <span className="ml-3 text-xs text-slate-500">
              Current slot availability: <strong>{remainingSeats}</strong> seat(s)
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Contact Email (Mandatory, FR-22) *
              </label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Contact Phone (Mandatory, FR-22) *
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Special Request Notes (Optional, FR-22)
            </label>
            <textarea
              rows={2}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Dietary preferences, accessibility notes, pickup questions…"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Simulated Payment Gateway (FR-27, FR-28) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Simulated Payment Gateway (FR-27 — No Real Card Stored)
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold">
                <input
                  type="radio"
                  name="paymentToken"
                  checked={paymentToken === 'mock-ok'}
                  onChange={() => setPaymentToken('mock-ok')}
                />
                Simulate Successful Payment (token: mock-ok)
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700">
                <input
                  type="radio"
                  name="paymentToken"
                  checked={paymentToken === 'fail'}
                  onChange={() => setPaymentToken('fail')}
                />
                Simulate Payment Failure Rollback (token: fail)
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-500"
          >
            Pay {formatKZT(unitPrice * seats)} & Confirm Booking
          </button>
        </form>

        {/* Order Summary */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
          <h2 className="text-base font-bold text-slate-900">Reservation Summary</h2>
          <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-2">
            <div className="text-sm font-bold text-slate-900">
              {isSlot ? exc!.title : trip!.title}
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              Departure: {formatDateTime(isSlot ? slot!.start_at : trip!.departure_at)}
            </div>
            <div className="text-slate-600">
              Price per seat: <strong>{formatKZT(unitPrice)}</strong> × {seats} seat(s)
            </div>
            <div className="border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900">
              Total: {formatKZT(unitPrice * seats)}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs text-emerald-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Cancellation & Refund Policy (BR-01, FR-30)
            </div>
            <p>
              • Cancel <strong>≥ 24 hours</strong> before departure: <strong>100% automatic refund</strong>.
            </p>
            <p>
              • Cancel <strong>&lt; 24 hours</strong> before departure: <strong>non-refundable</strong>{' '}
              (100% released to the provider, seats returned to availability).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
