import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { getAnalytics, type AnalyticsResult } from "@/lib/analytics.functions";
import { listOrganizations } from "@/lib/organizations";
import { MONTH_NAMES } from "@/lib/plan-items";
import { COMPLETION_FORMULA, exportAnalyticsPdf, exportAnalyticsXlsx } from "@/lib/report-export";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Аналитика — Шаңырақ" },
      { name: "description", content: "Жоспарлардың орындалуы бойынша көрсеткіштер." },
      { property: "og:title", content: "Аналитика — Шаңырақ" },
      { property: "og:description", content: "Жоспарлардың орындалуы бойынша көрсеткіштер." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

const ALL = "__all__";
const YEARS = [0, 1, 2].map((offset) => new Date().getFullYear() - 1 + offset);

function rateText(rate: number | null): string {
  return rate === null ? "—" : `${rate}%`;
}

function AnalyticsPage() {
  const { isSuperAdmin, isOrganizationAdmin, loading } = useAuth();
  const fetchAnalytics = useServerFn(getAnalytics);

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<string>(ALL);
  const [organizationId, setOrganizationId] = useState<string>(ALL);
  const [planType, setPlanType] = useState<"all" | "annual" | "monthly">("all");
  const [includeDemo, setIncludeDemo] = useState(false);

  const organizations = useQuery({
    queryKey: ["organizations"],
    queryFn: listOrganizations,
    enabled: isSuperAdmin,
  });

  const filters = {
    year,
    month: month === ALL ? null : Number(month),
    organizationId: organizationId === ALL ? null : organizationId,
    planType,
    includeDemo,
  };

  const analytics = useQuery({
    queryKey: ["analytics", filters],
    enabled: isSuperAdmin || isOrganizationAdmin,
    queryFn: () => fetchAnalytics({ data: filters }) as Promise<AnalyticsResult>,
  });

  if (loading) return <p className="text-sm text-muted-foreground">Жүктелуде...</p>;

  if (!isSuperAdmin && !isOrganizationAdmin) {
    return (
      <div>
        <PageHeader title="Аналитика" description="Жоспарлардың орындалуы" />
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Операциялық аналитика тек ұйым әкімшілері мен орталық әкімшілікке қолжетімді.
        </div>
      </div>
    );
  }

  const result = analytics.data;

  const exportFile = (kind: "xlsx" | "pdf") => {
    if (!result) return;
    try {
      if (kind === "xlsx") exportAnalyticsXlsx(result);
      else exportAnalyticsPdf(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Есепті жасау сәтсіз аяқталды");
    }
  };

  return (
    <div>
      <PageHeader
        title="Аналитика"
        description="Жоспарлардың орындалуы, мерзімдер және құжат тапсыру"
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Жыл</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ай</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Жыл бойы</SelectItem>
                {MONTH_NAMES.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isSuperAdmin ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Ұйым</Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Барлық ұйымдар</SelectItem>
                  {(organizations.data ?? []).map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Жоспар түрі</Label>
            <Select value={planType} onValueChange={(v) => setPlanType(v as typeof planType)}>
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Барлығы</SelectItem>
                <SelectItem value="annual">Жылдық</SelectItem>
                <SelectItem value="monthly">Айлық</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
            <Switch id="demo-toggle" checked={includeDemo} onCheckedChange={setIncludeDemo} />
            <Label htmlFor="demo-toggle" className="text-sm">
              Демонстрациялық деректерді қосу
            </Label>
            <Badge variant={includeDemo ? "secondary" : "outline"}>
              {includeDemo ? "Демо қосылған" : "Демо қосылмаған"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {analytics.isLoading ? (
        <p className="text-sm text-muted-foreground">Есептелуде...</p>
      ) : analytics.isError ? (
        <div className="space-y-2 rounded-lg border border-destructive/40 p-6 text-sm">
          <p className="text-destructive">Деректерді жүктеу мүмкін болмады.</p>
          <Button variant="outline" onClick={() => void analytics.refetch()}>
            Қайталау
          </Button>
        </div>
      ) : !result ? null : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => exportFile("xlsx")}>
              <Download /> Excel (.xlsx)
            </Button>
            <Button variant="outline" className="min-h-11" onClick={() => exportFile("pdf")}>
              <FileText /> PDF
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Жоспарланған тармақтар" value={result.totals.plannedTotal} to="/plan-items" />
            <Metric label="Орындалуы расталған" value={result.totals.completed} to="/plan-items" />
            <Metric label="Тексеруді күтуде" value={result.totals.awaitingReview} to="/moderation" />
            <Metric
              label="Мерзімі өткен (есеп жіберілмеген)"
              value={result.totals.overdueNoSubmission}
              to="/plan-items"
            />
            <Metric label="Тоқтатылған" value={result.totals.cancelled} to="/plan-items" />
            <Metric label="Жоспардан тыс іс-шаралар" value={result.totals.unplannedEvents} to="/events" />
            <Metric label="Орындалу пайызы" value={rateText(result.totals.completionRate)} />
            <Metric
              label="Мерзімі өтіп, тексеруде тұрғандар"
              value={result.totals.awaitingReviewOverdue}
              to="/moderation"
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Орындалу пайызы қалай есептеледі</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-4 text-xs text-muted-foreground">
              <p>{COMPLETION_FORMULA}</p>
              <p>
                Есеп жоспарлы күн бойынша жасалады. Нақты орындалған күн жеке бағанда көрсетіледі.
                Қайталанатын тармақтар жиынтықтан шығарылды: {result.totals.duplicatesExcluded}.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Жоспар құжатын тапсыру ({result.coverage.submitted} / {result.coverage.activeOrganizations})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 text-sm">
              <p className="text-xs text-muted-foreground">
                Файл саны емес, ұйым саны есептеледі. Тапсыру мерзімі бапталмағандықтан, жоқ
                құжаттар «тапсырылмаған» деп белгіленеді.
              </p>
              <div className="flex flex-wrap gap-2">
                {result.coverage.submittedOrganizations.map((o) => (
                  <Badge key={o.id} variant="secondary">
                    {o.name}
                  </Badge>
                ))}
                {result.coverage.missing.map((o) => (
                  <Badge key={o.id} variant="outline" className="border-destructive text-destructive">
                    {o.name} — тапсырылмаған
                  </Badge>
                ))}
                {result.coverage.activeOrganizations === 0 ? (
                  <p className="text-xs text-muted-foreground">Белсенді ұйым табылмады.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <section>
            <h2 className="mb-3 text-sm font-semibold">Ұйымдар бойынша салыстыру</h2>
            {result.organizations.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Таңдалған кезеңде деректер жоқ.
              </p>
            ) : (
              <>
                <div className="grid gap-3 md:hidden">
                  {result.organizations.map((org) => (
                    <Card key={org.organization_id}>
                      <CardContent className="space-y-1 px-4 text-sm">
                        <p className="font-medium leading-snug">{org.organization_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Жоспарланған: {org.planned} · Расталған: {org.completed} · Тексеруде:{" "}
                          {org.awaitingReview}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Мерзімі өткен: {org.overdueNoSubmission} · Тоқтатылған: {org.cancelled} ·
                          Жоспардан тыс: {org.unplannedEvents}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Badge>{rateText(org.completionRate)}</Badge>
                          <Badge variant={org.hasPlanDocument ? "secondary" : "outline"}>
                            {org.hasPlanDocument ? "Құжат тапсырылған" : "Құжат тапсырылмаған"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="hidden rounded-lg border bg-card md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ұйым</TableHead>
                        <TableHead>Жоспарланған</TableHead>
                        <TableHead>Расталған</TableHead>
                        <TableHead>Тексеруде</TableHead>
                        <TableHead>Мерзімі өткен</TableHead>
                        <TableHead>Тоқтатылған</TableHead>
                        <TableHead>Жоспардан тыс</TableHead>
                        <TableHead>Орындалу %</TableHead>
                        <TableHead>Құжат</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.organizations.map((org) => (
                        <TableRow key={org.organization_id}>
                          <TableCell className="font-medium">{org.organization_name}</TableCell>
                          <TableCell>{org.planned}</TableCell>
                          <TableCell>{org.completed}</TableCell>
                          <TableCell>{org.awaitingReview}</TableCell>
                          <TableCell>{org.overdueNoSubmission}</TableCell>
                          <TableCell>{org.cancelled}</TableCell>
                          <TableCell>{org.unplannedEvents}</TableCell>
                          <TableCell>{rateText(org.completionRate)}</TableCell>
                          <TableCell>
                            {org.hasPlanDocument ? "Тапсырылған" : "Тапсырылмаған"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  to,
}: {
  label: string;
  value: number | string;
  to?: "/plan-items" | "/moderation" | "/events";
}) {
  const content = (
    <Card className="h-full">
      <CardContent className="px-4 py-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
  return to ? (
    <Link to={to} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
