/**
 * Event drafts saved on the device while the connection is down.
 * Only plain text fields are kept — never signed URLs, tokens or other organizations' data.
 */

const STORAGE_KEY = "shanyraq.offline-event-drafts";

export interface OfflineEventDraft {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  /** Names of the files the user picked on the device (references only). */
  media_names: string[];
  saved_at: string;
}

function readAll(): OfflineEventDraft[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OfflineEventDraft[]) : [];
  } catch {
    return [];
  }
}

function writeAll(drafts: OfflineEventDraft[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function listOfflineDrafts(organizationId: string): OfflineEventDraft[] {
  return readAll().filter((draft) => draft.organization_id === organizationId);
}

export function saveOfflineDraft(draft: Omit<OfflineEventDraft, "id" | "saved_at"> & { id?: string }) {
  const drafts = readAll();
  const id = draft.id ?? crypto.randomUUID();
  const next: OfflineEventDraft = { ...draft, id, saved_at: new Date().toISOString() };
  const index = drafts.findIndex((item) => item.id === id);
  if (index >= 0) drafts[index] = next;
  else drafts.push(next);
  writeAll(drafts);
  return next;
}

export function removeOfflineDraft(id: string) {
  writeAll(readAll().filter((draft) => draft.id !== id));
}
