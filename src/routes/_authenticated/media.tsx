import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { formatDate } from "@/lib/format-date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Eye, FileText, Image as ImageIcon, Video } from "lucide-react";

import { MediaPreviewDialog } from "@/components/media/MediaPreviewDialog";
import { MediaUploader } from "@/components/media/MediaUploader";
import { ArchiveItemMenu } from "@/components/media/ArchiveItemMenu";
import { PlanFileDialog } from "@/components/plans/PlanFileDialog";

import { useAuth } from "@/lib/auth-context";
import { deleteMedia, listMedia, unpublishMedia } from "@/lib/media";
import { deletePlan, formatFileSize, getPlanFileUrl, listPlans } from "@/lib/plans";
import { usePreferences } from "@/lib/preferences";
import { useQuickAction } from "@/lib/quick-action";
import type { MediaItemWithUrl, Plan } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/media")({
  head: () => ({
    meta: [
      { title: "Архив — Шаңырақ" },
      { name: "description", content: "Ұйымдардың фото, видео және құжаттар архиві." },
      { property: "og:title", content: "Архив — Шаңырақ" },
      { property: "og:description", content: "Ұйымдардың фото, видео және құжаттар архиві." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { planItem?: string; status?: string } => ({
    ...(typeof search["planItem"] === "string" ? { planItem: search["planItem"] } : {}),
    ...(typeof search["status"] === "string" ? { status: search["status"] } : {}),
  }),
  component: MediaPage,
});

function StatusBadge({ item }: { item: { status: string } }) {
  if (item.status === "approved") return <Badge>Мақұлданды</Badge>;
  if (item.status === "rejected") return <Badge variant="destructive">Қайтарылды</Badge>;
  return <Badge variant="secondary">Күтуде</Badge>;
}

type ArchiveType = "all" | "photo" | "video" | "document";

function displayMediaTitle(item: MediaItemWithUrl) {
  const looksGenerated = /^[0-9a-f]{8}-[0-9a-f-]{27,}\.[a-z0-9]+$/i.test(item.title.trim());
  if (!looksGenerated) return item.title;
  return item.events?.title ?? (item.media_kind === "video" ? "Видео материал" : "Фото материал");
}

function formatArchiveDate(value: string | null) {
  if (!value) return "Күні көрсетілмеген";
  return formatDate(value);
}

function MediaPage() {
  const { isSuperAdmin, isOrganizationAdmin, profile, loading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [eventFilter, setEventFilter] = useState<string>("all");
  const search = Route.useSearch();
  const [statusFilter, setStatusFilter] = useState<string>(search.status ?? "all");
  const [typeFilter, setTypeFilter] = useState<ArchiveType>("all");
  const [preview, setPreview] = useState<MediaItemWithUrl | null>(null);
  const [planPreview, setPlanPreview] = useState<Plan | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { lowBandwidth } = usePreferences();
  const { pending, consume } = useQuickAction();

  useEffect(() => {
    if (consume("media")) setUploadOpen(true);
  }, [pending, consume]);

  useEffect(() => {
    if (search.planItem && search.status !== "rejected") setUploadOpen(true);
  }, [search.planItem, search.status]);

  const scopedOrganizationId = isSuperAdmin ? null : (profile?.organization_id ?? null);
  const { data: items, isLoading } = useQuery<MediaItemWithUrl[]>({
    queryKey: ["media", scopedOrganizationId ?? "all"],
    queryFn: () => listMedia(scopedOrganizationId),
  });
  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["plans", "archive"],
    queryFn: listPlans,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["media"] });
    queryClient.invalidateQueries({ queryKey: ["pending-media"] });
    queryClient.invalidateQueries({ queryKey: ["pending-events"] });
    queryClient.invalidateQueries({ queryKey: ["public-feed"] });
  };

  const remove = useMutation({
    mutationFn: (item: MediaItemWithUrl) => deleteMedia(item),
    onSuccess: (_d, item) => {
      queryClient.setQueriesData<MediaItemWithUrl[]>({ queryKey: ["media"] }, (old) =>
        old?.filter((i) => i.id !== item.id),
      );
      refreshAll();
      toast.success("Материал өшірілді.");
    },
    onError: () => toast.error("Өшіру сәтсіз аяқталды"),
  });

  const unpublish = useMutation({
    mutationFn: (item: MediaItemWithUrl) => unpublishMedia(item),
    onSuccess: (_d, item) => {
      queryClient.setQueriesData<MediaItemWithUrl[]>({ queryKey: ["media"] }, (old) =>
        old?.map((i) => (i.id === item.id ? { ...i, unpublished_at: new Date().toISOString() } : i)),
      );
      refreshAll();
      toast.success("Жарияланым ашық қолжетімділіктен алынды.");
    },
    onError: () => toast.error("Әрекет сәтсіз аяқталды"),
  });

  const removePlan = useMutation({
    mutationFn: (plan: Plan) => deletePlan(plan.id),
    onSuccess: (_d, plan) => {
      queryClient.setQueryData<Plan[]>(["plans", "archive"], (old) => old?.filter((p) => p.id !== plan.id));
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Материал өшірілді.");
    },
    onError: () => toast.error("Өшіру сәтсіз аяқталды"),
  });

  const busy = remove.isPending || unpublish.isPending || removePlan.isPending;

  if (loading) return <p className="text-sm text-muted-foreground">Жүктелуде...</p>;

  const canUpload = isOrganizationAdmin && !!profile?.organization_id;

  const allItems = items ?? [];
  const eventOptions = [
    ...new Map(
      allItems
        .filter((item) => item.event_id && item.events?.title)
        .map((item) => [item.event_id!, item.events!.title]),
    ).entries(),
  ];
  const filtered = allItems.filter((item) => {
    const eventOk =
      eventFilter === "all" ||
      (eventFilter === "none" ? !item.event_id : item.event_id === eventFilter);
    const statusOk = statusFilter === "all" || item.status === statusFilter;
    const typeOk = typeFilter === "all" || item.media_kind === typeFilter;
    return eventOk && statusOk && typeOk;
  });
  const visiblePlans = typeFilter === "all" || typeFilter === "document" ? (plans ?? []) : [];
  const showDocuments = statusFilter === "all";

  const downloadPlan = async (plan: Plan) => {
    if (!plan.file_path) return;
    try {
      const url = await getPlanFileUrl(plan.file_path, plan.file_name ?? "plan");
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Файлды жүктеу сәтсіз аяқталды");
    }
  };

  return (
    <div>
      <PageHeader
        title="Архив"
        description={
          isSuperAdmin
            ? "Барлық ұйымдардың фото, видео және құжаттары"
            : "Ұйымның жіберілген және сақталған материалдары"
        }
      />

      {canUpload ? (
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Фото / видео жүктеу</DialogTitle>
            </DialogHeader>
            <MediaUploader
              organizationId={profile!.organization_id!}
              uploaderId={profile?.id ?? null}
              initialPlanItemId={search.planItem ?? null}
              onUploaded={() => {
                queryClient.invalidateQueries({ queryKey: ["media"] });
                queryClient.invalidateQueries({ queryKey: ["plan-items"] });
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
                setUploadOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}

      <div className="mb-4 space-y-3">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-secondary p-1" aria-label="Материал түрі">
          {([
            ["all", "Барлығы"],
            ["photo", "Фото"],
            ["video", "Видео"],
            ["document", "Құжаттар"],
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={typeFilter === value ? "default" : "ghost"}
              size="sm"
              className="min-w-0 px-1 text-[11px] sm:text-sm"
              onClick={() => setTypeFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1" aria-label="Модерация күйі">
          {([
            ["all", "Барлығы"],
            ["pending", "Күтуде"],
            ["approved", "Мақұлданды"],
            ["rejected", "Қайтарылды"],
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={statusFilter === value ? "secondary" : "ghost"}
              size="sm"
              className="min-w-0 px-1 text-[11px] sm:text-sm"
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {typeFilter !== "document" ? <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-0 max-w-full space-y-1">
          <Label htmlFor="media-event-filter" className="text-xs text-muted-foreground">
            Іс-шара
          </Label>
          <select
            id="media-event-filter"
            className="h-9 w-full max-w-full rounded-md border border-input bg-background px-3 text-sm"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="all">Барлығы</option>
            <option value="none">Іс-шараға байланыссыз</option>
            {eventOptions.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </div>
      </div> : null}

      {isLoading || plansLoading ? (
        <p className="text-sm text-muted-foreground">Жүктелуде...</p>
      ) : filtered.length === 0 && (!showDocuments || visiblePlans.length === 0) ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Архивте сәйкес материал жоқ.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden pt-0">
              <button
                type="button"
                className="block aspect-video w-full cursor-pointer bg-muted text-left"
                onClick={() => setPreview(item)}
                aria-label={`${item.title} — қарау`}
              >
                {item.media_kind === "photo" && (item.thumbnail_url ?? (!lowBandwidth && item.url)) ? (
                  <img
                    src={item.thumbnail_url ?? item.url!}
                    alt={item.title}
                    className="size-full object-contain"
                    loading="lazy"
                  />
                ) : item.media_kind === "video" && item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="size-full object-contain"
                    loading="lazy"
                  />
                ) : item.url && !lowBandwidth && item.media_kind === "video" ? (
                  <video src={item.url} preload="none" className="size-full object-contain" />
                ) : (
                  <span className="flex size-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
                    Алдын ала қарау қолжетімсіз. Ашу үшін «Қарау» түймесін басыңыз.
                  </span>
                )}
              </button>
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{displayMediaTitle(item)}</p>
                  <StatusBadge item={item} />
                </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {item.media_kind === "video" ? <Video className="size-3.5" /> : <ImageIcon className="size-3.5" />}
                    {item.media_kind === "video" ? "Видео" : "Фото"} · {formatArchiveDate(item.created_at)}
                  </p>
                {item.events?.title ? (
                  <p className="text-xs text-muted-foreground">
                    Іс-шара: <span className="font-medium">{item.events.title}</span>
                  </p>
                ) : null}
                {item.description ? (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                ) : null}
                {isSuperAdmin ? (
                  <p className="text-xs text-muted-foreground">{item.organizations?.name}</p>
                ) : null}
                {item.status === "rejected" && item.rejection_reason ? (
                  <p className="text-xs text-destructive">
                    Қабылданбау себебі: {item.rejection_reason}
                  </p>
                ) : null}
                {item.unpublished_at ? (
                  <p className="text-xs text-muted-foreground">Жарияланымнан алынған</p>
                ) : null}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="min-h-11 flex-1" onClick={() => setPreview(item)}>
                    <Eye /> Қарау
                  </Button>
                  {(() => {
                    const ownOrg = canUpload && item.organization_id === profile?.organization_id;
                    const manage = isSuperAdmin || ownOrg;
                    if (!manage) return null;
                    // Event-linked media follow the event's own edit rules (draft/rejected only).
                    const eventEditable =
                      !item.event_id || ["draft", "rejected"].includes(item.events?.moderation_status ?? "");
                    const notApproved = item.status !== "approved";
                    const canDelete = notApproved && (isSuperAdmin || eventEditable);
                    const canUnpublish = item.status === "approved" && !item.unpublished_at;
                    return (
                      <ArchiveItemMenu
                        busy={busy}
                        onView={() => setPreview(item)}
                        onEdit={
                          item.status === "rejected" && item.event_id
                            ? () => void navigate({ to: "/events" })
                            : undefined
                        }
                        onDelete={canDelete ? () => remove.mutate(item) : undefined}
                        onUnpublish={canUnpublish ? () => unpublish.mutate(item) : undefined}
                        onPermanentDelete={
                          isSuperAdmin && item.status === "approved" ? () => remove.mutate(item) : undefined
                        }
                      />
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
          {showDocuments ? visiblePlans.map((plan) => (
            <Card key={`plan-${plan.id}`} className="overflow-hidden pt-0">
              <div className="flex aspect-video items-center justify-center bg-secondary">
                <FileText className="size-12 text-primary" />
              </div>
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug">{plan.title}</p>
                  <Badge variant="secondary">Құжат</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {plan.file_name ?? "Жоспар құжаты"} · {formatFileSize(plan.file_size)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {plan.plan_type === "annual" ? "Жылдық жоспар" : "Айлық жоспар"} · {formatArchiveDate(plan.uploaded_at ?? plan.created_at)}
                </p>
                {isSuperAdmin && plan.organizations?.name ? <p className="text-xs text-muted-foreground">{plan.organizations.name}</p> : null}
                <div className="flex items-center gap-2 pt-1">
                  {plan.file_path ? <>
                    <Button variant="outline" size="sm" className="min-h-11 flex-1" onClick={() => setPlanPreview(plan)}>
                      <Eye /> Қарау
                    </Button>
                    <Button variant="outline" size="sm" className="min-h-11 flex-1" onClick={() => void downloadPlan(plan)}>
                      <Download /> Жүктеу
                    </Button>
                  </> : null}
                  {isSuperAdmin || (canUpload && plan.organization_id === profile?.organization_id) ? (
                    <ArchiveItemMenu
                      busy={busy}
                      onView={() => (plan.file_path ? setPlanPreview(plan) : undefined)}
                      onDelete={() => removePlan.mutate(plan)}
                    />
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )) : null}
        </div>
      )}

      <MediaPreviewDialog item={preview} onClose={() => setPreview(null)} />
      <PlanFileDialog plan={planPreview} onClose={() => setPlanPreview(null)} />
    </div>
  );
}
