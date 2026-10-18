import * as tus from "tus-js-client";

import { supabase } from "@/integrations/supabase/client";

/** Files at or above this size (and every video) go through resumable TUS upload. */
export const RESUMABLE_THRESHOLD = 6 * 1024 * 1024;
const CHUNK_SIZE = 6 * 1024 * 1024; // Supabase Storage requires exactly 6MB chunks.

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
}

export interface ResumableHandle {
  pause: () => void;
  resume: () => void;
  abort: () => Promise<void>;
}

export function needsResumableUpload(file: File): boolean {
  return file.size >= RESUMABLE_THRESHOLD || file.type.startsWith("video/");
}

function storageEndpoint(): string {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  if (!url) throw new Error("Қойма мекенжайы табылмады.");
  return `${url}/storage/v1/upload/resumable`;
}

async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Сессия мерзімі өтті. Қайта кіріңіз.");
  return token;
}

/**
 * Resumable upload to Supabase Storage.
 * The stable fingerprint (bucket + object path + size) lets tus-js-client pick an
 * interrupted upload back up from local storage instead of restarting at zero.
 */
export async function resumableUpload(params: {
  bucket: string;
  path: string;
  file: File;
  onProgress?: (progress: UploadProgress) => void;
  onHandle?: (handle: ResumableHandle) => void;
}): Promise<void> {
  const token = await accessToken();

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(params.file, {
      endpoint: storageEndpoint(),
      retryDelays: [0, 1000, 3000, 6000, 12000],
      headers: {
        authorization: `Bearer ${token}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: CHUNK_SIZE,
      metadata: {
        bucketName: params.bucket,
        objectName: params.path,
        contentType: params.file.type,
        cacheControl: "3600",
      },
      fingerprint: async () =>
        `shanyraq/${params.bucket}/${params.path}/${params.file.size}`,
      onError: (error) => reject(error),
      onProgress: (uploadedBytes, totalBytes) =>
        params.onProgress?.({
          uploadedBytes,
          totalBytes,
          percentage: totalBytes ? Math.round((uploadedBytes / totalBytes) * 100) : 0,
        }),
      onSuccess: () => resolve(),
    });

    params.onHandle?.({
      pause: () => void upload.abort(),
      resume: () => {
        void upload.findPreviousUploads().then((previous) => {
          if (previous.length > 0 && previous[0]) upload.resumeFromPreviousUpload(previous[0]);
          upload.start();
        });
      },
      abort: async () => {
        await upload.abort(true);
        reject(new Error("UPLOAD_CANCELLED"));
      },
    });

    void upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0 && previous[0]) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}
