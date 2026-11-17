/** The size to scale a picture to so its longest edge is at most `max`, never enlarging it. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Shrinks a photo before it is uploaded: phone pictures are many megabytes, a readable receipt is
 * a few hundred kilobytes. Anything that is not a photo (a PDF) is returned unchanged.
 */
export async function shrinkPhoto(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality));
}
