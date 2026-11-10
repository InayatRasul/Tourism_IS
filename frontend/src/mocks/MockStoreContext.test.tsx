import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MockStoreProvider, useMockStore } from './MockStoreContext';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MockStoreProvider>{children}</MockStoreProvider>
);

describe('MockStoreContext domain & Lab04 business rules', () => {
  it('Lab04 FR-02 / FR-21 / UC-15: rejects booking a Sold Out slot (10/10) and suggests alternative slots', () => {
    const { result } = renderHook(() => useMockStore(), { wrapper });

    let res!: ReturnType<typeof result.current.bookExcursionSlot>;
    act(() => {
      res = result.current.bookExcursionSlot({
        slotId: 1001, // 10/10 booked on Big Almaty Lake
        touristId: 4,
        touristName: 'Timur Tourist',
        seats: 1,
        contactEmail: 'tourist@tis.kz',
        contactPhone: '+77033334455',
      });
    });

    expect(res.soldOut).toBe(true);
    if (res.soldOut) {
      expect(res.message).toMatch(/Sold Out/i);
      expect(res.alternatives.length).toBeGreaterThanOrEqual(2);
      expect(res.alternatives.map((s) => s.id)).toContain(1002);
      expect(res.alternatives.map((s) => s.id)).toContain(1003);
    }
  });

  it('FR-27 / FR-28: payment failure ("fail" token) aborts booking and leaves seats unchanged', () => {
    const { result } = renderHook(() => useMockStore(), { wrapper });
    const beforeSeats =
      result.current.excursions[0].slots.find((s) => s.id === 1002)!.booked_seats;
    const beforeCount = result.current.bookings.length;

    expect(() =>
      result.current.bookExcursionSlot({
        slotId: 1002,
        touristId: 4,
        touristName: 'Timur Tourist',
        seats: 2,
        contactEmail: 'tourist@tis.kz',
        contactPhone: '+77033334455',
        paymentToken: 'fail',
      })
    ).toThrow(/declined/i);

    const afterSeats =
      result.current.excursions[0].slots.find((s) => s.id === 1002)!.booked_seats;
    expect(afterSeats).toBe(beforeSeats);
    expect(result.current.bookings.length).toBe(beforeCount);
  });

  it('FR-03 / FR-26: successful booking increments seats, creates TIS-XXXXXX ref code, and logs confirmation email', () => {
    const { result } = renderHook(() => useMockStore(), { wrapper });

    let res!: ReturnType<typeof result.current.bookExcursionSlot>;
    act(() => {
      res = result.current.bookExcursionSlot({
        slotId: 1002, // 4/10 initially
        touristId: 4,
        touristName: 'Timur Tourist',
        seats: 3,
        contactEmail: 'tourist@tis.kz',
        contactPhone: '+77033334455',
        specialRequests: 'Window seat',
      });
    });

    expect(res.soldOut).toBe(false);
    if (!res.soldOut) {
      expect(res.booking.reference_code).toMatch(/^TIS-[A-Z0-9]{6}$/);
      expect(res.booking.total_amount_minor).toBe(1500000 * 3);
      expect(res.booking.status).toBe('confirmed');
      expect(res.booking.payment_status).toBe('paid');
    }

    const updatedSlot = result.current.excursions[0].slots.find((s) => s.id === 1002)!;
    expect(updatedSlot.booked_seats).toBe(7);
    expect(result.current.notifications[0].type).toBe('booking_confirmed');
  });

  it('FR-30 / FR-31: tourist cancellation >= 24h before departure refunds 100% and returns seats', () => {
    const { result } = renderHook(() => useMockStore(), { wrapper });

    // Booking 501 is 4 days in the future (2 seats on slot 1002, which starts at 4 booked seats)
    let cancelRes!: ReturnType<typeof result.current.cancelBookingByTourist>;
    act(() => {
      cancelRes = result.current.cancelBookingByTourist(501);
    });

    expect(cancelRes.refunded).toBe(true);
    const b = result.current.bookings.find((x) => x.id === 501)!;
    expect(b.status).toBe('cancelled_by_tourist');
    expect(b.payment_status).toBe('refunded');
    expect(b.refunded_amount_minor).toBe(b.total_amount_minor);

    const slot = result.current.excursions[0].slots.find((s) => s.id === 1002)!;
    expect(slot.booked_seats).toBe(2); // 4 - 2 returned
  });

  it('Lab04 BR-01 / FR-31: tourist cancellation < 24h before departure is non-refundable (released_to_provider) but still frees seats', () => {
    const { result } = renderHook(() => useMockStore(), { wrapper });

    // Booking 502 is 18h in the future (1 seat on slot 2001, which starts at 6 booked seats)
    let cancelRes!: ReturnType<typeof result.current.cancelBookingByTourist>;
    act(() => {
      cancelRes = result.current.cancelBookingByTourist(502);
    });

    expect(cancelRes.refunded).toBe(false);
    const b = result.current.bookings.find((x) => x.id === 502)!;
    expect(b.status).toBe('cancelled_by_tourist');
    expect(b.payment_status).toBe('released_to_provider');
    expect(b.refunded_amount_minor).toBe(0);

    const slot = result.current.excursions[1].slots.find((s) => s.id === 2001)!;
    expect(slot.booked_seats).toBe(5); // 6 - 1 returned
  });

  it('FR-11 / BR-03: provider slot cancellation always gives 100% refund to active bookings', () => {
    const { result } = renderHook(() => useMockStore(), { wrapper });

    // Slot 2001 has booking 502 (<24h), provider cancellation still refunds 100%
    act(() => {
      result.current.cancelSlotByProvider(2001);
    });

    const b = result.current.bookings.find((x) => x.id === 502)!;
    expect(b.status).toBe('cancelled_by_provider');
    expect(b.payment_status).toBe('refunded');
    expect(b.refunded_amount_minor).toBe(b.total_amount_minor);
  });

  it('FR-35 / FR-36: submitting a review on a completed booking updates excursion rating and review count', () => {
    const { result } = renderHook(() => useMockStore(), { wrapper });
    const beforeCount = result.current.excursions.find((e) => e.id === 3)!.review_count;

    act(() => {
      result.current.submitReview({
        bookingId: 503, // completed booking on Charyn Canyon (excursion 3)
        touristId: 4,
        touristName: 'Timur Tourist',
        rating: 5,
        comment: 'Unforgettable canyon views!',
      });
    });

    const afterExc = result.current.excursions.find((e) => e.id === 3)!;
    expect(afterExc.review_count).toBe(beforeCount + 1);
    expect(result.current.bookings.find((b) => b.id === 503)!.has_review).toBe(true);
  });

  it('FR-38..40: admin toggles user block, verifies agency, and creates category', () => {
    const { result } = renderHook(() => useMockStore(), { wrapper });

    act(() => {
      result.current.toggleBlockUser(4);
      result.current.setAgencyVerification(2, 'verified');
      result.current.saveCategory({ name: 'Winter Tours', is_active: true });
    });

    expect(result.current.users.find((u) => u.id === 4)!.is_blocked).toBe(true);
    expect(result.current.agencies.find((a) => a.id === 2)!.verification_status).toBe('verified');
    expect(result.current.categories.some((c) => c.name === 'Winter Tours')).toBe(true);
  });
});
