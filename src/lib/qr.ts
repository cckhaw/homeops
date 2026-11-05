import 'server-only';
import QRCode from 'qrcode';

/** Inline SVG for a QR code (error-correction M, so a scuffed sticker still scans). Dark-on-white for print. */
export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#000000', light: '#ffffff' } });
}
