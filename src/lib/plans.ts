import { supabase } from "@/integrations/supabase/client";
import type { Plan, PlanType } from "./types";

export const PLAN_BUCKET = "plan-files";

export const PLAN_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export const PLAN_FILE_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];

export const MAX_PLAN_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export function validatePlanFile(file: File): void {
  const lower = file.name.toLowerCase();
  const extOk = PLAN_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!PLAN_FILE_TYPES.includes(file.type) && !extOk) {
    throw new Error("Файл түрі қолдау таппайды (PDF, DOC, DOCX, XLS, XLSX).");
  }
  if (file.size > MAX_PLAN_FILE_SIZE) {
    throw new Error("Файл өлшемі 20 МБ-тан аспауы керек.");
  }
}

export function safeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.length > 0 ? cleaned.slice(-120) : "document";
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

export interface PlanInput {
  organization_id: string;
  title: string;
  description?: string | null;
  plan_type: PlanType;
  period_year: number;
  period_month?: number | null;
}

export async function listPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("*, organizations(name)")
    .order("period_year", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Plan[];
}

async function uploadPlanFile(params: {
  file: File;
  organizationId: string;
  planId: string;
}): Promise<{ path: string; name: string; mime: string; size: number }> {
  validatePlanFile(params.file);
  const name = safeFileName(params.file.name);
  const path = `${params.organizationId}/${params.planId}/${Date.now()}-${name}`;
  const { error } = await supabase.storage
    .from(PLAN_BUCKET)
    .upload(path, params.file, { contentType: params.file.type, upsert: false });
  if (error) throw error;
  return { path, name: params.file.name, mime: params.file.type, size: params.file.size };
}

async function removePlanFile(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from(PLAN_BUCKET).remove([path]);
}

export async function createPlan(input: PlanInput, file: File): Promise<Plan> {
  validatePlanFile(file);
  const { data, error } = await supabase.from("plans").insert(input).select().single();
  if (error) throw error;
  const plan = data as unknown as Plan;

  try {
    const uploaded = await uploadPlanFile({
      file,
      organizationId: input.organization_id,
      planId: plan.id,
    });
    const { data: updated, error: updateError } = await supabase
      .from("plans")
      .update({
        file_path: uploaded.path,
        file_name: uploaded.name,
        file_mime_type: uploaded.mime,
        file_size: uploaded.size,
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", plan.id)
      .select()
      .single();
    if (updateError) {
      await removePlanFile(uploaded.path);
      throw updateError;
    }
    return updated as unknown as Plan;
  } catch (uploadError) {
    await supabase.from("plans").delete().eq("id", plan.id);
    throw uploadError;
  }
}

export async function updatePlan(
  id: string,
  input: Partial<PlanInput>,
  file?: File | null,
): Promise<Plan> {
  const existing = await supabase.from("plans").select("*").eq("id", id).single();
  if (existing.error) throw existing.error;
  const current = existing.data as unknown as Plan;

  let filePatch: Record<string, unknown> = {};
  let uploadedPath: string | null = null;

  if (file) {
    const uploaded = await uploadPlanFile({
      file,
      organizationId: current.organization_id,
      planId: id,
    });
    uploadedPath = uploaded.path;
    filePatch = {
      file_path: uploaded.path,
      file_name: uploaded.name,
      file_mime_type: uploaded.mime,
      file_size: uploaded.size,
      uploaded_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("plans")
    .update({ ...input, ...filePatch })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    await removePlanFile(uploadedPath);
    throw error;
  }

  // Replacement succeeded — clean up the previous object.
  if (uploadedPath && current.file_path && current.file_path !== uploadedPath) {
    await removePlanFile(current.file_path);
  }
  return data as unknown as Plan;
}

export async function deletePlan(id: string): Promise<void> {
  const existing = await supabase.from("plans").select("file_path").eq("id", id).maybeSingle();
  const path = (existing.data as { file_path: string | null } | null)?.file_path ?? null;
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw error;
  await removePlanFile(path);
}

export async function getPlanFileUrl(path: string, download?: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PLAN_BUCKET)
    .createSignedUrl(path, 3600, download ? { download } : undefined);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Жоспар файлы табылмады.");
  return data.signedUrl;
}
