import { describe, expect, it } from 'vitest';
import { DEFAULT_HOME_ICON, HOME_ICONS, homeIconLabel, isHomeIcon } from '@/lib/home-icons';

describe('home icons', () => {
  it('offers 12 distinct icons with labels', () => {
    expect(HOME_ICONS).toHaveLength(12);
    expect(new Set(HOME_ICONS.map((i) => i.id)).size).toBe(12);
    expect(new Set(HOME_ICONS.map((i) => i.label)).size).toBe(12);
  });
  it('validates ids and falls back safely', () => {
    expect(isHomeIcon('cabin')).toBe(true);
    expect(isHomeIcon('rocket')).toBe(false);
    expect(isHomeIcon(null)).toBe(false);
    expect(isHomeIcon(DEFAULT_HOME_ICON)).toBe(true);
    expect(homeIconLabel('beach')).toBe('Beach house');
    expect(homeIconLabel('nonsense')).toBe('House');
  });
});
