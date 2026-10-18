import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OrganizationType = Database["public"]["Enums"]["organization_type"];
export type Region = Database["public"]["Tables"]["regions"]["Row"];

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  district_center: "Аудандық мәдениет орталығы",
  house_of_culture: "Мәдениет үйі",
  rural_house: "Ауылдық мәдениет үйі",
  club: "Клуб",
  leisure_center: "Мәдени-демалыс орталығы",
};

export const ORGANIZATION_TYPES = Object.keys(ORGANIZATION_TYPE_LABELS) as OrganizationType[];

export async function listRegions(): Promise<Region[]> {
  const { data, error } = await supabase.from("regions").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function saveRegion(input: { id?: string | undefined; name: string; kind: "city" | "district"; sort_order: number }) {
  const { id, ...rest } = input;
  const { error } = id
    ? await supabase.from("regions").update(rest).eq("id", id)
    : await supabase.from("regions").insert(rest);
  if (error) throw error;
}

export async function deleteRegion(id: string) {
  const { error } = await supabase.from("regions").delete().eq("id", id);
  if (error) throw error;
}

/** Deletes an organization only when nothing is attached to it; otherwise explains why. */
export async function deleteOrganizationIfEmpty(id: string) {
  // Users are counted via profiles.organization_id (source of truth), not organization_members.
  const tables = ["events", "media_items", "plans", "plan_items", "profiles"] as const;
  const counts = await Promise.all(
    tables.map((table) =>
      supabase.from(table).select("id", { count: "exact", head: true }).eq("organization_id", id),
    ),
  );
  if (counts.some((result) => (result.count ?? 0) > 0)) {
    throw new Error("Ұйымда материалдар немесе әкімші бар. Өшірудің орнына «Белсенді емес» етіңіз.");
  }
  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) throw error;
}
