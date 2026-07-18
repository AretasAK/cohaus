export type RecurrenceFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface Recurrence {
  freq: RecurrenceFreq;
  interval: number;
}

export function buildRrule(freq: RecurrenceFreq, interval: number): string {
  const safeInterval = Math.max(1, Math.round(interval));
  return `FREQ=${freq};INTERVAL=${safeInterval}`;
}

export function parseRrule(rrule: string | null): Recurrence | null {
  if (!rrule) return null;
  const freqMatch = rrule.match(/FREQ=(DAILY|WEEKLY|MONTHLY)/);
  if (!freqMatch) return null;
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
  return {
    freq: freqMatch[1] as RecurrenceFreq,
    interval: intervalMatch ? Math.max(1, parseInt(intervalMatch[1], 10)) : 1,
  };
}

export function getNextOccurrence(base: Date, rrule: string): Date {
  const recurrence = parseRrule(rrule);
  const next = new Date(base);
  if (!recurrence) return next;

  switch (recurrence.freq) {
    case 'DAILY':
      next.setDate(next.getDate() + recurrence.interval);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7 * recurrence.interval);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + recurrence.interval);
      break;
  }
  return next;
}
