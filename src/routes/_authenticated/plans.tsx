import { createFileRoute } from "@tanstack/react-router";
import { formatDate } from "@/lib/format-date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Eye } from "lucide-react";

import { useQuickAction } from "@/lib/quick-action";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { PlanFileDialog } from "@/components/plans/PlanFileDialog";
import {
  createPlan,
  deletePlan,
  formatFileSize,
  getPlanFileUrl,
  listPlans,
  updatePlan,
  validatePlanFile,
  PLAN_FILE_EXTENSIONS,
  PLAN_FILE_TYPES,
  type PlanInput,
} from "@/lib/plans";
import type { Plan, PlanType } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "Жоспарлар — Шаңырақ" },
      { name: "description", content: "Ұйымдардың жылдық және айлық жұмыс жоспарлары." },
      { property: "og:title", content: "Жоспарлар — Шаңырақ" },
      { property: "og:description", content: "Ұйымдардың жылдық және айлық жұмыс жоспарлары." },
    ],
  }),
  component: PlansPage,
});

const MONTHS = [
  "Қаңтар",
  "Ақпан",
  "Наурыз",
  "Сәуір",
  "Мамыр",
  "Маусым",
  "Шілде",
  "Тамыз",
  "Қыркүйек",
  "Қазан",
  "Қараша",
  "Желтоқсан",
];

function PlansPage() {
  const { isSuperAdmin, isOrganizationAdmin, profile, loading } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [previewing, setPreviewing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const { pending, consume } = useQuickAction();

  useEffect(() => {
    if (consume("plan")) setCreating(true);
  }, [pending, consume]);

  const download = async (plan: Plan) => {
    try {
      const url = await getPlanFileUrl(plan.file_path!, plan.file_name ?? "plan");
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Файлды жүктеу сәтсіз аяқталды");
    }
  };

  const { data: plans, isLoading } = useQuery({ queryKey: ["plans"], queryFn: listPlans });

  const remove = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Жоспар өшірілді");
    },
    onError: () => toast.error("Өшіру сәтсіз аяқталды"),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Жүктелуде...</p>;

  const canManage = isOrganizationAdmin && !!profile?.organization_id;

  return (
    <div>
      <PageHeader
        title="Жоспарлар"
        description={
          isSuperAdmin
            ? "Барлық ұйымдардың жұмыс жоспарлары"
            : "Ұйымыңыздың жылдық және айлық жоспарлары"
        }
      />

      {canManage && creating ? (
        <PlanDialog
          organizationId={profile!.organization_id!}
          open
          onOpenChange={(v) => !v && setCreating(false)}
        />
      ) : null}

      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Жүктелуде...</p>
        ) : (plans?.length ?? 0) === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Жоспарлар әзірге жоқ.
          </p>
        ) : (
          plans!.map((plan) => (
            <Card key={plan.id}>
              <CardContent className="space-y-2 px-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug">{plan.title}</p>
                  <Badge variant={plan.plan_type === "annual" ? "default" : "secondary"}>
                    {plan.plan_type === "annual" ? "Жылдық" : "Айлық"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {plan.period_year}
                  {plan.period_month ? ` · ${MONTHS[plan.period_month - 1]}` : ""}
                  {isSuperAdmin && plan.organizations?.name ? ` · ${plan.organizations.name}` : ""}
                </p>
                <p className="break-all text-xs text-muted-foreground">
                  {plan.file_path
                    ? `${plan.file_name} · ${formatFileSize(plan.file_size)}`
                    : "Файл жоқ"}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {plan.file_path ? (
                    <>
                      <Button
                        variant="outline"
                        className="min-h-11 flex-1"
                        onClick={() => setPreviewing(plan)}
                      >
                        <Eye /> Қарау
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11 flex-1"
                        onClick={() => void download(plan)}
                      >
                        <Download /> Жүктеу
                      </Button>
                    </>
                  ) : null}
                  {canManage ? (
                    <>
                      <Button
                        variant="outline"
                        className="min-h-11 flex-1"
                        onClick={() => setEditing(plan)}
                      >
                        Өңдеу
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11 flex-1"
                        onClick={() => remove.mutate(plan.id)}
                        disabled={remove.isPending}
                      >
                        Өшіру
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="hidden rounded-lg border border-border bg-card lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Атауы</TableHead>
              {isSuperAdmin ? <TableHead>Ұйым</TableHead> : null}
              <TableHead>Түрі</TableHead>
              <TableHead>Кезең</TableHead>
              <TableHead>Құжат</TableHead>
              <TableHead className="text-right">Әрекеттер</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Жүктелуде...
                </TableCell>
              </TableRow>
            ) : (plans?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Жоспарлар әзірге жоқ.
                </TableCell>
              </TableRow>
            ) : (
              plans!.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <p className="font-medium">{plan.title}</p>
                    {plan.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{plan.description}</p>
                    ) : null}
                  </TableCell>
                  {isSuperAdmin ? (
                    <TableCell className="text-muted-foreground">
                      {plan.organizations?.name ?? "—"}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Badge variant={plan.plan_type === "annual" ? "default" : "secondary"}>
                      {plan.plan_type === "annual" ? "Жылдық" : "Айлық"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {plan.period_year}
                    {plan.period_month ? ` · ${MONTHS[plan.period_month - 1]}` : ""}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {plan.file_path ? (
                      <div className="space-y-0.5">
                        <p className="break-all font-medium text-foreground">{plan.file_name}</p>
                        <p>
                          {plan.file_mime_type ?? "—"} · {formatFileSize(plan.file_size)}
                        </p>
                        <p>
                          {plan.uploaded_at
                            ? formatDate(plan.uploaded_at)
                            : "—"}
                        </p>
                      </div>
                    ) : (
                      "Файл жоқ"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {plan.file_path ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setPreviewing(plan)}>
                            <Eye /> Қарау
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void download(plan)}>
                            <Download /> Жүктеу
                          </Button>
                        </>
                      ) : null}
                      {canManage ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setEditing(plan)}>
                            Өңдеу
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => remove.mutate(plan.id)}
                            disabled={remove.isPending}
                          >
                            Өшіру
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editing ? (
        <PlanDialog
          organizationId={editing.organization_id}
          plan={editing}
          open
          onOpenChange={(v) => !v && setEditing(null)}
        />
      ) : null}

      <PlanFileDialog plan={previewing} onClose={() => setPreviewing(null)} />
    </div>
  );
}

function PlanDialog({
  organizationId,
  plan,
  open,
  onOpenChange,
}: {
  organizationId: string;
  plan?: Plan;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [form, setForm] = useState({
    title: plan?.title ?? "",
    description: plan?.description ?? "",
    plan_type: (plan?.plan_type ?? "annual") as PlanType,
    period_year: String(plan?.period_year ?? new Date().getFullYear()),
    period_month: plan?.period_month ? String(plan.period_month) : "1",
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const hasExistingFile = !!plan?.file_path;
  const fileRequired = !hasExistingFile;

  const pickFile = (selected: File | null) => {
    setFileError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    try {
      validatePlanFile(selected);
      setFile(selected);
    } catch (error) {
      setFile(null);
      setFileError((error as Error).message);
    }
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload: PlanInput = {
        organization_id: organizationId,
        title: form.title,
        description: form.description || null,
        plan_type: form.plan_type,
        period_year: Number(form.period_year),
        period_month: form.plan_type === "monthly" ? Number(form.period_month) : null,
      };
      if (plan) return updatePlan(plan.id, payload, file);
      if (!file) throw new Error("Жоспар файлын жүктеңіз.");
      return createPlan(payload, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setFile(null);
      setOpen(false);
      toast.success(plan ? "Жоспар жаңартылды" : "Жоспар құрылды");
    },
    onError: (error: Error) => toast.error(error.message || "Сақтау сәтсіз аяқталды"),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {plan || open !== undefined ? null : (
        <DialogTrigger asChild>
          <Button>Жоспар қосу</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? "Жоспарды өңдеу" : "Жаңа жоспар"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="plan-title">Атауы</Label>
            <Input
              id="plan-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-description">Сипаттамасы</Label>
            <Textarea
              id="plan-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Түрі</Label>
              <Select
                value={form.plan_type}
                onValueChange={(v) => setForm({ ...form, plan_type: v as PlanType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Жылдық</SelectItem>
                  <SelectItem value="monthly">Айлық</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-year">Жыл</Label>
              <Input
                id="plan-year"
                type="number"
                min={2000}
                max={2100}
                value={form.period_year}
                onChange={(e) => setForm({ ...form, period_year: e.target.value })}
                required
              />
            </div>
            {form.plan_type === "monthly" ? (
              <div className="space-y-2">
                <Label>Ай</Label>
                <Select
                  value={form.period_month}
                  onValueChange={(v) => setForm({ ...form, period_month: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-file">
              Жоспар құжаты {fileRequired ? "" : "(ауыстыру үшін таңдаңыз)"}
            </Label>
            <Input
              id="plan-file"
              type="file"
              accept={[...PLAN_FILE_TYPES, ...PLAN_FILE_EXTENSIONS].join(",")}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              PDF, DOC, DOCX, XLS, XLSX — 20 МБ дейін.
            </p>
            {hasExistingFile && !file ? (
              <p className="text-xs text-muted-foreground">
                Ағымдағы файл: {plan!.file_name} · {formatFileSize(plan!.file_size)}
              </p>
            ) : null}
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
                <span className="break-all">
                  {file.name} · {formatFileSize(file.size)}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => pickFile(null)}>
                  Алып тастау
                </Button>
              </div>
            ) : null}
            {fileError ? <p className="text-xs text-destructive">{fileError}</p> : null}
            {fileRequired && !file ? (
              <p className="text-xs text-destructive">Жоспар файлын жүктеңіз.</p>
            ) : null}
          </div>

          {mutation.isPending ? (
            <p className="text-xs text-muted-foreground">Файл жүктелуде...</p>
          ) : null}
          <Button
            type="submit"
            className="sticky bottom-0 min-h-12 w-full"
            disabled={mutation.isPending || (fileRequired && !file)}
          >
            Сақтау
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
