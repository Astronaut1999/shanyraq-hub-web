import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth-context";
import { countAdministrators, listOrganizations } from "@/lib/organizations";
import { getPendingCounts } from "@/lib/counts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Басқару панелі — Шаңырақ" },
      { name: "description", content: "Платформаның негізгі басқару панелі." },
      { property: "og:title", content: "Басқару панелі — Шаңырақ" },
      { property: "og:description", content: "Платформаның негізгі басқару панелі." },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  to,
}: {
  label: string;
  value: number | string;
  to?: "/organizations" | "/moderation" | "/plan-items" | "/media" | "/analytics";
}) {
  const card = (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
  return to ? (
    <Link to={to} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

function DashboardPage() {
  const { isSuperAdmin, isOrganizationAdmin, organization, profile, loading } = useAuth();

  const { data: organizations } = useQuery({
    queryKey: ["organizations"],
    queryFn: listOrganizations,
    enabled: isSuperAdmin,
  });
  const { data: adminCount } = useQuery({
    queryKey: ["administrators-count"],
    queryFn: countAdministrators,
    enabled: isSuperAdmin,
  });
  const { data: pending } = useQuery({
    queryKey: ["pending-counts"],
    queryFn: getPendingCounts,
    enabled: isSuperAdmin || isOrganizationAdmin,
  });

  if (loading) {
    return <p className="text-sm text-muted-foreground">Жүктелуде...</p>;
  }

  const breakdown = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Күтудегі әрекеттер: {pending?.total ?? 0}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 px-4 text-sm sm:grid-cols-3">
        <Link to="/moderation" className="rounded-md border p-3 hover:bg-muted">
          <p className="text-xs text-muted-foreground">Іс-шара пакеттері</p>
          <p className="text-xl font-semibold">{pending?.eventPackages ?? 0}</p>
        </Link>
        <Link to="/moderation" className="rounded-md border p-3 hover:bg-muted">
          <p className="text-xs text-muted-foreground">Жеке медиа файлдар</p>
          <p className="text-xl font-semibold">{pending?.standaloneMedia ?? 0}</p>
        </Link>
        <Link to="/moderation" className="rounded-md border p-3 hover:bg-muted">
          <p className="text-xs text-muted-foreground">Орындалуды растау сұраныстары</p>
          <p className="text-xl font-semibold">{pending?.completionReviews ?? 0}</p>
        </Link>
      </CardContent>
    </Card>
  );

  if (isSuperAdmin) {
    const total = organizations?.length ?? 0;
    const active = organizations?.filter((o) => o.status === "active").length ?? 0;
    return (
      <div className="space-y-4">
        <PageHeader title="Басқару панелі" description="Орталық әкімшілік — Шаңырақ" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Барлық ұйымдар" value={total} to="/organizations" />
          <StatCard label="Белсенді ұйымдар" value={active} to="/organizations" />
          <StatCard label="Әкімшілер" value={adminCount ?? 0} to="/organizations" />
          <StatCard label="Күтудегі әрекеттер" value={pending?.total ?? 0} to="/moderation" />
        </div>
        {breakdown}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Басқару панелі" description="Ұйым әкімшісінің панелі" />
      <Card>
        <CardHeader>
          <CardTitle>{organization?.name ?? "Ұйым тағайындалмаған"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Әкімші: </span>
            {profile?.full_name ?? profile?.email}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Мәртебесі:</span>
            <Badge variant={organization?.status === "active" ? "default" : "secondary"}>
              {organization?.status === "active" ? "Белсенді" : "Белсенді емес"}
            </Badge>
          </div>
        </CardContent>
      </Card>
      {isOrganizationAdmin ? breakdown : null}
    </div>
  );
}
