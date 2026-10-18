import { supabase } from "@/integrations/supabase/client";
import { optimizeImage } from "./image-optimize";
import { needsResumableUpload, resumableUpload, type ResumableHandle, type UploadProgress } from "./resumable-upload";
import type { MediaItem, MediaItemWithUrl, MediaKind } from "./types";

export const MEDIA_BUCKET = "media";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

export function validateMediaFile(file: File): { kind: MediaKind } {
  if (IMAGE_TYPES.includes(file.type)) {
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error("Сурет өлшемі 10 МБ-тан аспауы керек.");
    }
    return { kind: "photo" };
  }
  if (VIDEO_TYPES.includes(file.type)) {
    if (file.size > MAX_VIDEO_SIZE) {
      throw new Error("Видео өлшемі 100 МБ-тан аспауы керек.");
    }
    return { kind: "video" };
  }
  throw new Error("Файл түрі қолдау таппайды (JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV).");
}

async function withUrls(items: MediaItem[]): Promise<MediaItemWithUrl[]> {
  if (items.length === 0) return [];
  const paths = [
    ...items.map((i) => i.storage_path),
    ...items.flatMap((i) => (i.thumbnail_path ? [i.thumbnail_path] : [])),
  ];
  const { data } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(paths, 3600);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return items.map((item) => ({
    ...item,
    url: map.get(item.storage_path) ?? null,
    thumbnail_url: item.thumbnail_path ? (map.get(item.thumbnail_path) ?? null) : null,
  }));
}

export async function listMedia(organizationId?: string | null): Promise<MediaItemWithUrl[]> {
  let query = supabase
    .from("media_items")
    .select("*, organizations(name), events(title, moderation_status)")
    .order("created_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query;
  if (error) throw error;
  return withUrls((data ?? []) as unknown as MediaItem[]);
}

export async function listPendingMedia(): Promise<MediaItemWithUrl[]> {
  const { data, error } = await supabase
    .from("media_items")
    .select("*, organizations(name)")
    .eq("status", "pending")
    .is("event_id", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const items = (data ?? []) as unknown as MediaItem[];
  const uploaderIds = [...new Set(items.flatMap((item) => (item.uploader_id ? [item.uploader_id] : [])))];
  const uploaderMap = new Map<string, { full_name: string | null; email: string | null }>();

  if (uploaderIds.length > 0) {
    const { data: uploaders } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", uploaderIds);
    for (const uploader of uploaders ?? []) {
      uploaderMap.set(uploader.id, { full_name: uploader.full_name, email: uploader.email });
    }
  }

  const itemsWithUrls = await withUrls(items);
  return itemsWithUrls.map((item) => ({
    ...item,
    uploader: item.uploader_id ? (uploaderMap.get(item.uploader_id) ?? null) : null,
  }));
}

export async function getMediaPreviewUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Медиа файлы табылмады.");
  return data.signedUrl;
}

export interface UploadMediaParams {
  file: File;
  title: string;
  description?: string | null;
  organizationId: string;
  uploaderId: string | null;
  eventId?: string | null;
  planItemId?: string | null;
  onProgress?: (progress: UploadProgress) => void;
  onHandle?: (handle: ResumableHandle) => void;
}

/**
 * Uploads one photo or video.
 * Photos are resized/compressed and get a lightweight thumbnail for list cards.
 * Large files and all videos use resumable (TUS) uploads so a dropped connection
 * can continue instead of restarting. The database row is only created after the
 * storage object has actually finished uploading, which prevents duplicate or
 * half-finished records.
 */
export async function uploadMedia(params: UploadMediaParams): Promise<void> {
  const { kind } = validateMediaFile(params.file);

  let file = params.file;
  let thumbnail: File | null = null;
  if (kind === "photo") {
    const optimized = await optimizeImage(params.file);
    file = optimized.file;
    thumbnail = optimized.thumbnail;
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const baseName = crypto.randomUUID();
  const path = `${params.organizationId}/${baseName}.${ext}`;
  const uploaded: string[] = [];

  try {
    if (needsResumableUpload(file)) {
      await resumableUpload({
        bucket: MEDIA_BUCKET,
        path,
        file,
        ...(params.onProgress ? { onProgress: params.onProgress } : {}),
        ...(params.onHandle ? { onHandle: params.onHandle } : {}),
      });
    } else {
      params.onProgress?.({ uploadedBytes: 0, totalBytes: file.size, percentage: 0 });
      const upload = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upload.error) throw upload.error;
      params.onProgress?.({ uploadedBytes: file.size, totalBytes: file.size, percentage: 100 });
    }
    uploaded.push(path);

    let thumbnailPath: string | null = null;
    if (thumbnail) {
      const thumbExt = thumbnail.name.split(".").pop() ?? "webp";
      thumbnailPath = `${params.organizationId}/thumb-${baseName}.${thumbExt}`;
      const thumbUpload = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(thumbnailPath, thumbnail, { contentType: thumbnail.type, upsert: false });
      if (thumbUpload.error) thumbnailPath = null;
      else uploaded.push(thumbnailPath);
    }

    const { error } = await supabase.from("media_items").insert({
      organization_id: params.organizationId,
      event_id: params.eventId ?? null,
      plan_item_id: params.planItemId ?? null,
      uploader_id: params.uploaderId,
      title: params.title,
      description: params.description ?? null,
      storage_path: path,
      thumbnail_path: thumbnailPath,
      media_kind: kind,
      mime_type: file.type,
      file_size: file.size,
    });
    if (error) throw error;
  } catch (error) {
    if (uploaded.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(uploaded);
    throw error;
  }
}

/**
 * Permanently deletes a media record, then removes its storage file and thumbnail
 * unless another record still references the same path.
 */
export async function deleteMedia(item: MediaItem): Promise<void> {
  const { data: deleted, error } = await supabase
    .from("media_items")
    .delete()
    .eq("id", item.id)
    .select("id");
  if (error) throw error;
  if (!deleted || deleted.length === 0) throw new Error("Өшіруге рұқсат жоқ.");
  const paths = [item.storage_path, ...(item.thumbnail_path ? [item.thumbnail_path] : [])];
  const { data: stillUsed } = await supabase
    .from("media_items")
    .select("storage_path, thumbnail_path")
    .or(paths.map((p) => `storage_path.eq.${p},thumbnail_path.eq.${p}`).join(","));
  const referenced = new Set(
    (stillUsed ?? []).flatMap((r) => [r.storage_path, r.thumbnail_path].filter(Boolean) as string[]),
  );
  const orphaned = paths.filter((p) => !referenced.has(p));
  if (orphaned.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(orphaned);
}

/** Hides an approved item from all public surfaces while keeping the record for history. */
export async function unpublishMedia(item: MediaItem): Promise<void> {
  const { error } = await supabase.rpc("unpublish_publication", {
    _type: "media_item",
    _id: item.id,
  });
  if (error) throw error;
}

export async function moderateMedia(params: {
  id: string;
  status: "approved" | "rejected";
  rejectionReason?: string | null;
  reviewerId: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from("media_items")
    .update({
      status: params.status,
      rejection_reason: params.status === "rejected" ? (params.rejectionReason ?? null) : null,
      reviewed_by: params.reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.id);
  if (error) throw error;
}

/**
 * Fresh signed URL for a media item by id using the signed-in user's session.
 * Row and storage access rules decide: the owning organization and the central
 * administrator succeed; everyone else is denied.
 */
export async function getOwnMediaUrlById(mediaId: string): Promise<string> {
  const { data, error } = await supabase.from("media_items").select("storage_path").eq("id", mediaId).maybeSingle();
  if (error || !data) throw new Error("Медиа файлы табылмады.");
  return getMediaPreviewUrl(data.storage_path);
}
