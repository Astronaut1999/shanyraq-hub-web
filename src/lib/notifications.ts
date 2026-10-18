import { supabase } from "@/integrations/supabase/client";

export type NotificationCategory = "all" | "plans" | "moderation" | "system";

export interface AppNotification {
  id: string;
  recipient_user_id: string | null;
  recipient_role: string | null;
  organization_id: string | null;
  notification_type: string;
  related_plan_item_id: string | null;
  related_media_id: string | null;
  related_event_id: string | null;
  title: string;
  message: string;
  action_label: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export function notificationCategory(type: string): Exclude<NotificationCategory, "all"> {
  if (type.startsWith("plan_")) return "plans";
  if (type.startsWith("moderation_")) return "moderation";
  return "system";
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as AppNotification[];
}

export async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
  if (error) throw error;
}
