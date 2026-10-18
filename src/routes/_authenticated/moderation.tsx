import { createFileRoute } from "@tanstack/react-router";
import { formatDateTime, formatDate as fmtDay } from "@/lib/format-date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronRight, Download, ExternalLink, LoaderCircle, RotateCcw, ZoomIn } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { getMediaPreviewUrl, listPendingMedia, moderateMedia } from "@/lib/media";
import { listEventMedia, listPendingEvents, moderateEvent } from "@/lib/events";
import { listReviewPlanItems, reviewPlanItemCompletion } from "@/lib/plan-items";
import type { EventItem, MediaItemWithUrl, PlanItem } from "@/lib/types";
import { DetailRow, ImageLightbox, ReviewShell } from "@/components/moderation/ReviewShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventPreviewDialog } from "@/components/events/EventPreviewDialog";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/media/VideoPlayer";

export const Route = createFileRoute("/_authenticated/moderation")({
  head: () => ({
    meta: [
      { title: "Модерация — Шаңырақ" },
      { name: "description", content: "Медиа мазмұнын тексеру және бекіту." },
      { property: "og:title", content: "Модерация — Шаңырақ" },
      { property: "og:description", content: "Медиа мазмұнын тексеру және бекіту." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { media?: string; event?: string } => ({
    ...(typeof search["media"] === "string" ? { media: search["media"] } : {}),
    ...(typeof search["event"] === "string" ? { event: search["event"] } : {}),
  }),
  component: ModerationPage,
});

function ModerationPage() {
  const { isSuperAdmin, user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [previewItem, setPreviewItem] = useState<MediaItemWithUrl | null>(null);
  const [previewEvent, setPreviewEvent] = useState<EventItem | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["pending-media"],
    queryFn: listPendingMedia,
    enabled: isSuperAdmin,
  });

  const { data: pendingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["pending-events"],
    queryFn: listPendingEvents,
    enabled: isSuperAdmin,
  });

  const deepLink = Route.useSearch();
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  useEffect(() => {
    if (deepLinkHandled) return;
    if (deepLink.media && items) {
      const found = items.find((i) => i.id === deepLink.media);
      if (found) setPreviewItem(found);
      setDeepLinkHandled(true);
    } else if (deepLink.event && pendingEvents) {
      const found = pendingEvents.find((e) => e.id === deepLink.event);
      if (found) setPreviewEvent(found);
      setDeepLinkHandled(true);
    }
  }, [deepLink.media, deepLink.event, items, pendingEvents, deepLinkHandled]);

  const moderateEventMutation = useMutation({
    mutationFn: (params: { eventId: string; status: "approved" | "rejected"; reason?: string }) =>
      moderateEvent({
        eventId: params.eventId,
        status: params.status,
        reason: params.reason ?? null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pending-events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      setPreviewEvent(null);
      toast.success("Іс-шара пакеті бойынша шешім сақталды");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Шешімді сақтау сәтсіз аяқталды"),
  });

  const moderate = useMutation({
    mutationFn: (params: { id: string; status: "approved" | "rejected"; reason?: string }) =>
      moderateMedia({
        id: params.id,
        status: params.status,
        rejectionReason: params.reason ?? null,
        reviewerId: user?.id ?? null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pending-media"] });
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      setPreviewItem(null);
      toast.success("Модерация шешімі сәтті сақталды");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Шешімді сақтау сәтсіз аяқталды"),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Жүктелуде...</p>;

  if (!isSuperAdmin) {
    return (
      <div>
        <PageHeader title="Модерация" description="Мазмұнды тексеру және бекіту" />
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
          Модерацияны тек орталық әкімшілік жүргізеді.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Модерация"
        description="Күтудегі іс-шара пакеттерін және жеке медиа файлдарын тексеру"
      />

      <CompletionReviewSection />

      <section className="mb-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">Күтудегі іс-шаралар <Badge variant="secondary">{pendingEvents?.length ?? 0}</Badge></h2>
        {eventsLoading ? (
          <p className="text-sm text-muted-foreground">Жүктелуде...</p>
        ) : (pendingEvents?.length ?? 0) === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
            Күтудегі іс-шаралар жоқ.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pendingEvents!.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer rounded-2xl shadow-soft transition-shadow hover:shadow-md"
                onClick={() => setPreviewEvent(event)}
              >
                <CardContent className="space-y-1.5 px-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <p className="text-[15px] font-semibold leading-snug">{event.title}</p>
                    <EventStatusBadge status={event.moderation_status} />
                  </div>
                  <p className="truncate text-sm font-medium text-foreground/80">
                    {event.organizations?.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {fmtDay(event.event_date)}
                    {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ""} ·{" "}
                    {event.location ?? "—"} · {event.media_items?.length ?? 0} материал
                  </p>
                  {event.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{event.description}</p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    Жіберілген:{" "}
                    {event.submitted_at
                      ? formatDate(event.submitted_at)
                      : "—"}
                  </p>
                  <OpenAffordance />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">Жеке медиа файлдар <Badge variant="secondary">{items?.length ?? 0}</Badge></h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Жүктелуде...</p>
      ) : (items?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
          Күтудегі файлдар жоқ.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items!.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer overflow-hidden rounded-2xl pt-0 shadow-soft transition-shadow hover:shadow-md"
              onClick={() => setPreviewItem(item)}
            >
              <div className="aspect-video bg-foreground/5">
                {item.url ? (
                  item.media_kind === "photo" ? (
                    <img
                      src={item.url}
                      alt={item.title}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} className="size-full object-cover" loading="lazy" /> : <video src={item.url} muted playsInline preload="metadata" className="pointer-events-none size-full object-cover" />
                  )
                ) : null}
              </div>
              <CardContent className="space-y-1.5 px-4">
                <p className="text-[15px] font-semibold leading-snug">{item.title}</p>
                <p className="truncate text-sm font-medium text-foreground/80">{item.organizations?.name}</p>
                {item.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                ) : null}
                <OpenAffordance />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EventPreviewDialog
        event={previewEvent}
        canModerate={isSuperAdmin}
        onClose={() => setPreviewEvent(null)}
        moderating={moderateEventMutation.isPending}
        {...(() => {
          const list = pendingEvents ?? [];
          const index = previewEvent ? list.findIndex((e) => e.id === previewEvent.id) : -1;
          if (index < 0 || list.length < 2) return {};
          return {
            position: `${index + 1} / ${list.length}`,
            onPrev: index > 0 ? () => setPreviewEvent(list[index - 1]!) : undefined,
            onNext: index < list.length - 1 ? () => setPreviewEvent(list[index + 1]!) : undefined,
          };
        })()}
        onModerate={(status, reason) => {
          if (!previewEvent || !isSuperAdmin) return;
          moderateEventMutation.mutate(
            reason
              ? { eventId: previewEvent.id, status, reason }
              : { eventId: previewEvent.id, status },
          );
        }}
      />

      <MediaPreviewDialog
        item={previewItem}
        isSuperAdmin={isSuperAdmin}
        onClose={() => setPreviewItem(null)}
        onModerate={(status, reason) => {
          if (!previewItem || !isSuperAdmin) return;
          moderate.mutate(reason
            ? { id: previewItem.id, status, reason }
            : { id: previewItem.id, status });
        }}
        pending={moderate.isPending}
      />
    </div>
  );
}

function MediaPreviewDialog({
  item,
  isSuperAdmin,
  onClose,
  onModerate,
  pending,
}: {
  item: MediaItemWithUrl | null;
  isSuperAdmin: boolean;
  onClose: () => void;
  onModerate: (status: "approved" | "rejected", reason?: string) => void;
  pending: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<"loading" | "ready" | "error">("loading");
  const [previewError, setPreviewError] = useState("");
  const [zoomed, setZoomed] = useState(false);
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  const loadPreview = async () => {
    if (!item) return;
    setPreviewState("loading");
    setPreviewError("");
    setPreviewUrl(null);
    try {
      const url = await getMediaPreviewUrl(item.storage_path);
      setPreviewUrl(url);
      setPreviewState("ready");
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Файлды ашу мүмкін болмады.");
      setPreviewState("error");
    }
  };

  useEffect(() => {
    if (item) void loadPreview();
    else {
      setPreviewUrl(null);
      setReason("");
      setDecision(null);
      setZoomed(false);
    }
  }, [item?.id]);

  const showPreviewError = () => {
    setPreviewError("Сілтеменің мерзімі аяқталды немесе файлды көрсету мүмкін болмады.");
    setPreviewState("error");
  };

  const confirmDecision = () => {
    if (decision === "rejected" && !reason.trim()) return;
    if (decision) onModerate(decision, decision === "rejected" ? reason.trim().slice(0, 500) : undefined);
  };

  return (
    <>
      <ReviewShell
        open={!!item}
        onClose={onClose}
        title={item?.title}
        subtitle={item?.organizations?.name ?? "Ұйым көрсетілмеген"}
        badges={
          item ? (
            <>
              <Badge variant="secondary">Күтуде</Badge>
              <Badge variant="outline">{item.media_kind === "photo" ? "Фото" : "Бейне"}</Badge>
            </>
          ) : null
        }
        actions={
          <>
            <Button variant="outline" className="min-h-11 flex-1" onClick={onClose}>
              Жабу
            </Button>
            {isSuperAdmin ? (
              <>
                <Button
                  variant="outline"
                  className="min-h-11 flex-1 text-destructive"
                  onClick={() => setDecision("rejected")}
                  disabled={pending}
                >
                  Қабылдамау
                </Button>
                <Button className="min-h-11 flex-1" onClick={() => setDecision("approved")} disabled={pending}>
                  Бекіту
                </Button>
              </>
            ) : null}
          </>
        }
      >
        {item ? (
          <div className="space-y-4">
            <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-xl bg-muted">
              {previewState === "loading" ? (
                <div className="flex flex-col items-center gap-3 p-8 text-sm text-muted-foreground" role="status">
                  <LoaderCircle className="size-7 animate-spin" />
                  Медиа жүктелуде...
                </div>
              ) : previewState === "error" || !previewUrl ? (
                <div className="max-w-sm space-y-4 p-8 text-center">
                  <p className="font-medium">Медиа файлын көрсету мүмкін болмады</p>
                  <p className="text-sm text-muted-foreground">{previewError || "Файл табылмады."}</p>
                  <Button variant="outline" onClick={() => void loadPreview()}>
                    <RotateCcw />
                    Қайта жүктеу
                  </Button>
                </div>
              ) : item.media_kind === "photo" ? (
                <button type="button" className="relative block w-full" onClick={() => setZoomed(true)}>
                  <img
                    src={previewUrl}
                    alt={item.title}
                    className="mx-auto max-h-[60dvh] w-full object-contain"
                    onError={showPreviewError}
                  />
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-soft">
                    <ZoomIn className="size-3.5" /> Үлкейту
                  </span>
                </button>
              ) : (
                <VideoPlayer
                  src={previewUrl}
                  poster={item.thumbnail_url}
                  title={item.title}
                  className="max-h-[60dvh]"
                  refreshUrl={() => getMediaPreviewUrl(item.storage_path)}
                />
              )}
            </div>

            {item.description ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Сипаттамасы</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{item.description}</p>
              </div>
            ) : null}

            <dl className="divide-y divide-border rounded-xl border border-border bg-card px-3">
              <DetailRow label="Ұйым">{item.organizations?.name ?? "Көрсетілмеген"}</DetailRow>
              <DetailRow label="Жүктеген">{item.uploader?.full_name ?? item.uploader?.email ?? "Белгісіз"}</DetailRow>
              <DetailRow label="Жүктелген күні">{formatDate(item.created_at)}</DetailRow>
              <DetailRow label="Файл">
                {item.storage_path.split("/").pop()}
                <span className="block text-xs font-normal text-muted-foreground">
                  {item.mime_type} · {formatFileSize(item.file_size)}
                </span>
              </DetailRow>
              <DetailRow label="Күйі"><Badge variant="secondary">Күтуде</Badge></DetailRow>
            </dl>

            {previewUrl ? (
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink /> Файлды ашу</a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={previewUrl} download={item.storage_path.split("/").pop()}><Download /> Жүктеу</a>
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </ReviewShell>

      <ImageLightbox
        src={zoomed ? previewUrl : null}
        alt={item?.title ?? ""}
        onClose={() => setZoomed(false)}
      />

      <AlertDialog open={decision !== null} onOpenChange={(open) => !open && !pending && setDecision(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decision === "approved" ? "Медианы бекіту керек пе?" : "Медианы қабылдамау керек пе?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decision === "approved"
                ? "Бекітілген медиа ашық лентада көрінеді."
                : "Ұйым көретін себепті жазыңыз."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {decision === "rejected" ? (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Қабылдамау себебі</Label>
              <Textarea
                id="reject-reason"
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Себебін жазыңыз"
                disabled={pending}
              />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Бас тарту</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDecision}
              disabled={pending || (decision === "rejected" && !reason.trim())}
            >
              {pending ? <LoaderCircle className="animate-spin" /> : null}
              Растау
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDate(value: string): string {
  return formatDateTime(value);
}

/**
 * Plan activities whose completion evidence was submitted by an organization.
 * Confirming or returning is restricted to the central administrator by the
 * database function itself.
 */
function CompletionReviewSection() {
  const queryClient = useQueryClient();
  const [returning, setReturning] = useState<PlanItem | null>(null);
  const [openItem, setOpenItem] = useState<PlanItem | null>(null);
  const [reason, setReason] = useState("");

  const items = useQuery({ queryKey: ["completion-reviews"], queryFn: listReviewPlanItems });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["completion-reviews"] });
    void queryClient.invalidateQueries({ queryKey: ["plan-items"] });
    void queryClient.invalidateQueries({ queryKey: ["pending-counts"] });
    void queryClient.invalidateQueries({ queryKey: ["analytics"] });
  };

  const review = useMutation({
    mutationFn: (params: { id: string; approved: boolean; reason?: string }) =>
      reviewPlanItemCompletion(params),
    onSuccess: () => {
      refresh();
      setReturning(null);
      setOpenItem(null);
      setReason("");
      toast.success("Шешім сақталды");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Шешімді сақтау сәтсіз аяқталды"),
  });

  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        Орындалуды растау сұраныстары <Badge variant="secondary">{items.data?.length ?? 0}</Badge>
      </h2>
      {items.isLoading ? (
        <p className="text-sm text-muted-foreground">Жүктелуде...</p>
      ) : (items.data?.length ?? 0) === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
          Растауды күтіп тұрған жоспар тармақтары жоқ.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.data!.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer rounded-2xl shadow-soft transition-shadow hover:shadow-md"
              onClick={() => setOpenItem(item)}
            >
              <CardContent className="space-y-1.5 px-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <p className="text-[15px] font-semibold leading-snug">{item.title}</p>
                  {item.is_demo ? <Badge variant="outline">Демо</Badge> : null}
                </div>
                <p className="truncate text-sm font-medium text-foreground/80">
                  {item.organizations?.name ?? "—"}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  жоспарлы: {fmtDay(item.planned_date)} · нақты: {fmtDay(item.completed_on)}
                </p>
                {item.completion_report ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{item.completion_report}</p>
                ) : null}
                <OpenAffordance />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ReviewShell
        open={!!openItem}
        onClose={() => setOpenItem(null)}
        title={openItem?.title}
        subtitle={openItem?.organizations?.name ?? "—"}
        badges={
          openItem ? (
            <>
              <Badge variant="secondary">Тексеруде</Badge>
              {openItem.is_demo ? <Badge variant="outline">Демо</Badge> : null}
            </>
          ) : null
        }
        actions={
          <>
            <Button variant="outline" className="min-h-11 flex-1" onClick={() => setOpenItem(null)}>
              Жабу
            </Button>
            <Button
              variant="outline"
              className="min-h-11 flex-1 text-destructive"
              disabled={review.isPending}
              onClick={() => openItem && setReturning(openItem)}
            >
              Қайтару
            </Button>
            <Button
              className="min-h-11 flex-1"
              disabled={review.isPending}
              onClick={() => openItem && review.mutate({ id: openItem.id, approved: true })}
            >
              Бекіту
            </Button>
          </>
        }
      >
        {openItem ? <CompletionDetail item={openItem} /> : null}
      </ReviewShell>

      <Dialog open={!!returning} onOpenChange={(open) => !open && setReturning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Орындалуын қайтару</DialogTitle>
            <DialogDescription>{returning?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="return-reason">Қайтару себебі</Label>
            <Textarea id="return-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button
              className="min-h-11 w-full"
              disabled={review.isPending || reason.trim().length === 0}
              onClick={() => returning && review.mutate({ id: returning.id, approved: false, reason })}
            >
              Қайтару
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function CompletionDetail({ item }: { item: PlanItem }) {
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);
  const media = useQuery({
    queryKey: ["event-media", item.event_id],
    enabled: !!item.event_id,
    gcTime: 0,
    staleTime: 0,
    queryFn: () => listEventMedia(item.event_id!),
  });

  return (
    <div className="space-y-4">
      <dl className="divide-y divide-border rounded-xl border border-border bg-card px-3">
        <DetailRow label="Ұйым">{item.organizations?.name ?? "—"}</DetailRow>
        <DetailRow label="Жоспар">{item.plans?.title ?? "—"}</DetailRow>
        <DetailRow label="Жоспарлы күні">{fmtDay(item.planned_date)}</DetailRow>
        <DetailRow label="Нақты күні">{fmtDay(item.completed_on)}</DetailRow>
        <DetailRow label="Жауапты">{item.responsible ?? "—"}</DetailRow>
        <DetailRow label="Іс-шара">{item.events?.title ?? "—"}</DetailRow>
        <DetailRow label="Жіберілген">{item.submitted_at ? formatDate(item.submitted_at) : "—"}</DetailRow>
      </dl>
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Орындалу есебі</p>
        <p className="whitespace-pre-wrap break-words rounded-xl bg-muted p-3 text-sm leading-6">
          {item.completion_report ?? "—"}
        </p>
      </div>
      {item.notes ? (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Ескертпе</p>
          <p className="whitespace-pre-wrap break-words text-sm">{item.notes}</p>
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Дәлел материалдары ({media.data?.length ?? 0})</p>
        {media.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Жүктелуде...
          </p>
        ) : media.isError ? (
          <Button variant="outline" size="sm" onClick={() => void media.refetch()}>
            <RotateCcw /> Қайта жүктеу
          </Button>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(media.data ?? []).map((m) => (
              <figure key={m.id} className="overflow-hidden rounded-xl border bg-muted">
                {m.url ? (
                  m.media_kind === "photo" ? (
                    <button type="button" className="block w-full" onClick={() => setZoomed({ src: m.url!, alt: m.title })}>
                      <img src={m.url} alt={m.title} className="max-h-72 w-full object-contain" />
                    </button>
                  ) : (
                    <VideoPlayer src={m.url} poster={m.thumbnail_url} title={m.title} className="max-h-72" refreshUrl={() => getMediaPreviewUrl(m.storage_path)} />
                  )
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground">Файлды ашу мүмкін болмады.</div>
                )}
                <figcaption className="bg-card p-2 text-xs text-muted-foreground">{m.title}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
      <ImageLightbox src={zoomed?.src ?? null} alt={zoomed?.alt ?? ""} onClose={() => setZoomed(null)} />
    </div>
  );
}

function OpenAffordance() {
  return (
    <div className="flex items-center justify-between border-t border-border/70 pt-2 text-sm font-semibold text-primary">
      Толық қарау
      <ChevronRight className="size-4" />
    </div>
  );
}
