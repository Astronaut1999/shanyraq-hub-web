import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, CalendarDays, Download, Eye, Link2, Mail, MapPin, Phone, UserRound, Users } from "lucide-react";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/regions";
import { useMemo, useState } from "react";

import { PublicShell } from "@/components/layout/PublicShell";
import { PostEngagement } from "@/components/feed/PostEngagement";
import { PlanFileDialog } from "@/components/plans/PlanFileDialog";
import { supabase } from "@/integrations/supabase/client";
import { planDisplay, type PlanExecutionStatus, type PlanMaterialStatus } from "@/lib/plan-material";
import { formatDate } from "@/lib/format-date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { getPublicMediaUrl, getPublicOrganization, listPublicEvents, listPublicFeed } from "@/lib/feed.functions";
import { formatFileSize, getPlanFileUrl, listPlans } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { getOwnMediaUrlById } from "@/lib/media";

export const Route = createFileRoute("/orgs/$organizationId")({
  head: () => ({
    meta: [
      { title: "Ұйым профилі — Шаңырақ" },
      { name: "description", content: "Мәдениет ұйымының жарияланымдары, іс-шаралары және байланыс ақпараты." },
      { property: "og:title", content: "Ұйым профилі — Шаңырақ" },
      { property: "og:description", content: "Мәдениет ұйымының жарияланымдары, іс-шаралары және байланыс ақпараты." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrganizationProfilePage,
});

const MONTHS = ["Қаңтар", "Ақпан", "Наурыз", "Сәуір", "Мамыр", "Маусым", "Шілде", "Тамыз", "Қыркүйек", "Қазан", "Қараша", "Желтоқсан"];

/** Demo records are stored with a "— ДЕМО" suffix; show it as a badge instead. */
function splitDemoName(name: string): { name: string; demo: boolean } {
  const match = /\s*[—-]\s*ДЕМО\s*$/u.exec(name);
  return match ? { name: name.slice(0, match.index), demo: true } : { name, demo: false };
}

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 140;
  return (
    <p className="mt-2 text-sm leading-6 text-foreground/90">
      {long && !expanded ? `${text.slice(0, 140).trim()}… ` : text}
      {long ? (
        <button type="button" className="font-semibold text-primary" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Жасыру" : "Толығырақ"}
        </button>
      ) : null}
    </p>
  );
}

function OrganizationProfilePage() {
  const { organizationId } = Route.useParams();
  const { profile, isSuperAdmin, isOrganizationAdmin } = useAuth();
  const [previewPlan, setPreviewPlan] = useState<Plan | null>(null);
  const [planType, setPlanType] = useState<"monthly" | "annual">("monthly");
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");

  const canViewPrivate = isSuperAdmin || (isOrganizationAdmin && profile?.organization_id === organizationId);
  const canManage = canViewPrivate;

  const orgQuery = useQuery({ queryKey: ["public-organization", organizationId], queryFn: () => getPublicOrganization({ data: { organizationId } }) });
  const eventsQuery = useQuery({ queryKey: ["organization-public-events", organizationId], queryFn: () => listPublicEvents({ data: { page: 0, pageSize: 18, organizationId } }) });
  const postsQuery = useQuery({ queryKey: ["organization-public-posts", organizationId], queryFn: () => listPublicFeed({ data: { organizationId } }) });
  const plansQuery = useQuery({ queryKey: ["organization-private-plans", organizationId], queryFn: listPlans, enabled: canViewPrivate });

  const planItemsQuery = useQuery({
    queryKey: ["plan-items", "org", organizationId],
    enabled: canViewPrivate,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_items")
        .select("id, plan_id, title, planned_date, material_status, status")
        .eq("organization_id", organizationId)
        .neq("status", "cancelled")
        .order("planned_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PlanActivity[];
    },
  });

  const plans = useMemo(
    () => (plansQuery.data ?? []).filter((plan) => plan.organization_id === organizationId),
    [plansQuery.data, organizationId],
  );
  const years = [...new Set(plans.map((plan) => plan.period_year))].sort((a, b) => b - a);
  const visiblePlans = plans.filter(
    (plan) =>
      plan.plan_type === planType &&
      (year === "all" || plan.period_year === Number(year)) &&
      (planType === "annual" || month === "all" || plan.period_month === Number(month)),
  );

  const org = orgQuery.data;
  if (orgQuery.isLoading) {
    return <PublicShell><div className="p-10 text-center text-sm text-muted-foreground">Жүктелуде...</div></PublicShell>;
  }
  if (!org) {
    return (
      <PublicShell>
        <div className="p-10 text-center">
          <h1 className="text-xl font-semibold">Ұйым табылмады</h1>
          <Button asChild variant="outline" className="mt-4"><Link to="/orgs">Ұйымдар тізімі</Link></Button>
        </div>
      </PublicShell>
    );
  }

  const display = splitDemoName(org.name);

  return (
    <PublicShell>
      <main className="mx-auto max-w-4xl md:px-4 md:py-6">
        <section className="overflow-hidden bg-card md:rounded-lg md:border">
          <div className="h-[160px] bg-muted sm:h-[220px] md:h-[260px]">
            {org.cover_url ? (
              <img src={org.cover_url} alt={`${display.name} мұқабасы`} className="size-full object-cover" width={1440} height={520} />
            ) : null}
          </div>
          <div className="px-4 pb-4 sm:px-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <Avatar className="-mt-8 size-16 shrink-0 border-4 border-card sm:-mt-10 sm:size-[72px]">
                <AvatarImage src={org.avatar_url ?? undefined} alt={display.name} />
                <AvatarFallback className="text-lg">{display.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              {canManage ? (
                <Button asChild variant="outline" size="sm" className="min-h-10">
                  <Link to={isSuperAdmin ? "/organizations" : "/dashboard"}>Ұйымды басқару</Link>
                </Button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-bold leading-tight sm:text-2xl">{display.name}</h1>
              {display.demo ? <Badge variant="secondary">Демо</Badge> : null}
            </div>
            {org.organization_type ? <p className="mt-1 text-sm font-semibold text-primary">{ORGANIZATION_TYPE_LABELS[org.organization_type]}</p> : null}
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span className="min-w-0 break-words">{[org.settlement ?? org.locality, org.region_name].filter(Boolean).join(" · ") || "Павлодар облысы"}</span>
            </p>
          </div>
        </section>

        <Tabs defaultValue="about" className="mt-3">
          <div className="border-y bg-card md:rounded-lg md:border">
            <TabsList className="grid h-12 w-full grid-cols-4 rounded-none bg-transparent p-0">
              <TabsTrigger value="about" className="min-h-11 px-1 text-[11px] sm:text-sm">Туралы</TabsTrigger>
              <TabsTrigger value="plans" className="min-h-11 px-1 text-[11px] sm:text-sm">Жоспарлар</TabsTrigger>
              <TabsTrigger value="events" className="min-h-11 px-1 text-[11px] sm:text-sm">Іс-шаралар</TabsTrigger>
              <TabsTrigger value="media" className="min-h-11 px-1 text-[11px] sm:text-sm">Фото және видео</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="about" className="px-4 py-3 md:px-0">
            <div className="divide-y rounded-2xl border bg-card px-4">
              <InfoRow icon={UserRound} label="Басшысы" value={org.director_name} />
              <InfoRow icon={Users} label="Қызметкерлер" value={org.staff_count != null ? String(org.staff_count) : null} />
              <InfoRow icon={MapPin} label="Мекенжай" value={org.address} />
              <InfoRow icon={Phone} label="Телефон" value={org.phone} href={org.phone ? `tel:${org.phone}` : undefined} />
              <InfoRow icon={Mail} label="Пошта" value={org.email} href={org.email ? `mailto:${org.email}` : undefined} />
              {org.source_url ? <InfoRow icon={Link2} label="Дереккөз" value="Сілтемені ашу" href={org.source_url} /> : null}
            </div>
            {org.description ? <div className="mt-3 rounded-2xl border bg-card p-4"><h2 className="text-sm font-semibold">Сипаттама</h2><ExpandableText text={org.description} /></div> : null}
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <BadgeCheck className={org.verified_at ? "size-4 text-success" : "size-4"} />
              {org.verified_at ? `Тексерілген: ${formatDate(org.verified_at)}` : "Ақпарат әлі тексерілмеген"}
            </p>
          </TabsContent>

          <TabsContent value="media" className="grid gap-3 px-4 py-3 sm:grid-cols-2 md:px-0">
            {(postsQuery.data ?? []).length === 0 ? <Empty text="Фото мен видео әзірге жоқ." /> : (postsQuery.data ?? []).map((post) => <PublicMediaCard key={post.id} post={post} withEngagement />)}
          </TabsContent>

          <TabsContent value="events" className="space-y-3 px-4 py-3 md:px-0">
            {(eventsQuery.data?.items ?? []).length === 0 ? (
              <Empty text="Мақұлданған іс-шаралар әзірге жоқ." />
            ) : (
              (eventsQuery.data?.items ?? []).map((event) => <PublicEventCard key={event.id} event={event} withEngagement />)
            )}
          </TabsContent>

          <TabsContent value="plans" className="px-4 py-3 md:px-0">
            {!canViewPrivate ? <Empty text="Жоспарлар ұйым әкімшісі мен орталық әкімшілікке ғана қолжетімді." /> : <>
              <div className="flex flex-wrap gap-2">
                <Button variant={planType === "monthly" ? "default" : "outline"} className="min-h-10" onClick={() => setPlanType("monthly")}>Айлық</Button>
                <Button variant={planType === "annual" ? "default" : "outline"} className="min-h-10" onClick={() => setPlanType("annual")}>Жылдық</Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Жыл" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Барлық жыл</SelectItem>
                    {years.map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
                {planType === "monthly" ? (
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Ай" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Барлық ай</SelectItem>
                      {MONTHS.map((label, index) => <SelectItem key={label} value={String(index + 1)}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
              <PlanList plans={visiblePlans} activities={planItemsQuery.data ?? []} onPreview={setPreviewPlan} />
            </>}
          </TabsContent>
        </Tabs>

        <PlanFileDialog plan={previewPlan} onClose={() => setPreviewPlan(null)} />
      </main>
    </PublicShell>
  );
}

function PublicMediaCard({ post, withEngagement = false }: { post: Awaited<ReturnType<typeof listPublicFeed>>[number]; withEngagement?: boolean }) {
  const title = splitDemoName(post.title);
  return <article className="overflow-hidden rounded-lg border bg-card shadow-soft"><div className="aspect-[4/3] bg-muted">{post.url ? post.media_kind === "photo" ? <img src={post.thumbnail_url ?? post.url} alt={title.name} className="size-full object-cover" loading="lazy" width={960} height={720} /> : <VideoPlayer src={post.url} poster={post.thumbnail_url} title={title.name} className="aspect-[4/3]" refreshUrl={() => getPublicMediaUrl({ data: { mediaId: post.id } }).catch(() => getOwnMediaUrlById(post.id))} /> : null}</div><div className="p-4"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{title.name}</h2>{title.demo ? <Badge variant="secondary">Демо</Badge> : null}</div>{post.description ? <p className="mt-1 text-sm text-muted-foreground">{post.description}</p> : null}</div>{withEngagement ? <PostEngagement publicationType="media_item" publicationId={post.id} /> : null}</article>;
}

function PublicEventCard({ event, withEngagement = false }: { event: Awaited<ReturnType<typeof listPublicEvents>>["items"][number]; withEngagement?: boolean }) {
  const title = splitDemoName(event.title);
  return <article className="overflow-hidden rounded-lg border bg-card shadow-soft sm:flex sm:flex-wrap"><div className="aspect-[4/3] bg-muted sm:aspect-auto sm:w-56">{event.media[0]?.url ? <img src={event.media[0].thumbnail_url ?? event.media[0].url ?? undefined} alt={title.name} className="size-full object-cover" loading="lazy" width={640} height={480} /> : null}</div><div className="min-w-0 flex-1 p-4"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{title.name}</h2>{title.demo ? <Badge variant="secondary">Демо</Badge> : null}</div><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4 shrink-0" />{event.event_date}{event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ""}</p>{event.location ? <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0" /><span className="min-w-0 break-words">{event.location}</span></p> : null}{event.description ? <p className="mt-2 text-sm leading-6">{event.description}</p> : null}</div>{withEngagement ? <div className="w-full"><PostEngagement publicationType="event" publicationId={event.id} /></div> : null}</article>;
}

function Empty({ text }: { text: string }) {
  return <p className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</p>;
}

interface PlanActivity { id: string; plan_id: string | null; title: string; planned_date: string; material_status: PlanMaterialStatus; status: PlanExecutionStatus }

function PlanList({ plans, activities, onPreview }: { plans: Plan[]; activities: PlanActivity[]; onPreview: (plan: Plan) => void }) {
  const download = async (plan: Plan) => {
    if (!plan.file_path) return;
    const url = await getPlanFileUrl(plan.file_path, plan.file_name ?? "plan");
    window.open(url, "_blank", "noopener");
  };
  if (plans.length === 0) return <div className="mt-3"><Empty text="Бұл кезеңге жоспарлар жоқ." /></div>;
  return (
    <div className="mt-3 grid gap-3">
      {plans.map((plan) => {
        const title = splitDemoName(plan.title);
        return (
          <article key={plan.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-semibold">{title.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.period_year}{plan.period_month ? ` · ${MONTHS[plan.period_month - 1]}` : ""} · {plan.uploaded_at ? formatDate(plan.uploaded_at) : "Файл жүктелмеген"}
                </p>
                <p className="mt-1 break-all text-xs text-muted-foreground">{plan.file_name ?? "Файл жоқ"} · {formatFileSize(plan.file_size)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {title.demo ? <Badge variant="secondary">Демо</Badge> : null}
                <Badge variant="outline">Жеке материал</Badge>
              </div>
            </div>
            {plan.file_path ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" className="min-h-11" onClick={() => onPreview(plan)}><Eye /> Қарау</Button>
                <Button variant="outline" className="min-h-11" onClick={() => void download(plan)}><Download /> Жүктеу</Button>
              </div>
            ) : null}
            {activities.some((a) => a.plan_id === plan.id) ? (
              <ul className="mt-3 divide-y border-t">
                {activities.filter((a) => a.plan_id === plan.id).map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatDate(a.planned_date)}
                      </p>
                      <p className="text-sm font-medium leading-snug">«{a.title}»</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${planDisplay(a).className}`}>
                      {planDisplay(a).label}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, href }: { icon: typeof MapPin; label: string; value: string | null; href?: string | undefined }) {
  return (
    <div className="flex min-h-12 items-center gap-3 py-2 text-sm">
      <Icon className="size-4 shrink-0 text-primary" />
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      {value ? (
        href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="min-w-0 break-words font-medium text-primary">{value}</a> : <span className="min-w-0 break-words font-medium">{value}</span>
      ) : (
        <span className="text-muted-foreground/70">Көрсетілмеген</span>
      )}
    </div>
  );
}
