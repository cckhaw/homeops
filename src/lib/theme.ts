export const ACCENTS = [
  { id: 'logo', label: 'HomeOps (default)', swatch: '#6CC4EA' },
  { id: 'red', label: 'Red', swatch: '#ff3b30' },
  { id: 'orange', label: 'Orange', swatch: '#ff9500' },
  { id: 'yellow', label: 'Yellow', swatch: '#ffcc00' },
  { id: 'green', label: 'Green', swatch: '#34c759' },
  { id: 'blue', label: 'Blue', swatch: '#0a84ff' },
  { id: 'indigo', label: 'Indigo', swatch: '#5e5ce6' },
  { id: 'violet', label: 'Violet', swatch: '#bf5af2' },
] as const;

export type AccentId = (typeof ACCENTS)[number]['id'];
export type Mode = 'system' | 'light' | 'dark';

export const MODE_KEY = 'homeops-mode';
export const ACCENT_KEY = 'homeops-accent';

/** Runs before first paint (inline in <head>) so there is no theme flash. The accent colour only applies inside the signed-in app; public pages keep the default brand blue. */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement,m=localStorage.getItem('${MODE_KEY}'),a=localStorage.getItem('${ACCENT_KEY}');if(m==='light'||m==='dark')d.setAttribute('data-theme',m);if(a&&/^\\/(dashboard|admin)(\\/|$)/.test(location.pathname))d.setAttribute('data-accent',a);}catch(e){}})();`;

export function applyMode(mode: Mode) {
  const d = document.documentElement;
  if (mode === 'system') d.removeAttribute('data-theme');
  else d.setAttribute('data-theme', mode);
  try { localStorage.setItem(MODE_KEY, mode); } catch {}
}

export function applyAccent(id: AccentId) {
  document.documentElement.setAttribute('data-accent', id);
  try { localStorage.setItem(ACCENT_KEY, id); } catch {}
}

export function readMode(): Mode {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === 'light' || m === 'dark' ? m : 'system';
  } catch { return 'system'; }
}

export function readAccent(): AccentId {
  try {
    const a = localStorage.getItem(ACCENT_KEY);
    return (ACCENTS.find((x) => x.id === a)?.id ?? 'logo') as AccentId;
  } catch { return 'blue'; }
}
