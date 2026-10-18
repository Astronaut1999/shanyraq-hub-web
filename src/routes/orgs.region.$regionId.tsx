import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, CalendarDays, Images, MapPin, UserRound, Users } from "lucide-react";
import { useState } from "react";

import { PublicShell } from "@/components/layout/PublicShell";
import { cn } from "@/lib/utils";
import { listPublicOrganizations, listPublicRegions } from "@/lib/feed.functions";
import { ORGANIZATION_TYPE_LABELS, ORGANIZATION_TYPES, type OrganizationType } from "@/lib/regions";

export const Route = createFileRoute("/orgs/region/$regionId")({
  head: () => ({
    meta: [
      { title: "Аудан ұйымдары — Шаңырақ" },
      { name: "description", content: "Аудандағы немесе қаладағы мәдениет үйлері, клубтар және орталықтар." },
      { property: "og:title", content: "Аудан ұйымдары — Шаңырақ" },
      { property: "og:description", content: "Аудандағы немесе қаладағы мәдениет үйлері, клубтар және орталықтар." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegionPage,
});

function RegionPage() {
  const { regionId } = Route.useParams();
  const [type, setType] = useState<OrganizationType | "all">("all");
  const regions = useQuery({ queryKey: ["public-regions"], queryFn: () => listPublicRegions() });
  const orgs = useQuery({ queryKey: ["public-organizations"], queryFn: () => listPublicOrganizations() });
  const region = regions.data?.find((item) => item.id === regionId);
  const inRegion = (orgs.data ?? []).filter((org) => org.region_id === regionId);
  const visible = inRegion.filter((org) => type === "all" || org.organization_type === type);

  return (
    <PublicShell>
      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 md:py-7">
        <Link to="/orgs" className="mb-2 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary"><ArrowLeft className="size-4" /> Барлық аудандар</Link>
        <h1 className="text-xl font-bold sm:text-2xl">{region?.name ?? "Аудан"}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{inRegion.length} мәдениет ұйымы</p>

        <div className="-mx-3 mt-3 flex gap-1.5 overflow-x-auto px-3 pb-1 scrollbar-none">
          {(["all", ...ORGANIZATION_TYPES] as const).map((value) => (
            <button key={value} type="button" onClick={() => setType(value)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold", type === value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
              {value === "all" ? "Барлығы" : ORGANIZATION_TYPE_LABELS[value]}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.isLoading ? (
            [0, 1].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-muted" />)
          ) : visible.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed bg-card p-8 text-center">
              <Building2 className="mx-auto mb-2 size-7 text-primary" />
              <p className="font-semibold">Ұйымдар әзірге қосылмаған</p>
              <p className="mt-1 text-sm text-muted-foreground">Орталық әкімшілік ұйымдарды кейін қосады</p>
            </div>
          ) : (
            visible.map((org) => (
              <Link key={org.id} to="/orgs/$organizationId" params={{ organizationId: org.id }} className="overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="h-40 bg-secondary">
                  {org.cover_url ? <img src={org.cover_url} alt={org.name} className="size-full object-cover" loading="lazy" /> : <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground"><Building2 className="size-8" /><span className="text-xs">Сурет жоқ</span></div>}
                </div>
                <div className="space-y-1.5 p-3.5">
                  {org.organization_type ? <p className="text-[11px] font-semibold text-primary">{ORGANIZATION_TYPE_LABELS[org.organization_type]}</p> : null}
                  <h2 className="text-[15px] font-bold leading-snug">{org.name}</h2>
                  <Meta icon={MapPin} value={org.settlement ?? org.locality} />
                  <Meta icon={UserRound} value={org.director_name} />
                  <Meta icon={Users} value={org.staff_count != null ? `${org.staff_count} қызметкер` : null} />
                  <div className="flex gap-3 pt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{org.events_count}</span>
                    <span className="flex items-center gap-1"><Images className="size-3.5" />{org.media_count}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </PublicShell>
  );
}

function Meta({ icon: Icon, value }: { icon: typeof MapPin; value: string | null | undefined }) {
  return (
    <p className={cn("flex items-center gap-1.5 text-xs", value ? "text-foreground/80" : "text-muted-foreground/70")}>
      <Icon className="size-3.5 shrink-0" />
      <span className="min-w-0 break-words">{value ?? "Көрсетілмеген"}</span>
    </p>
  );
}
