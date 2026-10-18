import { supabase } from "@/integrations/supabase/client";

export interface PendingCounts {
  /** Event packages awaiting moderation — counted once per event, not per photo. */
  eventPackages: number;
  /** Media awaiting moderation that is not part of an event package. */
  standaloneMedia: number;
  /** Plan activities whose completion was submitted for central review. */
  completionReviews: number;
  total: number;
}

/** Single source of truth for every pending badge and counter in the app. */
export async function getPendingCounts(): Promise<PendingCounts> {
  const [events, media, completions] = await Promise.all([
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "pending"),
    supabase
      .from("media_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("event_id", null),
    supabase
      .from("plan_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "completion_submitted"),
  ]);

  const eventPackages = events.count ?? 0;
  const standaloneMedia = media.count ?? 0;
  const completionReviews = completions.count ?? 0;
  return {
    eventPackages,
    standaloneMedia,
    completionReviews,
    total: eventPackages + standaloneMedia + completionReviews,
  };
}
