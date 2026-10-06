import type { Evidence } from './schema';
export async function readImage(file: File, demo?: string): Promise<Evidence> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a JPEG, PNG or WebP image.');
  if (file.size > 20 * 1024 * 1024)
    throw new Error('This file is too large. Choose an image under 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (img.naturalWidth * img.naturalHeight > 60_000_000)
      throw new Error('Choose an image smaller than 60 megapixels.');
    const scale = Math.min(1, 1568 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser cannot process this image.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const aiData = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    let raw: Record<string, unknown> = {};
    const { default: exifr } = await import('exifr');
    let metadataError: string | undefined;
    try {
      raw =
        (await exifr.parse(file, {
          tiff: true,
          exif: true,
          gps: true,
          xmp: true,
          iptc: true,
          reviveValues: false,
        })) || {};
    } catch {
      metadataError =
        'Metadata could not be decoded. This does not establish that metadata was stripped.';
    }
    const labels: Record<string, string> = {
      Make: 'Camera make',
      Model: 'Camera model',
      DateTimeOriginal: 'Captured',
      CreateDate: 'Created',
      ModifyDate: 'Modified',
      OffsetTimeOriginal: 'Capture UTC offset',
      Software: 'Software',
      ProcessingSoftware: 'Processing software',
      CreatorTool: 'Creator tool',
      LensModel: 'Lens',
      ExposureTime: 'Exposure',
      FNumber: 'Aperture',
      ISO: 'ISO',
    };
    const metadata: Record<string, string> = {};
    for (const [key, label] of Object.entries(labels))
      if (raw[key] !== undefined) metadata[label] = String(raw[key]).slice(0, 300);
    const latitude = raw.latitude as number,
      longitude = raw.longitude as number;
    const gps =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
        ? { latitude, longitude }
        : undefined;
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const hash = Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join(
      '',
    );
    return {
      originalBlob: file,
      name: file.name,
      url,
      aiData,
      width: img.naturalWidth,
      height: img.naturalHeight,
      size: file.size,
      hash,
      metadata,
      gps,
      demo,
      metadataError,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
