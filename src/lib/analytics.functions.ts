import { duplicateIds } from "./plan-duplicates";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const filterSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).nullable(),
  organizationId: z.string().uuid().nullable(),
  planType: z.enum(["all", "annual", "monthly"]),
  includeDemo: z.boolean(),
});

export type AnalyticsFilters = z.infer<typeof filterSchema>;

export interface AnalyticsRow {
  id: string;
  organization_id: string;
  organization_name: string;
  plan_title: string | null;
  plan_type: "annual" | "monthly" | null;
  title: string;
  planned_date: string;
  completed_on: string | null;
  status: "planned" | "completion_submitted" | "completion_returned" | "completed" | "cancelled";
  overdue: boolean;
  responsible: string | null;
  event_title: string | null;
  is_demo: boolean;
  duplicate_of: string | null;
}

export interface AnalyticsOrgSummary {
  organization_id: string;
  organization_name: string;
  planned: number;
  completed: number;
  awaitingReview: number;
  overdueNoSubmission: number;
  cancelled: number;
  unplannedEvents: number;
  completionRate: number | null;
  hasPlanDocument: boolean;
}

export interface AnalyticsResult {
  filters: AnalyticsFilters;
  periodStart: string;
  periodEnd: string;
  scope: "all" | "organization";
  totals: {
    plannedTotal: number;
    eligible: number;
    completed: number;
    awaitingReview: number;
    awaitingReviewOverdue: number;
    overdueNoSubmission: number;
    cancelled: number;
    unplannedEvents: number;
    duplicatesExcluded: number;
    completionRate: number | null;
  };
  coverage: {
    activeOrganizations: number;
    submitted: number;
    missing: { id: string; name: string }[];
    submittedOrganizations: { id: string; name: string }[];
  };
  organizations: AnalyticsOrgSummary[];
  rows: AnalyticsRow[];
  generatedAt: string;
}

function periodBounds(year: number, month: number | null) {
  const start = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const end = month ? new Date(Date.UTC(year, month, 0)) : new Date(Date.UTC(year, 11, 31));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * Operational analytics. Access is resolved on the server from the caller's
 * role: an organization administrator is always constrained to their own
 * organization, and unprivileged users are rejected outright.
 */
export const getAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => filterSchema.parse(data))
  .handler(async ({ data, context }): Promise<AnalyticsResult> => {
    const supabase = context.supabase;

    const { data: isSuper, error: roleError } = await supabase.rpc("is_super_admin");
    if (roleError) throw new Error(roleError.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: isOrgAdmin } = await supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "ORGANIZATION_ADMIN",
    });

    if (!isSuper && !(isOrgAdmin && profile?.organization_id)) throw new Error("FORBIDDEN");

    const scopedOrganizationId = isSuper ? data.organizationId : profile!.organization_id!;
    const { start, end } = periodBounds(data.year, data.month);

    // ---- Organizations ------------------------------------------------------
    let orgQuery = supabase.from("organizations").select("id, name, status, is_demo");
    if (scopedOrganizationId) orgQuery = orgQuery.eq("id", scopedOrganizationId);
    const { data: orgRows, error: orgError } = await orgQuery;
    if (orgError) throw new Error(orgError.message);
    const organizations = (orgRows ?? []).filter(
      (o) => o.status === "active" && (data.includeDemo || !o.is_demo),
    );
    const allowedOrgIds = new Set(organizations.map((o) => o.id));
    const orgName = new Map(organizations.map((o) => [o.id, o.name]));

    // ---- Plan items ---------------------------------------------------------
    let itemQuery = supabase
      .from("plan_items")
      .select(
        "id, organization_id, plan_id, source_item_id, event_id, title, planned_date, completed_on, status, responsible, is_demo, plans(title, plan_type), events(title)",
      )
      .gte("planned_date", start)
      .lte("planned_date", end);
    if (scopedOrganizationId) itemQuery = itemQuery.eq("organization_id", scopedOrganizationId);
    const { data: itemRows, error: itemError } = await itemQuery;
    if (itemError) throw new Error(itemError.message);

    type RawItem = (typeof itemRows extends (infer T)[] | null ? T : never) & {
      plans: { title: string; plan_type: "annual" | "monthly" } | null;
      events: { title: string } | null;
    };

    const items = ((itemRows ?? []) as unknown as RawItem[]).filter((item) => {
      if (!allowedOrgIds.has(item.organization_id)) return false;
      if (!data.includeDemo && item.is_demo) return false;
      if (data.planType !== "all" && item.plans?.plan_type !== data.planType) return false;
      return true;
    });

    const dupes = duplicateIds(items);
    const today = new Date().toISOString().slice(0, 10);

    const rows: AnalyticsRow[] = items.map((item) => ({
      id: item.id,
      organization_id: item.organization_id,
      organization_name: orgName.get(item.organization_id) ?? "—",
      plan_title: item.plans?.title ?? null,
      plan_type: item.plans?.plan_type ?? null,
      title: item.title,
      planned_date: item.planned_date,
      completed_on: item.completed_on,
      status: item.status,
      overdue:
        (item.status === "planned" ||
          item.status === "completion_submitted" ||
          item.status === "completion_returned") &&
        item.planned_date < today,
      responsible: item.responsible,
      event_title: item.events?.title ?? null,
      is_demo: item.is_demo,
      // The same underlying activity referenced from a monthly plan is not
      // counted twice when its annual original is part of the same cohort.
      duplicate_of:
        dupes.has(item.id) ? item.source_item_id : null,
    }));

    const counted = rows.filter((r) => !r.duplicate_of);
    const duplicatesExcluded = rows.length - counted.length;

    // ---- Events (for unplanned counts) --------------------------------------
    let eventQuery = supabase
      .from("events")
      .select("id, organization_id, event_date")
      .gte("event_date", start)
      .lte("event_date", end);
    if (scopedOrganizationId) eventQuery = eventQuery.eq("organization_id", scopedOrganizationId);
    const { data: eventRows, error: eventError } = await eventQuery;
    if (eventError) throw new Error(eventError.message);

    let linkedQuery = supabase.from("plan_items").select("event_id").not("event_id", "is", null);
    if (scopedOrganizationId) linkedQuery = linkedQuery.eq("organization_id", scopedOrganizationId);
    const { data: linkedRows } = await linkedQuery;
    const linkedEventIds = new Set((linkedRows ?? []).map((r) => r.event_id as string));

    const unplannedEvents = (eventRows ?? []).filter(
      (e) => allowedOrgIds.has(e.organization_id) && !linkedEventIds.has(e.id),
    );

    // ---- Plan document submission coverage ----------------------------------
    let planQuery = supabase
      .from("plans")
      .select("id, organization_id, plan_type, period_year, period_month, file_path")
      .eq("period_year", data.year);
    if (scopedOrganizationId) planQuery = planQuery.eq("organization_id", scopedOrganizationId);
    const { data: planRows } = await planQuery;
    const coverageOrgIds = new Set(
      (planRows ?? [])
        .filter((p) => {
          if (!p.file_path || !allowedOrgIds.has(p.organization_id)) return false;
          if (data.month) return p.plan_type === "monthly" && p.period_month === data.month;
          return p.plan_type === "annual";
        })
        .map((p) => p.organization_id),
    );

    const summarise = (orgId: string): AnalyticsOrgSummary => {
      const own = counted.filter((r) => r.organization_id === orgId);
      const cancelled = own.filter((r) => r.status === "cancelled").length;
      const completed = own.filter((r) => r.status === "completed").length;
      const eligible = own.length - cancelled;
      return {
        organization_id: orgId,
        organization_name: orgName.get(orgId) ?? "—",
        planned: own.length,
        completed,
        awaitingReview: own.filter((r) => r.status === "completion_submitted").length,
        overdueNoSubmission: own.filter(
          (r) => (r.status === "planned" || r.status === "completion_returned") && r.overdue,
        ).length,
        cancelled,
        unplannedEvents: unplannedEvents.filter((e) => e.organization_id === orgId).length,
        completionRate: eligible > 0 ? Math.round((completed / eligible) * 1000) / 10 : null,
        hasPlanDocument: coverageOrgIds.has(orgId),
      };
    };

    const cancelled = counted.filter((r) => r.status === "cancelled").length;
    const completed = counted.filter((r) => r.status === "completed").length;
    const eligible = counted.length - cancelled;

    return {
      filters: data,
      periodStart: start,
      periodEnd: end,
      scope: scopedOrganizationId ? "organization" : "all",
      totals: {
        plannedTotal: counted.length,
        eligible,
        completed,
        awaitingReview: counted.filter((r) => r.status === "completion_submitted").length,
        awaitingReviewOverdue: counted.filter(
          (r) => r.status === "completion_submitted" && r.overdue,
        ).length,
        overdueNoSubmission: counted.filter(
          (r) => (r.status === "planned" || r.status === "completion_returned") && r.overdue,
        ).length,
        cancelled,
        unplannedEvents: unplannedEvents.length,
        duplicatesExcluded,
        completionRate: eligible > 0 ? Math.round((completed / eligible) * 1000) / 10 : null,
      },
      coverage: {
        activeOrganizations: organizations.length,
        submitted: coverageOrgIds.size,
        missing: organizations
          .filter((o) => !coverageOrgIds.has(o.id))
          .map((o) => ({ id: o.id, name: o.name })),
        submittedOrganizations: organizations
          .filter((o) => coverageOrgIds.has(o.id))
          .map((o) => ({ id: o.id, name: o.name })),
      },
      organizations: organizations.map((o) => summarise(o.id)),
      rows: rows.sort((a, b) => a.planned_date.localeCompare(b.planned_date)),
      generatedAt: new Date().toISOString(),
    };
  });
