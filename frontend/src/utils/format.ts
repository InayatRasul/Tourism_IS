export function formatKZT(minor: number): string {
  const kzt = Math.round(minor / 100);
  return new Intl.NumberFormat('en-US').format(kzt) + ' ₸';
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Almaty',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateOnly(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeZone: 'Asia/Almaty',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function hoursUntil(iso: string): number {
  const diffMs = new Date(iso).getTime() - Date.now();
  return diffMs / (1000 * 60 * 60);
}
