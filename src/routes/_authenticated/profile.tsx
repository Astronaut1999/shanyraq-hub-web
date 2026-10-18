import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Building2, CalendarDays, ChevronRight, ClipboardList, FileText, Image, LayoutDashboard, ListChecks, LogOut, Settings, UserRoundPen } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Профиль — Шаңырақ" },
      { name: "description", content: "Пайдаланушы профилі және рөлі." },
      { property: "og:title", content: "Профиль — Шаңырақ" },
      { property: "og:description", content: "Пайдаланушы профилі және рөлі." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, role, organization, isSuperAdmin, isOrganizationAdmin, signOut } = useAuth();

  return (
    <div>
      <PageHeader title="Профиль" description="Есептік жазба және қолжетімді бөлімдер" />
      <Card>
        <CardContent className="space-y-3 py-6 text-sm">
          <Row label="Аты-жөні" value={profile?.full_name ?? "—"} />
          <Row label="Пошта" value={profile?.email ?? "—"} />
          <Row
            label="Рөлі"
            value={role === "SUPER_ADMIN" ? "Орталық әкімшілік" : role === "ORGANIZATION_ADMIN" ? "Ұйым әкімшісі" : "Пайдаланушы"}
          />
          {organization ? <Row label="Ұйым" value={organization.name} /> : null}
        </CardContent>
      </Card>
      {isSuperAdmin || isOrganizationAdmin ? (
        <>
          <h2 className="mb-2 mt-5 text-sm font-semibold">Мазмұн</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {organization ? (
              <ProfileLink
                to="/orgs/$organizationId"
                params={{ organizationId: organization.id }}
                label="Жарияланымдар"
                icon={FileText}
              />
            ) : null}
            <ToolLink to="/media" label="Архив" icon={Image} />
            <ToolLink to="/plans" label="Жоспарлар" icon={ClipboardList} />
            <ToolLink to="/events" label="Іс-шаралар" icon={CalendarDays} />
            {organization ? <ToolLink to="/organizations" label="Профильді өңдеу" icon={UserRoundPen} /> : null}
          </div>

          <h2 className="mb-2 mt-5 text-sm font-semibold">Басқару</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToolLink to="/dashboard" label="Басқару панелі" icon={LayoutDashboard} />
            {isSuperAdmin ? <ToolLink to="/organizations" label="Ұйымдарды басқару" icon={Building2} /> : null}
            {isSuperAdmin ? <ToolLink to="/moderation" label="Модерация" icon={LayoutDashboard} /> : null}
            <ToolLink to="/plan-items" label="Жоспар тармақтары" icon={ListChecks} />
            <ToolLink to="/notifications" label="Хабарламалар" icon={ListChecks} />
            {isSuperAdmin ? <ToolLink to="/plan-execution" label="Жоспарлардың орындалуы" icon={BarChart3} /> : null}
            <ToolLink to="/analytics" label="Аналитика" icon={BarChart3} />
          </div>
        </>
      ) : null}
      <h2 className="mb-2 mt-5 text-sm font-semibold">Баптаулар</h2>
      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="flex min-h-11 items-center gap-3 text-sm"><Settings className="size-4 text-muted-foreground" /><span>Қолданба тілі: Қазақша</span></div>
          <Button variant="outline" className="min-h-11 w-full justify-start" onClick={() => void signOut()}><LogOut className="size-4" /> Шығу</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ToolLink({ to, label, icon: Icon }: { to: "/dashboard" | "/organizations" | "/events" | "/media" | "/plans" | "/plan-items" | "/analytics" | "/moderation" | "/notifications" | "/plan-execution"; label: string; icon: typeof Settings }) {
  return <Button asChild variant="outline" className="min-h-12 justify-start"><Link to={to}><Icon className="size-4" /><span className="min-w-0 flex-1 text-left">{label}</span><ChevronRight className="size-4 text-muted-foreground" /></Link></Button>;
}

function ProfileLink({ to, params, label, icon: Icon }: { to: "/orgs/$organizationId"; params: { organizationId: string }; label: string; icon: typeof Settings }) {
  return <Button asChild variant="outline" className="min-h-12 justify-start"><Link to={to} params={params}><Icon className="size-4" /><span className="min-w-0 flex-1 text-left">{label}</span><ChevronRight className="size-4 text-muted-foreground" /></Link></Button>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium text-foreground">{value}</span>
    </div>
  );
}
