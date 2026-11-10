import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCurrentUser } from '@/lib/auth';
import { enforce } from '@/lib/rate-limit';
import { LABEL_PROMPT, RECEIPT_PROMPT, cleanLabel, cleanReceipt, isScanMode } from '@/lib/ocr-core';

export const runtime = 'nodejs';
export const maxDuration = 60;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Each scan costs money: a short burst limit and a daily cap per user.
  const limited = (await enforce('ocr-minute', user.id, 6, 60)) ?? (await enforce('ocr-day', user.id, 60, 86_400));
  if (limited) return NextResponse.json({ error: 'You have scanned a lot of receipts. Please try again later.' }, { status: 429 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Receipt scanning is not configured (missing ANTHROPIC_API_KEY).' }, { status: 501 });
  }

  const form = await req.formData().catch(() => null);
  const rawMode = form?.get('mode');
  const mode = isScanMode(rawMode) ? rawMode : 'receipt';
  const file = form?.get(mode === 'label' ? 'label' : 'receipt');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: mode === 'label' ? 'No photo uploaded' : 'No receipt uploaded' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'The file must be under 8 MB' }, { status: 413 });

  const isPdf = file.type === 'application/pdf';
  if ((isPdf && mode === 'label') || (!isPdf && !IMAGE_TYPES.includes(file.type))) {
    return NextResponse.json({ error: mode === 'label' ? 'Please use a photo (JPG, PNG or WebP).' : 'Scanning supports JPG, PNG, WebP and PDF receipts.' }, { status: 415 });
  }
  const data = Buffer.from(await file.arrayBuffer()).toString('base64');

  try {
    const client = new Anthropic({ apiKey, baseURL: process.env.OCR_API_BASE_URL || undefined }); // the override is only used by the test suite's fake API
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
            { type: 'text', text: mode === 'label' ? LABEL_PROMPT : RECEIPT_PROMPT },
          ],
        },
      ],
    });
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error('unparseable');
    const raw = JSON.parse(json) as Record<string, unknown>;

    return NextResponse.json(mode === 'label' ? cleanLabel(raw) : cleanReceipt(raw));
  } catch (err) {
    console.error('OCR failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: mode === 'label' ? 'We could not read that label. Try a sharper, well-lit photo of the sticker.' : 'We could not read that receipt. Try a clearer photo.' }, { status: 502 });
  }
}
