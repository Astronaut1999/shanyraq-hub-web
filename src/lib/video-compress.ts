/**
 * Client-side video compression before upload (saves Supabase Storage space).
 *
 * Re-encodes the video in the browser with WebCodecs (via mediabunny):
 * - the short side is scaled down to 720 px (720p), never up;
 * - H.264 video at ~1.2 Mbit/s, max 30 fps; AAC audio at 96 kbit/s;
 * - result is always MP4 that plays on Android, iPhone and desktop.
 *
 * Roughly 9–10 MB per minute of video instead of 100+ MB from a phone camera.
 * When the browser cannot compress (old phone/browser), the original file is
 * returned and the caller decides whether it is small enough to upload.
 */

export const TARGET_SHORT_SIDE = 720;
export const VIDEO_BITRATE = 1_200_000;
export const AUDIO_BITRATE = 96_000;
export const MAX_FRAME_RATE = 30;
/** Videos smaller than this are uploaded untouched. */
export const VIDEO_COMPRESS_SKIP_SIZE = 4 * 1024 * 1024;

export interface CompressedVideo {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressed: boolean;
}

function even(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

function toMp4Name(name: string): string {
  return `${name.replace(/\.[^.]+$/, "")}.mp4`;
}

/**
 * Returns a compressed MP4 copy of the video, or the original file when
 * compression is not possible or would not make the file smaller.
 */
export async function compressVideo(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<CompressedVideo> {
  const fallback: CompressedVideo = {
    file,
    originalSize: file.size,
    compressedSize: file.size,
    compressed: false,
  };

  // Server build never compresses; this also keeps mediabunny out of the Worker bundle.
  if (import.meta.env.SSR) return fallback;
  if (typeof window === "undefined" || typeof VideoEncoder === "undefined") return fallback;
  if (file.size <= VIDEO_COMPRESS_SKIP_SIZE) return fallback;

  try {
    const mb = await import("mediabunny");

    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) return fallback;

    const srcW = videoTrack.displayWidth;
    const srcH = videoTrack.displayHeight;
    const scale = Math.min(1, TARGET_SHORT_SIDE / Math.min(srcW, srcH));
    const width = even(srcW * scale);
    const height = even(srcH * scale);

    const canVideo = await mb.canEncodeVideo("avc", { width, height, bitrate: VIDEO_BITRATE });
    if (!canVideo) return fallback;
    // Only cap the frame rate for 50/60 fps phone videos; never add frames.
    let frameRate: number | undefined;
    try {
      const stats = await videoTrack.computePacketStats(100);
      if (stats.averagePacketRate > MAX_FRAME_RATE + 1) frameRate = MAX_FRAME_RATE;
    } catch {
      frameRate = undefined;
    }

    const canAudio = await mb.canEncodeAudio("aac", { bitrate: AUDIO_BITRATE });

    const target = new mb.BufferTarget();
    const output = new mb.Output({
      format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }),
      target,
    });

    const conversion = await mb.Conversion.init({
      input,
      output,
      video: {
        width,
        height,
        fit: "contain",
        codec: "avc",
        bitrate: VIDEO_BITRATE,
        ...(frameRate ? { frameRate } : {}),
        forceTranscode: true,
      },
      // Re-encode audio to 96 kbit/s AAC where possible; otherwise copy the
      // original AAC sound as is (phones record AAC), so the sound is never lost.
      audio: canAudio
        ? { codec: "aac", bitrate: AUDIO_BITRATE, forceTranscode: true }
        : { codec: "aac" },
      showWarnings: false,
    });

    if (!conversion.isValid) return fallback;
    // Never upload a video without its picture or without its sound.
    if (conversion.discardedTracks.some((d) => d.track.type === "video" || d.track.type === "audio")) {
      return fallback;
    }

    conversion.onProgress = (progress) => onProgress?.(Math.round(progress * 100));
    await conversion.execute();

    const buffer = target.buffer;
    if (!buffer || buffer.byteLength === 0 || buffer.byteLength >= file.size) return fallback;

    const out = new File([buffer], toMp4Name(file.name), { type: "video/mp4" });
    return {
      file: out,
      originalSize: file.size,
      compressedSize: out.size,
      compressed: true,
    };
  } catch {
    return fallback;
  }
}
