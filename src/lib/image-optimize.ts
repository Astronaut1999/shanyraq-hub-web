/**
 * Client-side image optimization: orientation fix, resize, compression, thumbnail.
 * Runs entirely in the browser before upload so slow mobile connections send less data.
 */

export const MAX_IMAGE_DIMENSION = 1920;
export const THUMBNAIL_DIMENSION = 480;
/** Images already smaller than this are uploaded untouched (no double compression). */
export const OPTIMIZE_SKIP_SIZE = 350 * 1024;

export interface OptimizedImage {
  file: File;
  thumbnail: File | null;
  originalSize: number;
  optimizedSize: number;
  optimized: boolean;
}

function canUseCanvas(): boolean {
  return typeof document !== "undefined" && typeof createImageBitmap === "function";
}

async function supportsWebp(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function renameFile(name: string, mime: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  const ext = mime === "image/webp" ? "webp" : "jpg";
  return `${base}.${ext}`;
}

async function drawScaled(bitmap: ImageBitmap, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Суретті өңдеу мүмкін болмады.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Returns an optimized copy of the image plus a small thumbnail.
 * Falls back to the original file whenever the browser cannot process it.
 */
export async function optimizeImage(file: File): Promise<OptimizedImage> {
  const fallback: OptimizedImage = {
    file,
    thumbnail: null,
    originalSize: file.size,
    optimizedSize: file.size,
    optimized: false,
  };

  if (!file.type.startsWith("image/") || file.type === "image/gif") return fallback;
  if (!canUseCanvas()) return fallback;

  try {
    // imageOrientation: "from-image" applies EXIF rotation from phone cameras.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const useWebp = await supportsWebp();
    const mime = useWebp ? "image/webp" : "image/jpeg";

    const alreadySmall =
      file.size <= OPTIMIZE_SKIP_SIZE &&
      bitmap.width <= MAX_IMAGE_DIMENSION &&
      bitmap.height <= MAX_IMAGE_DIMENSION;

    let main = file;
    let optimized = false;

    if (!alreadySmall) {
      const canvas = await drawScaled(bitmap, MAX_IMAGE_DIMENSION);
      const blob = await canvasToBlob(canvas, mime, 0.82);
      if (blob && blob.size < file.size) {
        main = new File([blob], renameFile(file.name, mime), { type: mime });
        optimized = true;
      }
    }

    const thumbCanvas = await drawScaled(bitmap, THUMBNAIL_DIMENSION);
    const thumbBlob = await canvasToBlob(thumbCanvas, mime, 0.7);
    bitmap.close();

    const thumbnail = thumbBlob
      ? new File([thumbBlob], renameFile(`thumb-${file.name}`, mime), { type: mime })
      : null;

    return {
      file: main,
      thumbnail,
      originalSize: file.size,
      optimizedSize: main.size,
      optimized,
    };
  } catch {
    return fallback;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
