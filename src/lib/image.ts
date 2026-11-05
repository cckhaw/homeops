/**
 * Shrinks a photo in the browser before upload (phone photos are often 5–10 MB). Returns the original file if it
 * is not a decodable image, already small, or anything goes wrong — uploading must never be blocked by this.
 */
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  try {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 600 * 1024) return file;
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
