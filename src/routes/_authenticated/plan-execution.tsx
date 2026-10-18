import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { listRegions } from "@/lib/regions";
import {
  duplicateIds,
  listMonitoringItems,
  overdueDays,
  planDisplay,
  planDisplayKey,
  PLAN_DISPLAY_LABELS,
  type PlanDisplayKey,
} from "@/lib/plan-material";
import { formatDate } from "@/lib/format-date";

export const Route = createFileRoute("/_authenticated/plan-execution")({
  head: () => ({
    meta: [
      { title: "Жоспарлардың орындалуы — Шаңырақ" },
      { name: "description", content: "Ұйымдардың жоспарланған іс-шаралары мен материалдарын бақылау." },
      { property: "og:title", content: "Жоспарлардың орындалуы — Шаңырақ" },
      { property: "og:description", content: "Ұйымдардың жоспарланған іс-шаралары мен материалдарын бақылау." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { item?: string } =>
    typeof search["item"] === "string" ? { item: search["item"] } : {},
  component: PlanExecutionPage,
});

const selectClass = "min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

function PlanExecutionPage() {
  const { isSuperAdmin, loading } = useAuth();
  const { item: highlight } = Route.useSearch();
  const [region, setRegion] = useState("all");
  const [org, setOrg] = useState("all");
  const [status, setStatus] = useState<"all" | PlanDisplayKey>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const itemsQuery = useQuery({ queryKey: ["plan-items", "monitoring"], queryFn: listMonitoringItems, enabled: isSuperAdmin });
  const regionsQuery = useQuery({ queryKey: ["regions"], queryFn: listRegions, enabled: isSuperAdmin });

  const all = itemsQuery.data ?? [];
  const orgOptions = useMemo(
    () =>
      [...new Map(all.filter((i) => region === "all" || i.organizations?.region_id === region).map((i) => [i.organization_id, i.organizations?.name ?? ""])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [all, region],
  );

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Жүктелуде...</p>;
  if (!isSuperAdmin) return <p className="p-6 text-sm text-muted-foreground">Бұл бет тек орталық әкімшілікке қолжетімді.</p>;

  const scoped = all.filter(
    (i) =>
      (region === "all" || i.organizations?.region_id === region) &&
      (org === "all" || i.organization_id === org) &&
      (!from || i.planned_date >= from) &&
      (!to || i.planned_date <= to),
  );
  const rows = scoped.filter((i) => status === "all" || planDisplayKey(i) === status);
  // Summary counts: a monthly item repeating an annual one (source_item_id) is counted once.
  const dupes = duplicateIds(scoped);
  const counted = scoped.filter((i) => !dupes.has(i.id));
  const count = (s: PlanDisplayKey[]) => counted.filter((i) => s.includes(planDisplayKey(i))).length;
  const cards = [
    ["Барлық жоспарланған іс-шаралар", counted.length],
    ["Орындалды (расталған)", count(["completed"])],
    ["Тексеруде", count(["report_review", "under_moderation", "material_submitted"])],
    ["Материал/есеп күтілуде", count(["waiting_for_material", "returned_for_revision", "material_approved", "report_returned"])],
    ["Материал салынбаған", count(["overdue_no_material"])],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <PageHeader title="Жоспарлардың орындалуы" description="Материал негізінде іс-шаралардың орындалуын бақылау" />

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-card p-3 shadow-soft">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select aria-label="Аудан/қала" className={selectClass} value={region} onChange={(e) => { setRegion(e.target.value); setOrg("all"); }}>
          <option value="all">Барлық аудан/қала</option>
          {(regionsQuery.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select aria-label="Ұйым" className={selectClass} value={org} onChange={(e) => setOrg(e.target.value)}>
          <option value="all">Барлық ұйым</option>
          {orgOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select aria-label="Күйі" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">Барлық күй</option>
          {(Object.keys(PLAN_DISPLAY_LABELS) as PlanDisplayKey[]).filter((s) => s !== "cancelled").map((s) => <option key={s} value={s}>{PLAN_DISPLAY_LABELS[s]}</option>)}
        </select>
        <Input type="date" aria-label="Басталу күні" className="min-h-11" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" aria-label="Аяқталу күні" className="min-h-11" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {itemsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Жүктелуде...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Жоспарланған іс-шаралар табылмады.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {rows.map((i) => {
            const d = planDisplay(i);
            const days = d.key === "overdue_no_material" ? overdueDays(i.planned_date) : 0;
            return (
              <li key={i.id}>
                <Link
                  to="/orgs/$organizationId"
                  params={{ organizationId: i.organization_id }}
                  className={`block rounded-2xl border bg-card p-4 shadow-soft transition hover:border-primary/50 ${highlight === i.id ? "border-primary ring-2 ring-primary/30" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-snug">{i.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${d.className}`}>
                      {d.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{i.organizations?.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Жоспарлы күні: {formatDate(i.planned_date)}
                    {days > 0 ? ` · ${days} күн кешіктірілді` : ""}
                    {dupes.has(i.id) ? " · Жылдық жоспардағы тармақтың қайталануы (қорытындыда бір рет есептеледі)" : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
