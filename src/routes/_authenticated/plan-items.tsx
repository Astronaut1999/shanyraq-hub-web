import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { listPlans } from "@/lib/plans";
import { listEvents } from "@/lib/events";
import { planDisplay } from "@/lib/plan-material";
import { formatDate } from "@/lib/format-date";
import {
  cancelPlanItem,
  createPlanItem,
  deletePlanItem,
  isOverdue,
  listPlanItems,
  planItemIsEditable,
  PLAN_ITEM_STATUS_LABELS,
  reopenPlanItem,
  submitPlanItemCompletion,
  updatePlanItem,
  type PlanItemInput,
} from "@/lib/plan-items";
import type { PlanItem, PlanItemStatus } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/plan-items")({
  head: () => ({
    meta: [
      { title: "Жоспар тармақтары — Шаңырақ" },
      { name: "description", content: "Жоспардағы іс-шаралардың орындалуын бақылау." },
      { property: "og:title", content: "Жоспар тармақтары — Шаңырақ" },
      { property: "og:description", content: "Жоспардағы іс-шаралардың орындалуын бақылау." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanItemsPage,
});

const NONE = "__none__";

function statusVariant(item: PlanItem): "default" | "secondary" | "destructive" | "outline" {
  if (item.status === "completed") return "default";
  if (item.status === "cancelled") return "destructive";
  if (item.status === "completion_submitted") return "secondary";
  if (item.status === "completion_returned") return "destructive";
  return "outline";
}

function PlanItemsPage() {
  const { isSuperAdmin, isOrganizationAdmin, profile, loading } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PlanItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState<PlanItem | null>(null);
  const [cancelling, setCancelling] = useState<PlanItem | null>(null);
  const [filter, setFilter] = useState<PlanItemStatus | "all" | "overdue">("all");

  const items = useQuery({ queryKey: ["plan-items"], queryFn: listPlanItems });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["plan-items"] });
    void queryClient.invalidateQueries({ queryKey: ["pending-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["analytics"] });
  };

  const remove = useMutation({
    mutationFn: (id: string) => deletePlanItem(id),
    onSuccess: () => {
      refresh();
      toast.success("Тармақ өшірілді");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reopen = useMutation({
    mutationFn: (id: string) => reopenPlanItem(id),
    onSuccess: () => {
      refresh();
      toast.success("Тармақ қайта жоспарланды");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = useMemo(() => {
    const list = items.data ?? [];
    if (filter === "all") return list;
    if (filter === "overdue") return list.filter(isOverdue);
    return list.filter((i) => i.status === filter);
  }, [items.data, filter]);

  if (loading) return <p className="text-sm text-muted-foreground">Жүктелуде...</p>;

  const canManage = isOrganizationAdmin && !!profile?.organization_id;

  return (
    <div>
      <PageHeader
        title="Жоспар тармақтары"
        description="Жоспардағы нақты іс-шаралар және олардың орындалуы"
        actions={
          canManage ? (
            <Button className="min-h-11" onClick={() => setCreating(true)}>
              Тармақ қосу
            </Button>
          ) : null
        }
      />

      <div className="mb-4 max-w-xs">
        <Label className="mb-1 block text-xs text-muted-foreground">Күйі бойынша</Label>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Барлығы</SelectItem>
            <SelectItem value="planned">Жоспарланған</SelectItem>
            <SelectItem value="overdue">Мерзімі өткен</SelectItem>
            <SelectItem value="completion_submitted">Тексеруге жіберілген</SelectItem>
            <SelectItem value="completion_returned">Түзетуге қайтарылды</SelectItem>
            <SelectItem value="completed">Орындалуы расталған</SelectItem>
            <SelectItem value="cancelled">Тоқтатылған</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.isLoading ? (
        <p className="text-sm text-muted-foreground">Жүктелуде...</p>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {canManage
            ? "Тармақтар жоқ. «Тармақ қосу» арқылы жоспардағы іс-шараны енгізіңіз."
            : "Тармақтар табылмады."}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-2 px-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug">{item.title}</p>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${planDisplay(item).className}`}>
                      {planDisplay(item).label}
                    </span>
                    {isOverdue(item) && planDisplay(item).key !== "overdue_no_material" ? <Badge variant="destructive">Мерзімі өткен</Badge> : null}
                    {item.is_demo ? <Badge variant="outline">Демо</Badge> : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Жоспарлы күні: {formatDate(item.planned_date)}
                  {item.completed_on ? ` · Нақты: ${formatDate(item.completed_on)}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.plans?.title ?? "Жоспар көрсетілмеген"}
                  {isSuperAdmin && item.organizations?.name ? ` · ${item.organizations.name}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Іс-шара: {item.events?.title ?? "байланыстырылмаған"}
                  {item.source_item_id ? " · Жылдық тармақтың көшірмесі" : ""}
                </p>
                {item.responsible ? (
                  <p className="text-xs text-muted-foreground">Жауапты: {item.responsible}</p>
                ) : null}
                {item.review_note ? (
                  <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    Қайтарылды: {item.review_note}
                  </p>
                ) : null}
                {item.cancel_reason ? (
                  <p className="text-xs text-muted-foreground">Тоқтату себебі: {item.cancel_reason}</p>
                ) : null}
                {item.completion_report ? (
                  <p className="text-xs text-muted-foreground">Есеп: {item.completion_report}</p>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  {canManage &&
                  (item.status === "planned" || item.status === "completion_returned") ? (
                    <Button
                      className="min-h-11 flex-1"
                      variant="outline"
                      onClick={() => setSubmitting(item)}
                    >
                      Орындалуын жіберу
                    </Button>
                  ) : null}
                  {canManage && planItemIsEditable(item) ? (
                    <Button
                      className="min-h-11 flex-1"
                      variant="outline"
                      onClick={() => setEditing(item)}
                    >
                      Өңдеу
                    </Button>
                  ) : null}
                  {(canManage || isSuperAdmin) &&
                  (item.status === "planned" || item.status === "completion_returned") ? (
                    <Button
                      className="min-h-11 flex-1"
                      variant="outline"
                      onClick={() => setCancelling(item)}
                    >
                      Тоқтату
                    </Button>
                  ) : null}
                  {(canManage || isSuperAdmin) && item.status === "cancelled" ? (
                    <Button
                      className="min-h-11 flex-1"
                      variant="outline"
                      onClick={() => reopen.mutate(item.id)}
                    >
                      Қайта жоспарлау
                    </Button>
                  ) : null}
                  {canManage && planItemIsEditable(item) ? (
                    <Button
                      className="min-h-11 flex-1"
                      variant="outline"
                      onClick={() => remove.mutate(item.id)}
                      disabled={remove.isPending}
                    >
                      Өшіру
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canManage && (creating || editing) ? (
        <PlanItemDialog
          organizationId={profile!.organization_id!}
          item={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={refresh}
        />
      ) : null}

      {submitting ? (
        <CompletionDialog item={submitting} onClose={() => setSubmitting(null)} onSaved={refresh} />
      ) : null}

      {cancelling ? (
        <CancelDialog item={cancelling} onClose={() => setCancelling(null)} onSaved={refresh} />
      ) : null}
    </div>
  );
}

function PlanItemDialog({
  organizationId,
  item,
  onClose,
  onSaved,
}: {
  organizationId: string;
  item: PlanItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const plans = useQuery({ queryKey: ["plans"], queryFn: listPlans });
  const events = useQuery({ queryKey: ["events"], queryFn: listEvents });
  const items = useQuery({ queryKey: ["plan-items"], queryFn: listPlanItems });

  const [form, setForm] = useState({
    title: item?.title ?? "",
    planned_date: item?.planned_date ?? new Date().toISOString().slice(0, 10),
    responsible: item?.responsible ?? "",
    notes: item?.notes ?? "",
    requires_media: item?.requires_media ?? true,
    plan_id: item?.plan_id ?? NONE,
    event_id: item?.event_id ?? NONE,
    source_item_id: item?.source_item_id ?? NONE,
  });

  const ownPlans = (plans.data ?? []).filter((p) => p.organization_id === organizationId);
  const ownEvents = (events.data ?? []).filter((e) => e.organization_id === organizationId);
  const annualItems = (items.data ?? []).filter(
    (i) =>
      i.organization_id === organizationId && i.plans?.plan_type === "annual" && i.id !== item?.id,
  );

  const save = useMutation({
    mutationFn: () => {
      const payload: PlanItemInput = {
        organization_id: organizationId,
        title: form.title,
        planned_date: form.planned_date,
        responsible: form.responsible || null,
        notes: form.notes || null,
        requires_media: form.requires_media,
        plan_id: form.plan_id === NONE ? null : form.plan_id,
        event_id: form.event_id === NONE ? null : form.event_id,
        source_item_id: form.source_item_id === NONE ? null : form.source_item_id,
      };
      return item ? updatePlanItem(item.id, payload) : createPlanItem(payload);
    },
    onSuccess: () => {
      onSaved();
      onClose();
      toast.success(item ? "Тармақ жаңартылды" : "Тармақ қосылды");
    },
    onError: (e: Error) => toast.error(e.message || "Сақтау сәтсіз аяқталды"),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Тармақты өңдеу" : "Жаңа жоспар тармағы"}</DialogTitle>
          <DialogDescription>
            Құжат жүктеу тармақтың орындалғанын білдірмейді — орындалуы бөлек расталады.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="item-title">Іс-шара атауы</Label>
            <Input
              id="item-title"
              className="min-h-11"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-date">Жоспарлы күні</Label>
            <Input
              id="item-date"
              type="date"
              className="min-h-11"
              value={form.planned_date}
              onChange={(e) => setForm({ ...form, planned_date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Жоспар құжаты</Label>
            <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Таңдаңыз" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Көрсетілмеген</SelectItem>
                {ownPlans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.plan_type === "annual" ? "Жылдық" : "Айлық"} · {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Байланысты іс-шара</Label>
            <Select value={form.event_id} onValueChange={(v) => setForm({ ...form, event_id: v })}>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Таңдаңыз" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Байланыстырылмаған</SelectItem>
                {ownEvents.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title} · {e.event_date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Жылдық жоспардағы сол тармақ</Label>
            <Select
              value={form.source_item_id}
              onValueChange={(v) => setForm({ ...form, source_item_id: v })}
            >
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Таңдаңыз" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Жоқ</SelectItem>
                {annualItems.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.title} · {formatDate(i.planned_date)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Көрсетілсе, жиынтық санақта тармақ екі рет есептелмейді.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-responsible">Жауапты адам</Label>
            <Input
              id="item-responsible"
              className="min-h-11"
              value={form.responsible}
              onChange={(e) => setForm({ ...form, responsible: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-notes">Ескертпе</Label>
            <Textarea
              id="item-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={form.requires_media}
              onChange={(e) => setForm({ ...form, requires_media: e.target.checked })}
            />
            Фото/видео материал міндетті
          </label>
          <Button type="submit" className="min-h-11 w-full" disabled={save.isPending}>
            Сақтау
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompletionDialog({
  item,
  onClose,
  onSaved,
}: {
  item: PlanItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [completedOn, setCompletedOn] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState("");

  const media = useQuery({
    queryKey: ["plan-item-evidence", item.event_id],
    enabled: !!item.event_id,
    queryFn: async () => {
      const { listEventMedia } = await import("@/lib/events");
      return listEventMedia(item.event_id!);
    },
  });

  const submit = useMutation({
    mutationFn: () => submitPlanItemCompletion({ id: item.id, completedOn, report }),
    onSuccess: () => {
      onSaved();
      onClose();
      toast.success("Орындалуы тексеруге жіберілді");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evidenceCount = media.data?.length ?? 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Орындалуын растауға жіберу</DialogTitle>
          <DialogDescription>{item.title}</DialogDescription>
        </DialogHeader>
        {!item.event_id ? (
          <p className="text-sm text-destructive">
            Алдымен тармаққа іс-шараны байланыстырыңыз — дәлел сол іс-шараның фото/видеосынан алынады.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Дәлел материалдары: {media.isLoading ? "тексерілуде..." : `${evidenceCount} файл`}.
              Кемінде бір фото немесе видео қажет. Материалдар автоматты түрде жарияланбайды.
            </p>
            <div className="space-y-2">
              <Label htmlFor="completed-on">Нақты орындалған күні</Label>
              <Input
                id="completed-on"
                type="date"
                className="min-h-11"
                value={completedOn}
                onChange={(e) => setCompletedOn(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="completion-report">Қысқаша есеп</Label>
              <Textarea
                id="completion-report"
                value={report}
                onChange={(e) => setReport(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="min-h-11 w-full"
              disabled={submit.isPending || evidenceCount === 0}
            >
              Тексеруге жіберу
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  item,
  onClose,
  onSaved,
}: {
  item: PlanItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const cancel = useMutation({
    mutationFn: () => cancelPlanItem(item.id, reason),
    onSuccess: () => {
      onSaved();
      onClose();
      toast.success("Тармақ тоқтатылды");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Тармақты тоқтату</DialogTitle>
          <DialogDescription>{item.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="cancel-reason">Себебі</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <Button
            className="min-h-11 w-full"
            disabled={cancel.isPending || reason.trim().length === 0}
            onClick={() => cancel.mutate()}
          >
            Тоқтату
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
