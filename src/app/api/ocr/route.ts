import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCurrentUser } from '@/lib/auth';
import { CATEGORIES, addMonthsISO } from '@/lib/ocr-helpers';

export const runtime = 'nodejs';
export const maxDuration = 60;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024;

const PROMPT = `You read purchase receipts / invoices for home appliances and equipment.
Extract the main product purchased and respond with ONLY a JSON object (no prose, no code fences) with these keys:
{"name": string|null, "category": one of ${JSON.stringify(CATEGORIES)} | null, "make": string|null (brand/manufacturer only, e.g. "LG"), "model": string|null (model number/name only), "serialNumber": string|null,
"purchaseDate": "YYYY-MM-DD"|null, "warrantyMonths": number|null, "vendor": string|null, "total": number|null}
Use null for anything not present on the document. Never guess serial numbers.`;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Receipt scanning is not configured (missing ANTHROPIC_API_KEY).' }, { status: 501 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('receipt');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'No receipt uploaded' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Receipt must be under 8 MB' }, { status: 413 });

  const isPdf = file.type === 'application/pdf';
  if (!isPdf && !IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Scanning supports JPG, PNG, WebP and PDF receipts.' }, { status: 415 });
  }
  const data = Buffer.from(await file.arrayBuffer()).toString('base64');

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: process.env.OCR_MODEL ?? 'claude-haiku-5-5',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: [
            isPdf
              ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
              : {
                  type: 'image',
                  source: { type: 'base64', media_type: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data },
                },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error('unparseable');
    const raw = JSON.parse(json) as Record<string, unknown>;

    const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 160) : null);
    const purchaseDate = typeof raw.purchaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.purchaseDate) ? raw.purchaseDate : null;
    const months = typeof raw.warrantyMonths === 'number' && raw.warrantyMonths > 0 && raw.warrantyMonths <= 600 ? Math.round(raw.warrantyMonths) : null;
    return NextResponse.json({
      name: s(raw.name),
      category: s(raw.category),
      make: s(raw.make),
      model: s(raw.model),
      serialNumber: s(raw.serialNumber),
      vendor: s(raw.vendor),
      total: typeof raw.total === 'number' ? raw.total : null,
      purchaseDate,
      warrantyExpiry: purchaseDate && months ? addMonthsISO(purchaseDate, months) : null,
    });
  } catch (err) {
    console.error('OCR failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'We could not read that receipt. Try a clearer photo.' }, { status: 502 });
  }
}
