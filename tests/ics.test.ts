import { describe, expect, it } from 'vitest';
import { buildCalendar, escapeText, foldLine } from '@/lib/ics';

describe('iCalendar text', () => {
  it('escapes the characters RFC 5545 requires', () => {
    expect(escapeText('a, b; c\\d')).toBe('a\\, b\; c\\\\d');
    expect(escapeText('line1\nline2\r\nline3')).toBe('line1\\nline2\\nline3');
  });
  it('folds long lines to 75 octets without splitting characters', () => {
    const long = 'SUMMARY:' + 'é'.repeat(60); // 2 bytes each
    const folded = foldLine(long).split('\r\n');
    expect(folded.length).toBeGreaterThan(1);
    for (const l of folded) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.slice(1).every((l) => l.startsWith(' '))).toBe(true);
    expect(folded.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(long); // unfolding restores the original
    expect(foldLine('short line')).toBe('short line');
  });
});

describe('buildCalendar', () => {
  const now = new Date('2026-11-05T06:30:00Z');
  const ics = buildCalendar('Wodejia, schedule', [
    { uid: 'task-1', date: '2026-12-31', summary: 'Clean gutters, front', description: 'Home: Ada\'s Home\nRepeats every 6 months', alarm: true },
    { uid: 'warranty-9', date: '2027-02-28', summary: 'Warranty ends: Fridge' },
  ], now);

  it('is a well-formed calendar with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect((ics.match(/END:VEVENT/g) ?? []).length).toBe(2);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('X-WR-CALNAME:Wodejia\\, schedule');
  });
  it('writes all-day events with an exclusive end date (year-end rollover)', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270228');
    expect(ics).toContain('DTEND;VALUE=DATE:20270301');
    expect(ics).toContain('DTSTAMP:20261105T063000Z');
  });
  it('escapes event text and only adds an alarm when asked', () => {
    expect(ics).toContain('SUMMARY:Clean gutters\\, front');
    expect(ics).toContain("Repeats every 6 months");
    expect((ics.match(/BEGIN:VALARM/g) ?? []).length).toBe(1);
    expect(ics).toContain('UID:task-1@homeops');
  });
});
