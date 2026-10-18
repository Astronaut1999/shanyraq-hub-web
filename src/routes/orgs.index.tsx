import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ChevronRight, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PublicShell } from "@/components/layout/PublicShell";
import { Input } from "@/components/ui/input";
import { listPublicOrganizations, listPublicRegions } from "@/lib/feed.functions";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/regions";

export const Route = createFileRoute("/orgs/")({
  head: () => ({
    meta: [
      { title: "Мәдениет ұйымдары — аудандар мен қалалар — Шаңырақ" },
      { name: "description", content: "Павлодар облысының 13 ауданы мен қаласындағы мәдениет ұйымдары." },
      { property: "og:title", content: "Мәдениет ұйымдары — Шаңырақ" },
      { property: "og:description", content: "Павлодар облысының 13 ауданы мен қаласындағы мәдениет ұйымдары." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegionsDirectory,
});

function RegionsDirectory() {
  const [search, setSearch] = useState("");
  const regions = useQuery({ queryKey: ["public-regions"], queryFn: () => listPublicRegions() });
  const orgs = useQuery({ queryKey: ["public-organizations"], queryFn: () => listPublicOrganizations() });
  const term = search.trim().toLocaleLowerCase("kk-KZ");
  const matches = (value?: string | null) => !!value && value.toLocaleLowerCase("kk-KZ").includes(term);

  const visibleRegions = useMemo(
    () => (regions.data ?? []).filter((region) => !term || matches(region.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regions.data, term],
  );
  const foundOrgs = useMemo(
    () => (term ? (orgs.data ?? []).filter((org) => [org.name, org.settlement, org.locality].some(matches)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgs.data, term],
  );

  return (
    <PublicShell>
      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 md:py-7">
        <header className="mb-4">
          <h1 className="text-xl font-bold sm:text-2xl">Ұйымдар</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Павлодар облысы · аудандар мен қалалар</p>
          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Аудан, қала немесе ұйымды іздеу" aria-label="Аудан, қала немесе ұйымды іздеу" className="h-11 rounded-xl bg-card pl-9 shadow-sm" />
          </label>
        </header>

        {foundOrgs.length > 0 ? (
          <section className="mb-5">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Ұйымдар</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {foundOrgs.map((org) => (
                <Link key={org.id} to="/orgs/$organizationId" params={{ organizationId: org.id }} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
                  <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {org.cover_url ? <img src={org.cover_url} alt="" className="size-full object-cover" loading="lazy" /> : <Building2 className="m-3 size-6 text-primary" />}
                  </div>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm leading-snug">{org.name}</strong>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[org.region_name, org.organization_type ? ORGANIZATION_TYPE_LABELS[org.organization_type] : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {term && foundOrgs.length === 0 && visibleRegions.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">Ештеңе табылмады</p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {regions.isLoading
            ? Array.from({ length: 6 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl bg-muted" />)
            : visibleRegions.map((region) => (
                <Link key={region.id} to="/orgs/region/$regionId" params={{ regionId: region.id }} className="group overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="h-24 overflow-hidden bg-secondary sm:h-32">
                    {region.image_url ? (
                      <img src={region.image_url} alt="" className="size-full object-cover transition group-hover:scale-[1.03]" loading="lazy" />
                    ) : (
                      <div className="ornament flex size-full items-center justify-center bg-gradient-primary"><MapPin className="size-8 text-primary-foreground/80" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <h2 className="text-sm font-bold leading-snug">{region.name}</h2>
                    <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{region.organizations_count} ұйым</span>
                      <ChevronRight className="size-4 text-primary" />
                    </p>
                  </div>
                </Link>
              ))}
        </div>
      </main>
    </PublicShell>
  );
}
