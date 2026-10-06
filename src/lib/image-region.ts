import { z } from 'zod';
export const regionSchema = z
  .object({
    x: z.number().min(0).max(99),
    y: z.number().min(0).max(99),
    width: z.number().min(1).max(100),
    height: z.number().min(1).max(100),
  })
  .refine(
    (r) => r.x + r.width <= 100 && r.y + r.height <= 100,
    'Region must fit inside the image.',
  );
export type ImageRegion = z.infer<typeof regionSchema>;
export async function cropForAnalysis(url: string, value: ImageRegion) {
  const region = regionSchema.parse(value);
  const img = new Image();
  img.src = url;
  await img.decode();
  const sx = (img.naturalWidth * region.x) / 100,
    sy = (img.naturalHeight * region.y) / 100;
  const sw = (img.naturalWidth * region.width) / 100,
    sh = (img.naturalHeight * region.height) / 100;
  const scale = Math.min(1, 1568 / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser cannot crop this image.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.94, 0.85, 0.75]) {
    const data = canvas.toDataURL('image/jpeg', quality).split(',')[1];
    if (data.length <= 3_500_000) return data;
  }
  throw new Error('This region exceeds the image request limit. Select a smaller region.');
}
