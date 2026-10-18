import { supabase } from "@/integrations/supabase/client";

export type PlanMaterialStatus =
  | "planned"
  | "upcoming"
  | "waiting_for_material"
  | "material_submitted"
  | "under_moderation"
  | "approved"
  | "returned_for_revision"
  | "overdue_no_material";

export const MATERIAL_STATUS_LABELS: Record<PlanMaterialStatus, string> = {
  planned: "Жоспарланған",
  upcoming: "Жақында",
  waiting_for_material: "Материал күтілуде",
  material_submitted: "Материал жіберілді",
  under_moderation: "Модерацияда",
  approved: "Орындалды",
  returned_for_revision: "Түзетуге қайтарылды",
  overdue_no_material: "Материал салынбаған",
};

export const MATERIAL_STATUS_CLASS: Record<PlanMaterialStatus, string> = {
  planned: "bg-secondary text-secondary-foreground",
  upcoming: "bg-primary/10 text-primary",
  waiting_for_material: "bg-accent text-accent-foreground",
  material_submitted: "bg-primary/10 text-primary",
  under_moderation: "bg-primary/15 text-primary",
  approved: "bg-primary text-primary-foreground",
  returned_for_revision: "bg-destructive/10 text-destructive",
  overdue_no_material: "bg-destructive text-destructive-foreground",
};

export interface PlanItemOption {
  id: string;
  title: string;
  planned_date: string;
  material_status: PlanMaterialStatus;
}

/** Non-cancelled plan items of one organization, for linking uploaded material. */
export async function listPlanItemOptions(organizationId: string): Promise<PlanItemOption[]> {
  const { data, error } = await supabase
    .from("plan_items")
    .select("id, title, planned_date, material_status, status")
    .eq("organization_id", organizationId)
    .neq("status", "cancelled")
    .order("planned_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PlanItemOption[];
}

export interface MonitoringItem {
  id: string;
  title: string;
  planned_date: string;
  material_status: PlanMaterialStatus;
  requires_media: boolean;
  status: PlanExecutionStatus;
  source_item_id: string | null;
  organization_id: string;
  plan_id: string | null;
  organizations: { name: string; region_id: string | null } | null;
}

export async function listMonitoringItems(): Promise<MonitoringItem[]> {
  const { data, error } = await supabase
    .from("plan_items")
    .select("id, title, planned_date, material_status, requires_media, status, source_item_id, organization_id, plan_id, organizations(name, region_id)")
    .neq("status", "cancelled")
    .order("planned_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MonitoringItem[];
}

export function overdueDays(plannedDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planned = new Date(`${plannedDate}T00:00:00`);
  return Math.max(0, Math.round((today.getTime() - planned.getTime()) / 86400000));
}

export type PlanExecutionStatus = "planned" | "completion_submitted" | "completion_returned" | "completed" | "cancelled";

export type PlanDisplayKey =
  | "completed"
  | "report_review"
  | "report_returned"
  | "cancelled"
  | Exclude<PlanMaterialStatus, "approved">
  | "material_approved";

export const PLAN_DISPLAY_LABELS: Record<PlanDisplayKey, string> = {
  completed: "Орындалды",
  report_review: "Есеп тексеруде",
  report_returned: "Есеп түзетуге қайтарылды",
  cancelled: "Тоқтатылған",
  planned: "Жоспарланған",
  upcoming: "Жақында",
  waiting_for_material: "Материал күтілуде",
  material_submitted: "Материал жіберілді",
  under_moderation: "Материал модерацияда",
  material_approved: "Материал мақұлданды, есеп күтілуде",
  returned_for_revision: "Материал түзетуге қайтарылды",
  overdue_no_material: "Материал салынбаған",
};

const DISPLAY_CLASS: Record<PlanDisplayKey, string> = {
  completed: "bg-primary text-primary-foreground",
  report_review: "bg-primary/15 text-primary",
  report_returned: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  planned: MATERIAL_STATUS_CLASS.planned,
  upcoming: MATERIAL_STATUS_CLASS.upcoming,
  waiting_for_material: MATERIAL_STATUS_CLASS.waiting_for_material,
  material_submitted: MATERIAL_STATUS_CLASS.material_submitted,
  under_moderation: MATERIAL_STATUS_CLASS.under_moderation,
  material_approved: "bg-accent text-accent-foreground",
  returned_for_revision: MATERIAL_STATUS_CLASS.returned_for_revision,
  overdue_no_material: MATERIAL_STATUS_CLASS.overdue_no_material,
};

/**
 * Single status shown for a plan item. Execution confirmation (status) wins;
 * publication approval of material never means "completed" on its own.
 */
export function planDisplayKey(item: { status: PlanExecutionStatus; material_status: PlanMaterialStatus }): PlanDisplayKey {
  if (item.status === "completed") return "completed";
  if (item.status === "cancelled") return "cancelled";
  if (item.status === "completion_submitted") return "report_review";
  if (item.status === "completion_returned") return "report_returned";
  if (item.material_status === "approved") return "material_approved";
  return item.material_status;
}

export function planDisplay(item: { status: PlanExecutionStatus; material_status: PlanMaterialStatus }) {
  const key = planDisplayKey(item);
  return { key, label: PLAN_DISPLAY_LABELS[key], className: DISPLAY_CLASS[key] };
}

export { duplicateIds } from "./plan-duplicates";
