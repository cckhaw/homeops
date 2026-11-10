import { CATEGORIES, addMonthsISO } from './ocr-helpers';

/** Prompts and result cleaning for the two document scans. Pure (no network) so the cleaning rules are unit-tested. */
export type ScanMode = 'receipt' | 'label';
export const isScanMode = (m: unknown): m is ScanMode => m === 'receipt' || m === 'label';

export const RECEIPT_PROMPT = `You read purchase receipts / invoices for home appliances and equipment.
Extract the main product purchased and respond with ONLY a JSON object (no prose, no code fences) with these keys:
{"name": string|null, "category": one of ${JSON.stringify(CATEGORIES)} | null, "make": string|null (brand/manufacturer only, e.g. "LG"), "model": string|null (model number/name only), "serialNumber": string|null,
"purchaseDate": "YYYY-MM-DD"|null, "warrantyMonths": number|null, "vendor": string|null, "total": number|null}
Use null for anything not present on the document. Never guess serial numbers.`;

export const LABEL_PROMPT = `This is a photo of a rating plate / model sticker on a home appliance or piece of equipment (nameplate).
Read it and respond with ONLY a JSON object (no prose, no code fences) with these keys:
{"name": string|null (what the product is, e.g. "Inverter air conditioner"), "category": one of ${JSON.stringify(CATEGORIES)} | null, "make": string|null (brand/manufacturer only, e.g. "Daikin"),
"model": string|null (the model number exactly as printed, usually labelled MODEL, MOD, Type or Model No.), "serialNumber": string|null (labelled S/N, SERIAL, Ser. No. or similar; copy exactly),
"manufactureDate": "YYYY-MM-DD" | "YYYY-MM" | "YYYY" | null (production / manufacture date if printed)}
Copy characters exactly; distinguish 0/O and 1/I carefully. Use null for anything you cannot read clearly. Never guess a model or serial number.`;

const s = (v: unknown, max = 160) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const category = (v: unknown) => (typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v) ? v : null);

export function cleanReceipt(raw: Record<string, unknown>) {
  const purchaseDate = typeof raw.purchaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.purchaseDate) ? raw.purchaseDate : null;
  const months = typeof raw.warrantyMonths === 'number' && raw.warrantyMonths > 0 && raw.warrantyMonths <= 600 ? Math.round(raw.warrantyMonths) : null;
  return {
    name: s(raw.name), category: s(raw.category), make: s(raw.make), model: s(raw.model), serialNumber: s(raw.serialNumber), vendor: s(raw.vendor),
    total: typeof raw.total === 'number' ? raw.total : null,
    purchaseDate,
    warrantyExpiry: purchaseDate && months ? addMonthsISO(purchaseDate, months) : null,
  };
}

/** A model/serial is a short code: reject long free text (a hallucinated sentence) and strip the label words the model sometimes copies. */
const code = (v: unknown) => {
  const t = s(v, 80)?.replace(/^(model( no\.?)?|mod\.?|type|serial( no\.?)?|ser\.? no\.?|s\/n)\s*[:#.-]?\s*/i, '').trim();
  return t && t.length <= 40 && !/\s{2,}/.test(t) && /[A-Za-z0-9]/.test(t) ? t : null;
};

export function cleanLabel(raw: Record<string, unknown>) {
  const md = typeof raw.manufactureDate === 'string' ? raw.manufactureDate.trim() : '';
  const ym = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(md);
  const y = ym ? Number(ym[1]) : 0;
  const okYear = y >= 1970 && y <= new Date().getFullYear() + 1;
  const okMonth = !ym?.[2] || (Number(ym[2]) >= 1 && Number(ym[2]) <= 12);
  return {
    name: s(raw.name), category: category(raw.category), make: s(raw.make, 60), model: code(raw.model), serialNumber: code(raw.serialNumber),
    manufactureDate: ym && okYear && okMonth ? md : null,
  };
}

export type LabelResult = ReturnType<typeof cleanLabel>;

/** One-line summary of what a label scan found, shown under the button. */
export function labelSummary(r: LabelResult): string {
  const found = [r.make && 'brand', r.model && 'model', r.serialNumber && 'serial number'].filter(Boolean) as string[];
  if (!found.length) return '';
  const list = found.length > 1 ? `${found.slice(0, -1).join(', ')} and ${found[found.length - 1]}` : found[0];
  return `Read the ${list}${r.manufactureDate ? ` (made ${r.manufactureDate})` : ''}. Please check them against the sticker.`;
}
