import { supabase } from "@/integrations/supabase/client";
import type { Organization } from "./types";

export async function listOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Organization[];
}

export interface OrganizationInput {
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  locality?: string | null;
  avatar_path?: string | null;
  cover_path?: string | null;
  region_id?: string | null;
  settlement?: string | null;
  organization_type?: Exclude<Organization["organization_type"], undefined>;
  director_name?: string | null;
  staff_count?: number | null;
  source_url?: string | null;
  verified_at?: string | null;
}

export async function uploadOrganizationImage(
  organizationId: string,
  kind: "avatar" | "cover",
  file: File,
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Тек сурет файлын таңдаңыз.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Сурет 8 МБ-тан аспауы керек.");
  const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
  const path = `${organizationId}/profile/${kind}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function createOrganization(input: OrganizationInput): Promise<Organization> {
  const { data, error } = await supabase.from("organizations").insert(input).select().single();
  if (error) throw error;
  return data as Organization;
}

export async function updateOrganization(
  id: string,
  input: Partial<OrganizationInput> & { status?: "active" | "inactive" },
): Promise<Organization> {
  const { data, error } = await supabase
    .from("organizations")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Organization;
}

export async function countAdministrators(): Promise<number> {
  const { count, error } = await supabase
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "ORGANIZATION_ADMIN");
  if (error) throw error;
  return count ?? 0;
}
