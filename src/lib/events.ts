import { supabase } from "@/integrations/supabase/client";
import { MEDIA_BUCKET } from "./media";
import type { EventItem, EventStatus, MediaItem, MediaItemWithUrl } from "./types";

export interface EventInput {
  organization_id: string;
  title: string;
  description?: string | null;
  event_date: string;
  event_time?: string | null;
  location?: string | null;
}

const EVENT_SELECT = "*, organizations(name), media_items(id, media_kind)";

export async function listEvents(): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .order("event_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as EventItem[];
}

export async function listPendingEvents(): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("moderation_status", "pending")
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EventItem[];
}

export async function createEvent(input: EventInput): Promise<EventItem> {
  const { data, error } = await supabase.from("events").insert(input).select().single();
  if (error) throw error;
  return data as unknown as EventItem;
}

export async function updateEvent(id: string, input: Partial<EventInput>): Promise<EventItem> {
  const { data, error } = await supabase
    .from("events")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as EventItem;
}

export async function deleteEvent(id: string): Promise<void> {
  const { data: media } = await supabase
    .from("media_items")
    .select("storage_path")
    .eq("event_id", id);
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
  const paths = (media ?? []).map((m) => m.storage_path);
  if (paths.length > 0) await supabase.storage.from(MEDIA_BUCKET).remove(paths);
}

/** Fresh signed URLs every time an event preview is opened. */
export async function listEventMedia(eventId: string): Promise<MediaItemWithUrl[]> {
  const { data, error } = await supabase
    .from("media_items")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const items = (data ?? []) as unknown as MediaItem[];
  if (items.length === 0) return [];
  const { data: signed } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(items.map((i) => i.storage_path), 3600);
  const map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return items.map((item) => ({ ...item, url: map.get(item.storage_path) ?? null }));
}

const EVENT_ERRORS: Record<string, string> = {
  MEDIA_REQUIRED: "Модерацияға жіберу үшін кемінде бір фото немесе видео қосыңыз.",
  EVENT_NOT_EDITABLE: "Бұл іс-шараның күйін өзгертуге болмайды.",
  EVENT_NOT_FOUND: "Іс-шара табылмады.",
  FORBIDDEN: "Бұл әрекетке рұқсатыңыз жоқ.",
  REASON_REQUIRED: "Қабылданбау себебін көрсетіңіз.",
};

function translateError(message: string): Error {
  const key = Object.keys(EVENT_ERRORS).find((k) => message.includes(k));
  return new Error(key ? EVENT_ERRORS[key]! : message);
}

export async function submitEventForModeration(eventId: string): Promise<void> {
  const { error } = await supabase.rpc("submit_event_for_moderation", { _event_id: eventId });
  if (error) throw translateError(error.message);
}

export async function moderateEvent(params: {
  eventId: string;
  status: Extract<EventStatus, "approved" | "rejected">;
  reason?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("moderate_event", {
    _event_id: params.eventId,
    _status: params.status,
    ...(params.reason ? { _reason: params.reason } : {}),
  });
  if (error) throw translateError(error.message);
}

export function isPastEvent(event: Pick<EventItem, "event_date" | "event_time">): boolean {
  const time = event.event_time ?? "23:59:59";
  return new Date(`${event.event_date}T${time}`).getTime() < Date.now();
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Жоба",
  pending: "Модерацияда",
  approved: "Мақұлданды",
  rejected: "Қабылданбады",
};

export function isEventEditable(event: EventItem): boolean {
  return event.moderation_status === "draft" || event.moderation_status === "rejected";
}
