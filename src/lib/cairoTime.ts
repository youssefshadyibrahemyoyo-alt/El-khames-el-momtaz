export const CAIRO_TZ = 'Africa/Cairo';

const fmtCairoIsoLocal = (d: Date) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: CAIRO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(d)
    .replace(' ', 'T');

export function toCairoDateTimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : fmtCairoIsoLocal(d);
}

const cairoOffsetMs = (d: Date) =>
  new Date(`${fmtCairoIsoLocal(d)}:00Z`).getTime() - Math.floor(d.getTime() / 60000) * 60000;

export function fromCairoDateTimeInput(value: string): string | null {
  if (!value) return null;
  const guess = new Date(`${value}:00Z`);
  if (Number.isNaN(guess.getTime())) return null;
  const firstPass = new Date(guess.getTime() - cairoOffsetMs(guess));
  return new Date(guess.getTime() - cairoOffsetMs(firstPass)).toISOString();
}

export function formatCairoDeadline(iso: string | null, lang: 'en' | 'ar'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: CAIRO_TZ,
  });
}

export type CountdownParts = {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function getDeadlineCountdown(iso: string | null, nowMs: number = Date.now()): CountdownParts | null {
  if (!iso) return null;
  const targetMs = new Date(iso).getTime();
  if (Number.isNaN(targetMs)) return null;
  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { expired: false, days, hours, minutes, seconds };
}

export function formatCountdownShort(parts: CountdownParts | null, lang: 'en' | 'ar'): string {
  if (!parts) return '';
  if (parts.expired) return lang === 'ar' ? 'انتهى الموعد' : 'Closed';
  const pad = (n: number) => String(n).padStart(2, '0');
  if (parts.days > 0) {
    return lang === 'ar'
      ? `${parts.days}ي ${parts.hours}س ${pad(parts.minutes)}د`
      : `${parts.days}d ${parts.hours}h ${pad(parts.minutes)}m`;
  }
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}
