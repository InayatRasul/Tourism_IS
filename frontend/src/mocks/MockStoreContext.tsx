import React, { createContext, useContext, useState } from 'react';
import {
  Agency,
  Booking,
  Category,
  Excursion,
  ExcursionSlot,
  NotificationLog,
  Review,
  TripPackage,
  User,
} from '../types/models';
import {
  INITIAL_AGENCIES,
  INITIAL_BOOKINGS,
  INITIAL_CATEGORIES,
  INITIAL_EXCURSIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_REVIEWS,
  INITIAL_TRIPS,
  INITIAL_USERS,
} from './data';
import { hoursUntil } from '../utils/format';

export interface SoldOutResult {
  soldOut: true;
  message: string;
  alternatives: ExcursionSlot[];
}

export interface BookingSuccessResult {
  soldOut: false;
  booking: Booking;
}

interface MockStoreContextValue {
  categories: Category[];
  excursions: Excursion[];
  trips: TripPackage[];
  bookings: Booking[];
  reviews: Review[];
  users: User[];
  agencies: Agency[];
  notifications: NotificationLog[];
  toast: string | null;
  showToast: (msg: string) => void;
  bookExcursionSlot: (input: {
    slotId: number;
    touristId: number;
    touristName: string;
    seats: number;
    contactEmail: string;
    contactPhone: string;
    specialRequests?: string;
    paymentToken?: string;
  }) => SoldOutResult | BookingSuccessResult;
  bookTripPackage: (input: {
    tripId: number;
    touristId: number;
    touristName: string;
    seats: number;
    contactEmail: string;
    contactPhone: string;
    specialRequests?: string;
    paymentToken?: string;
  }) => { ok: true; booking: Booking } | { ok: false; message: string };
  cancelBookingByTourist: (bookingId: number) => { refunded: boolean; message: string };
  addSlotToExcursion: (
    excursionId: number,
    slot: { start_at: string; price_minor: number; max_participants: number }
  ) => void;
  rescheduleSlot: (slotId: number, newStartAt: string) => void;
  cancelSlotByProvider: (slotId: number) => void;
  saveExcursion: (
    exc: Omit<Excursion, 'id' | 'avg_rating' | 'review_count' | 'slots'> & { id?: number }
  ) => Excursion;
  saveTripPackage: (
    trip: Omit<TripPackage, 'id' | 'avg_rating' | 'review_count' | 'booked_seats'> & { id?: number }
  ) => TripPackage;
  cancelTripByProvider: (tripId: number) => void;
  submitReview: (input: {
    bookingId: number;
    touristId: number;
    touristName: string;
    rating: number;
    comment: string;
  }) => void;
  toggleBlockUser: (userId: number) => void;
  setAgencyVerification: (agencyId: number, status: 'verified' | 'rejected') => void;
  saveAgencyProfile: (
    managerId: number,
    patch: Pick<Agency, 'name' | 'description' | 'city' | 'contact_email' | 'contact_phone'>
  ) => void;
  saveCategory: (cat: { id?: number; name: string; is_active: boolean }) => void;
  resetDemoData: () => void;
}

const MockStoreContext = createContext<MockStoreContextValue | undefined>(undefined);

function randomRefCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'TIS-';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export const MockStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [excursions, setExcursions] = useState<Excursion[]>(INITIAL_EXCURSIONS);
  const [trips, setTrips] = useState<TripPackage[]>(INITIAL_TRIPS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [agencies, setAgencies] = useState<Agency[]>(INITIAL_AGENCIES);
  const [notifications, setNotifications] = useState<NotificationLog[]>(INITIAL_NOTIFICATIONS);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const logEmail = (
    bookingId: number | undefined,
    email: string,
    type: NotificationLog['type'],
    subject: string
  ) => {
    setNotifications((prev) => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        booking_id: bookingId,
        recipient_email: email,
        type,
        subject,
        status: 'sent',
        attempts: 1,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const bookExcursionSlot: MockStoreContextValue['bookExcursionSlot'] = (input) => {
    if (input.paymentToken?.trim().toLowerCase() === 'fail') {
      throw new Error('Mock payment gateway declined token "fail". Seats were not reserved (FR-28).');
    }

    let foundExc: Excursion | undefined;
    let foundSlot: ExcursionSlot | undefined;
    for (const e of excursions) {
      const s = e.slots.find((sl) => sl.id === input.slotId);
      if (s) {
        foundExc = e;
        foundSlot = s;
        break;
      }
    }
    if (!foundExc || !foundSlot) {
      throw new Error('Selected slot was not found.');
    }

    const remaining = foundSlot.max_participants - foundSlot.booked_seats;
    if (foundSlot.status !== 'open' || input.seats > remaining) {
      const alternatives = foundExc.slots.filter(
        (s) =>
          s.id !== foundSlot!.id &&
          s.status === 'open' &&
          s.max_participants - s.booked_seats >= input.seats &&
          new Date(s.start_at).getTime() > Date.now()
      );
      return {
        soldOut: true,
        message:
          remaining === 0
            ? 'Sold Out: This excursion slot has reached its maximum participant limit (FR-02).'
            : `Only ${remaining} seat(s) left on this slot, but you requested ${input.seats}.`,
        alternatives,
      };
    }

    const ref = randomRefCode();
    const newBooking: Booking = {
      id: Date.now(),
      reference_code: ref,
      tourist_id: input.touristId,
      tourist_name: input.touristName,
      excursion_slot_id: foundSlot.id,
      offer_title: foundExc.title,
      offer_type: 'excursion',
      city_or_destination: foundExc.city,
      departure_at: foundSlot.start_at,
      seats: input.seats,
      total_amount_minor: foundSlot.price_minor * input.seats,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      special_requests: input.specialRequests,
      status: 'confirmed',
      payment_status: 'paid',
      transaction_ref: 'MOCK-TX-' + Math.floor(10000 + Math.random() * 90000),
      refunded_amount_minor: 0,
      created_at: new Date().toISOString(),
    };

    setExcursions((prev) =>
      prev.map((e) =>
        e.id !== foundExc!.id
          ? e
          : {
              ...e,
              slots: e.slots.map((s) =>
                s.id !== foundSlot!.id ? s : { ...s, booked_seats: s.booked_seats + input.seats }
              ),
            }
      )
    );
    setBookings((prev) => [newBooking, ...prev]);
    logEmail(
      newBooking.id,
      input.contactEmail,
      'booking_confirmed',
      `Booking Confirmed [${ref}] — ${foundExc.title}`
    );
    showToast(`Booking ${ref} confirmed! Confirmation email queued to ${input.contactEmail}.`);
    return { soldOut: false, booking: newBooking };
  };

  const bookTripPackage: MockStoreContextValue['bookTripPackage'] = (input) => {
    if (input.paymentToken?.trim().toLowerCase() === 'fail') {
      return {
        ok: false,
        message: 'Mock payment gateway declined token "fail". Seats released (FR-28).',
      };
    }
    const trip = trips.find((t) => t.id === input.tripId);
    if (!trip) return { ok: false, message: 'Trip package not found.' };

    const remaining = trip.total_seats - trip.booked_seats;
    if (trip.status !== 'published' || input.seats > remaining) {
      return {
        ok: false,
        message: `Sold Out: Only ${remaining} seat(s) remaining for this trip package.`,
      };
    }

    const ref = randomRefCode();
    const newBooking: Booking = {
      id: Date.now(),
      reference_code: ref,
      tourist_id: input.touristId,
      tourist_name: input.touristName,
      trip_package_id: trip.id,
      offer_title: trip.title,
      offer_type: 'trip',
      city_or_destination: trip.destination,
      departure_at: trip.departure_at,
      seats: input.seats,
      total_amount_minor: trip.price_per_person_minor * input.seats,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      special_requests: input.specialRequests,
      status: 'confirmed',
      payment_status: 'paid',
      transaction_ref: 'MOCK-TX-' + Math.floor(10000 + Math.random() * 90000),
      refunded_amount_minor: 0,
      created_at: new Date().toISOString(),
    };

    setTrips((prev) =>
      prev.map((t) =>
        t.id !== trip.id ? t : { ...t, booked_seats: t.booked_seats + input.seats }
      )
    );
    setBookings((prev) => [newBooking, ...prev]);
    logEmail(
      newBooking.id,
      input.contactEmail,
      'booking_confirmed',
      `Trip Booking Confirmed [${ref}] — ${trip.title}`
    );
    showToast(`Trip booking ${ref} confirmed! Email sent to ${input.contactEmail}.`);
    return { ok: true, booking: newBooking };
  };

  const cancelBookingByTourist = (bookingId: number) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return { refunded: false, message: 'Booking not found' };

    const hrs = hoursUntil(b.departure_at);
    const refundable = hrs >= 24;

    setBookings((prev) =>
      prev.map((item) =>
        item.id !== bookingId
          ? item
          : {
              ...item,
              status: 'cancelled_by_tourist',
              payment_status: refundable ? 'refunded' : 'released_to_provider',
              refunded_amount_minor: refundable ? item.total_amount_minor : 0,
              cancelled_at: new Date().toISOString(),
            }
      )
    );

    if (b.excursion_slot_id) {
      setExcursions((prev) =>
        prev.map((e) => ({
          ...e,
          slots: e.slots.map((s) =>
            s.id !== b.excursion_slot_id
              ? s
              : { ...s, booked_seats: Math.max(0, s.booked_seats - b.seats) }
          ),
        }))
      );
    }
    if (b.trip_package_id) {
      setTrips((prev) =>
        prev.map((t) =>
          t.id !== b.trip_package_id
            ? t
            : { ...t, booked_seats: Math.max(0, t.booked_seats - b.seats) }
        )
      );
    }

    const msg = refundable
      ? `Booking ${b.reference_code} cancelled (≥24h before departure). 100% refund issued & ${b.seats} seat(s) returned.`
      : `Booking ${b.reference_code} cancelled (<24h before departure, BR-01). Non-refundable — 100% released to provider; ${b.seats} seat(s) returned.`;

    logEmail(
      b.id,
      b.contact_email,
      'booking_cancelled_by_tourist',
      `Cancellation Notice [${b.reference_code}] — ${refundable ? '100% Refunded' : 'Non-Refundable (BR-01)'}`
    );
    showToast(msg);
    return { refunded: refundable, message: msg };
  };

  const addSlotToExcursion: MockStoreContextValue['addSlotToExcursion'] = (excursionId, slot) => {
    const newSlot: ExcursionSlot = {
      id: Date.now(),
      excursion_id: excursionId,
      start_at: slot.start_at,
      price_minor: slot.price_minor,
      max_participants: slot.max_participants,
      booked_seats: 0,
      status: 'open',
    };
    setExcursions((prev) =>
      prev.map((e) => (e.id !== excursionId ? e : { ...e, slots: [...e.slots, newSlot] }))
    );
    showToast('New time slot added to excursion.');
  };

  const rescheduleSlot = (slotId: number, newStartAt: string) => {
    setExcursions((prev) =>
      prev.map((e) => ({
        ...e,
        slots: e.slots.map((s) => (s.id !== slotId ? s : { ...s, start_at: newStartAt })),
      }))
    );
    const affected = bookings.filter(
      (b) => b.excursion_slot_id === slotId && b.status === 'confirmed'
    );
    setBookings((prev) =>
      prev.map((b) =>
        b.excursion_slot_id === slotId && b.status === 'confirmed'
          ? { ...b, departure_at: newStartAt }
          : b
      )
    );
    affected.forEach((b) =>
      logEmail(
        b.id,
        b.contact_email,
        'slot_rescheduled',
        `Emergency Schedule Change [${b.reference_code}] — ${b.offer_title}`
      )
    );
    showToast(
      `Slot rescheduled. ${affected.length} active booking holder(s) notified via email (FR-10).`
    );
  };

  const cancelSlotByProvider = (slotId: number) => {
    setExcursions((prev) =>
      prev.map((e) => ({
        ...e,
        slots: e.slots.map((s) => (s.id !== slotId ? s : { ...s, status: 'cancelled' })),
      }))
    );
    const affected = bookings.filter(
      (b) => b.excursion_slot_id === slotId && b.status === 'confirmed'
    );
    setBookings((prev) =>
      prev.map((b) =>
        b.excursion_slot_id === slotId && b.status === 'confirmed'
          ? {
              ...b,
              status: 'cancelled_by_provider',
              payment_status: 'refunded',
              refunded_amount_minor: b.total_amount_minor,
              cancelled_at: new Date().toISOString(),
            }
          : b
      )
    );
    affected.forEach((b) =>
      logEmail(
        b.id,
        b.contact_email,
        'cancelled_by_provider',
        `Provider Cancellation & 100% Refund [${b.reference_code}] — ${b.offer_title}`
      )
    );
    showToast(
      `Slot cancelled by provider. ${affected.length} booking(s) refunded 100% (FR-11 / BR-03).`
    );
  };

  const saveExcursion: MockStoreContextValue['saveExcursion'] = (excInput) => {
    if (excInput.id) {
      let updated!: Excursion;
      setExcursions((prev) =>
        prev.map((e) => {
          if (e.id !== excInput.id) return e;
          updated = { ...e, ...excInput, id: e.id };
          return updated;
        })
      );
      showToast(`Excursion "${excInput.title}" updated.`);
      return updated;
    }
    const created: Excursion = {
      ...excInput,
      id: Date.now(),
      avg_rating: 0,
      review_count: 0,
      slots: [],
    };
    setExcursions((prev) => [created, ...prev]);
    showToast(`Excursion "${created.title}" created (${created.status}).`);
    return created;
  };

  const saveTripPackage: MockStoreContextValue['saveTripPackage'] = (tripInput) => {
    if (tripInput.id) {
      let updated!: TripPackage;
      setTrips((prev) =>
        prev.map((t) => {
          if (t.id !== tripInput.id) return t;
          updated = { ...t, ...tripInput, id: t.id };
          return updated;
        })
      );
      showToast(`Trip package "${tripInput.title}" updated.`);
      return updated;
    }
    const created: TripPackage = {
      ...tripInput,
      id: Date.now(),
      booked_seats: 0,
      avg_rating: 0,
      review_count: 0,
    };
    setTrips((prev) => [created, ...prev]);
    showToast(`Trip package "${created.title}" created (${created.status}).`);
    return created;
  };

  const cancelTripByProvider = (tripId: number) => {
    setTrips((prev) => prev.map((t) => (t.id !== tripId ? t : { ...t, status: 'cancelled' })));
    const affected = bookings.filter((b) => b.trip_package_id === tripId && b.status === 'confirmed');
    setBookings((prev) =>
      prev.map((b) =>
        b.trip_package_id === tripId && b.status === 'confirmed'
          ? {
              ...b,
              status: 'cancelled_by_provider',
              payment_status: 'refunded',
              refunded_amount_minor: b.total_amount_minor,
              cancelled_at: new Date().toISOString(),
            }
          : b
      )
    );
    showToast(`Trip package cancelled. ${affected.length} booking(s) refunded 100%.`);
  };

  const submitReview: MockStoreContextValue['submitReview'] = (input) => {
    const b = bookings.find((x) => x.id === input.bookingId);
    if (!b) return;
    let excId: number | undefined;
    if (b.excursion_slot_id) {
      const exc = excursions.find((e) => e.slots.some((s) => s.id === b.excursion_slot_id));
      excId = exc?.id;
    }
    const rev: Review = {
      id: Date.now(),
      booking_id: b.id,
      tourist_id: input.touristId,
      tourist_name: input.touristName,
      excursion_id: excId,
      trip_package_id: b.trip_package_id,
      rating: input.rating,
      comment: input.comment,
      created_at: new Date().toISOString(),
    };
    setReviews((prev) => [rev, ...prev]);
    setBookings((prev) =>
      prev.map((item) => (item.id === b.id ? { ...item, has_review: true } : item))
    );
    if (excId) {
      setExcursions((prev) =>
        prev.map((e) => {
          if (e.id !== excId) return e;
          const nextCount = e.review_count + 1;
          const nextAvg = Number(
            ((e.avg_rating * e.review_count + input.rating) / nextCount).toFixed(2)
          );
          return { ...e, review_count: nextCount, avg_rating: nextAvg };
        })
      );
    }
    showToast('Thank you! Your review has been published (FR-35).');
  };

  const toggleBlockUser = (userId: number) => {
    setUsers((prev) =>
      prev.map((u) => (u.id !== userId ? u : { ...u, is_blocked: !u.is_blocked }))
    );
    showToast('User status updated (FR-38).');
  };

  const setAgencyVerification = (agencyId: number, status: 'verified' | 'rejected') => {
    setAgencies((prev) =>
      prev.map((a) => (a.id !== agencyId ? a : { ...a, verification_status: status }))
    );
    showToast(`Agency verification status set to "${status}" (FR-39).`);
  };

  const saveAgencyProfile: MockStoreContextValue['saveAgencyProfile'] = (managerId, patch) => {
    setAgencies((prev) => {
      const existing = prev.find((a) => a.manager_user_id === managerId);
      if (existing) {
        return prev.map((a) => (a.manager_user_id === managerId ? { ...a, ...patch } : a));
      }
      return [
        ...prev,
        {
          id: Date.now(),
          manager_user_id: managerId,
          ...patch,
          verification_status: 'pending',
          created_at: new Date().toISOString(),
        },
      ];
    });
    showToast('Agency profile saved (FR-07).');
  };

  const saveCategory: MockStoreContextValue['saveCategory'] = (cat) => {
    if (cat.id) {
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, ...cat } : c)));
      showToast('Category updated (FR-40).');
    } else {
      setCategories((prev) => [
        ...prev,
        { id: Date.now(), name: cat.name, is_active: cat.is_active },
      ]);
      showToast(`Category "${cat.name}" created (FR-40).`);
    }
  };

  const resetDemoData = () => {
    setCategories(INITIAL_CATEGORIES);
    setExcursions(INITIAL_EXCURSIONS);
    setTrips(INITIAL_TRIPS);
    setBookings(INITIAL_BOOKINGS);
    setReviews(INITIAL_REVIEWS);
    setUsers(INITIAL_USERS);
    setAgencies(INITIAL_AGENCIES);
    setNotifications(INITIAL_NOTIFICATIONS);
    showToast('Demo data reset to initial state.');
  };

  return (
    <MockStoreContext.Provider
      value={{
        categories,
        excursions,
        trips,
        bookings,
        reviews,
        users,
        agencies,
        notifications,
        toast,
        showToast,
        bookExcursionSlot,
        bookTripPackage,
        cancelBookingByTourist,
        addSlotToExcursion,
        rescheduleSlot,
        cancelSlotByProvider,
        saveExcursion,
        saveTripPackage,
        cancelTripByProvider,
        submitReview,
        toggleBlockUser,
        setAgencyVerification,
        saveAgencyProfile,
        saveCategory,
        resetDemoData,
      }}
    >
      {children}
    </MockStoreContext.Provider>
  );
};

export function useMockStore(): MockStoreContextValue {
  const ctx = useContext(MockStoreContext);
  if (!ctx) {
    throw new Error('useMockStore must be used inside MockStoreProvider');
  }
  return ctx;
}
