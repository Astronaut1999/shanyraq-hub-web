import { supabase } from "@/integrations/supabase/client";
import type { PlanItem, PlanItemStatus } from "./types";

export const PLAN_ITEM_STATUS_LABELS: Record<PlanItemStatus, string> = {
  planned: "Жоспарланған",
  completion_submitted: "Тексеруге жіберілген",
  completion_returned: "Түзетуге қайтарылды",
  completed: "Орындалуы расталған",
  cancelled: "Тоқтатылған",
};

export const MONTH_NAMES = [
  "Қаңтар",
  "Ақпан",
  "Наурыз",
  "Сәуір",
  "Мамыр",
  "Маусым",
  "Шілде",
  "Тамыз",
  "Қыркүйек",
  "Қазан",
  "Қараша",
  "Желтоқсан",
];

const PLAN_ITEM_ERRORS: Record<string, string> = {
  PLAN_ITEM_NOT_FOUND: "Жоспар тармағы табылмады.",
  PLAN_ITEM_NOT_SUBMITTABLE: "Бұл тармақты қазір тексеруге жіберуге болмайды.",
  PLAN_ITEM_NOT_IN_REVIEW: "Бұл тармақ тексеруде емес.",
  PLAN_ITEM_COMPLETED: "Орындалуы расталған тармақты тоқтатуға болмайды.",
  PLAN_ITEM_NOT_CANCELLED: "Бұл тармақ тоқтатылмаған.",
  PLAN_ITEM_WORKFLOW_FORBIDDEN: "Бұл өрістерді тікелей өзгертуге болмайды.",
  EVENT_REQUIRED: "Алдымен тармаққа іс-шараны байланыстырыңыз.",
  EVIDENCE_REQUIRED: "Дәлел ретінде кемінде бір фото немесе видео қажет.",
  REPORT_REQUIRED: "Қысқаша есеп жазыңыз.",
  COMPLETION_DATE_REQUIRED: "Нақты орындалған күнді көрсетіңіз.",
  REASON_REQUIRED: "Себебін көрсетіңіз.",
  EVENT_ORGANIZATION_MISMATCH: "Іс-шара басқа ұйымға тиесілі.",
  PLAN_ORGANIZATION_MISMATCH: "Жоспар басқа ұйымға тиесілі.",
  SOURCE_ORGANIZATION_MISMATCH: "Негізгі тармақ басқа ұйымға тиесілі.",
  FORBIDDEN: "Бұл әрекетке рұқсатыңыз жоқ.",
};

function translate(message: string): Error {
  const key = Object.keys(PLAN_ITEM_ERRORS).find((k) => message.includes(k));
  return new Error(key ? PLAN_ITEM_ERRORS[key]! : message);
}

const SELECT =
  "*, organizations(name), plans(title, plan_type, period_year, period_month), events(title, event_date, moderation_status)";

export async function listPlanItems(): Promise<PlanItem[]> {
  const { data, error } = await supabase
    .from("plan_items")
    .select(SELECT)
    .order("planned_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PlanItem[];
}

export async function listReviewPlanItems(): Promise<PlanItem[]> {
  const { data, error } = await supabase
    .from("plan_items")
    .select(SELECT)
    .eq("status", "completion_submitted")
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PlanItem[];
}

export interface PlanItemInput {
  organization_id: string;
  plan_id: string | null;
  source_item_id: string | null;
  event_id: string | null;
  title: string;
  planned_date: string;
  responsible: string | null;
  notes: string | null;
  requires_media?: boolean;
}

export async function createPlanItem(input: PlanItemInput): Promise<PlanItem> {
  const { data, error } = await supabase.from("plan_items").insert(input).select().single();
  if (error) throw translate(error.message);
  return data as unknown as PlanItem;
}

export async function updatePlanItem(id: string, input: Partial<PlanItemInput>): Promise<PlanItem> {
  const { data, error } = await supabase
    .from("plan_items")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw translate(error.message);
  return data as unknown as PlanItem;
}

export async function deletePlanItem(id: string): Promise<void> {
  const { error } = await supabase.from("plan_items").delete().eq("id", id);
  if (error) throw translate(error.message);
}

export async function submitPlanItemCompletion(params: {
  id: string;
  completedOn: string;
  report: string;
}): Promise<void> {
  const { error } = await supabase.rpc("submit_plan_item_completion", {
    _item_id: params.id,
    _completed_on: params.completedOn,
    _report: params.report,
  });
  if (error) throw translate(error.message);
}

export async function reviewPlanItemCompletion(params: {
  id: string;
  approved: boolean;
  reason?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("review_plan_item_completion", {
    _item_id: params.id,
    _approved: params.approved,
    ...(params.reason ? { _reason: params.reason } : {}),
  });
  if (error) throw translate(error.message);
}

export async function cancelPlanItem(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_plan_item", { _item_id: id, _reason: reason });
  if (error) throw translate(error.message);
}

export async function reopenPlanItem(id: string): Promise<void> {
  const { error } = await supabase.rpc("reopen_plan_item", { _item_id: id });
  if (error) throw translate(error.message);
}

/** Overdue is derived from the planned date and the execution state only. */
export function isOverdue(item: Pick<PlanItem, "planned_date" | "status">): boolean {
  if (item.status === "completed" || item.status === "cancelled") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${item.planned_date}T00:00:00`).getTime() < today.getTime();
}

export function planItemIsEditable(item: PlanItem): boolean {
  return (
    item.status === "planned" ||
    item.status === "completion_returned" ||
    item.status === "cancelled"
  );
}

export function formatPeriod(year: number, month: number | null): string {
  return month ? `${MONTH_NAMES[month - 1]} ${year}` : `${year} жыл`;
}
