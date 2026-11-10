import { describe, expect, it, vi } from 'vitest';
import { formatDateOnly, formatDateTime, formatKZT, hoursUntil } from './format';

describe('formatKZT', () => {
  it('converts minor units (tiyn) to whole tenge with grouping', () => {
    expect(formatKZT(1500000)).toBe('15,000 ₸');
    expect(formatKZT(12000000)).toBe('120,000 ₸');
  });

  it('handles zero and rounds fractional tenge', () => {
    expect(formatKZT(0)).toBe('0 ₸');
    expect(formatKZT(149)).toBe('1 ₸');
    expect(formatKZT(150)).toBe('2 ₸');
  });
});

describe('date formatting (Asia/Almaty, NFR-08)', () => {
  it('shows UTC timestamps in Almaty local time (UTC+5)', () => {
    // 02:00 UTC is 07:00 in Almaty.
    expect(formatDateTime('2026-11-06T02:00:00Z')).toContain('07:00');
    expect(formatDateOnly('2026-11-06T02:00:00Z')).toBe('6 Nov 2026');
  });

  it('crosses the date boundary correctly', () => {
    // 21:00 UTC on the 5th is already the 6th in Almaty.
    expect(formatDateOnly('2026-11-05T21:00:00Z')).toBe('6 Nov 2026');
  });

  it('returns the input for invalid dates instead of throwing', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});

describe('hoursUntil (24h cancellation rule input)', () => {
  it('computes hours until departure relative to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T00:00:00Z'));
    expect(hoursUntil('2026-11-11T00:00:00Z')).toBe(24);
    expect(hoursUntil('2026-11-10T23:59:00Z')).toBeCloseTo(23.983, 2);
    expect(hoursUntil('2026-11-09T22:00:00Z')).toBe(-2);
    vi.useRealTimers();
  });
});
