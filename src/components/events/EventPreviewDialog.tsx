import { useState } from "react";
import { formatDateTime as fmtDateTime, formatDate as fmtDay } from "@/lib/format-date";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LoaderCircle, RotateCcw } from "lucide-react";

import { listEventMedia } from "@/lib/events";
import { getMediaPreviewUrl } from "@/lib/media";
import type { EventItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DetailRow, ImageLightbox, ReviewShell } from "@/components/moderation/ReviewShell";
import { EventStatusBadge } from "./EventStatusBadge";
import { VideoPlayer } from "@/components/media/VideoPlayer";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return fmtDateTime(value);
}

export function EventPreviewDialog({
  event,
  canModerate,
  onClose,
  onModerate,
  moderating,
  onPrev,
  onNext,
  position,
}: {
  event: EventItem | null;
  canModerate: boolean;
  onClose: () => void;
  onModerate?: (status: "approved" | "rejected", reason?: string) => void;
  moderating?: boolean;
  onPrev?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
  position?: string;
}) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<"approved" | "rejected" | null>(null);
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);

  const media = useQuery({
    queryKey: ["event-media", event?.id],
    enabled: !!event,
    gcTime: 0,
    staleTime: 0,
    queryFn: () => listEventMedia(event!.id),
  });

  const close = () => {
    setReason("");
    setConfirm(null);
    onClose();
  };

  const showActions = canModerate && event?.moderation_status === "pending";
  const cover = media.data?.find((m) => m.media_kind === "photo" && m.url);

  return (
    <>
      <ReviewShell
        open={!!event}
        onClose={close}
        title={event?.title}
        subtitle={event?.organizations?.name ?? ""}
        badges={event ? <EventStatusBadge status={event.moderation_status} /> : null}
        actions={
          <>
            <Button variant="outline" className="min-h-11 flex-1" onClick={close}>
              Жабу
            </Button>
            {showActions ? (
              <>
                <Button
                  variant="outline"
                  className="min-h-11 flex-1 text-destructive"
                  disabled={moderating}
                  onClick={() => setConfirm("rejected")}
                >
                  Қабылдамау
                </Button>
                <Button className="min-h-11 flex-1" disabled={moderating} onClick={() => setConfirm("approved")}>
                  Бекіту
                </Button>
              </>
            ) : null}
          </>
        }
      >
        {event ? (
          <div className="space-y-4">
            {onPrev || onNext ? (
              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" disabled={!onPrev} onClick={() => onPrev?.()}>
                  <ChevronLeft /> Алдыңғы
                </Button>
                {position ? <span className="text-xs text-muted-foreground">{position}</span> : null}
                <Button variant="ghost" size="sm" disabled={!onNext} onClick={() => onNext?.()}>
                  Келесі <ChevronRight />
                </Button>
              </div>
            ) : null}

            {cover?.url ? (
              <button
                type="button"
                className="block w-full overflow-hidden rounded-xl bg-muted"
                onClick={() => setZoomed({ src: cover.url!, alt: cover.title })}
              >
                <img src={cover.url} alt={cover.title} className="max-h-[50dvh] w-full object-contain" />
              </button>
            ) : null}

            <dl className="divide-y divide-border rounded-xl border border-border bg-card px-3">
              <DetailRow label="Ұйым">{event.organizations?.name ?? "—"}</DetailRow>
              <DetailRow label="Өтетін күні">{fmtDay(event.event_date)}</DetailRow>
              <DetailRow label="Уақыты">{event.event_time ? event.event_time.slice(0, 5) : "—"}</DetailRow>
              <DetailRow label="Өтетін орны">{event.location ?? "—"}</DetailRow>
              <DetailRow label="Құрылған">{formatDateTime(event.created_at)}</DetailRow>
              <DetailRow label="Жіберілген">{formatDateTime(event.submitted_at)}</DetailRow>
              <DetailRow label="Күйі"><EventStatusBadge status={event.moderation_status} /></DetailRow>
            </dl>

            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Сипаттамасы</p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{event.description ?? "—"}</p>
            </div>

            {event.moderation_status === "rejected" && event.rejection_reason ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                Қабылданбау себебі: {event.rejection_reason}
              </p>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-semibold">Тіркелген материалдар ({media.data?.length ?? 0})</p>
              {media.isLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" /> Жүктелуде...
                </p>
              ) : media.isError ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">Материалдарды ашу мүмкін болмады.</p>
                  <Button variant="outline" size="sm" onClick={() => void media.refetch()}>
                    <RotateCcw /> Қайта жүктеу
                  </Button>
                </div>
              ) : (media.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Материалдар жоқ.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {media.data!.map((item) => (
                    <figure key={item.id} className="overflow-hidden rounded-xl border bg-muted">
                      {item.url ? (
                        item.media_kind === "photo" ? (
                          <button
                            type="button"
                            className="block w-full"
                            onClick={() => setZoomed({ src: item.url!, alt: item.title })}
                          >
                            <img src={item.url} alt={item.title} className="max-h-72 w-full object-contain" />
                          </button>
                        ) : (
                          <VideoPlayer src={item.url} poster={item.thumbnail_url} title={item.title} className="max-h-72" refreshUrl={() => getMediaPreviewUrl(item.storage_path)} />
                        )
                      ) : (
                        <div className="p-6 text-center text-xs text-muted-foreground">Файлды ашу мүмкін болмады.</div>
                      )}
                      <figcaption className="bg-card p-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{item.title}</span> · {item.mime_type} ·{" "}
                        {(item.file_size / (1024 * 1024)).toFixed(2)} МБ
                        {item.description ? (
                          <span className="mt-1 block whitespace-pre-wrap">{item.description}</span>
                        ) : null}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </ReviewShell>

      <ImageLightbox src={zoomed?.src ?? null} alt={zoomed?.alt ?? ""} onClose={() => setZoomed(null)} />

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "approved" ? "Іс-шараны бекіту" : "Іс-шараны қабылдамау"}</AlertDialogTitle>
            <AlertDialogDescription>Шешім іс-шара мен оның барлық материалына бірге қолданылады.</AlertDialogDescription>
          </AlertDialogHeader>
          {confirm === "rejected" ? (
            <div className="space-y-2">
              <Label htmlFor="event-reject-reason">Қабылданбау себебі</Label>
              <Textarea
                id="event-reject-reason"
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Себебін жазыңыз"
              />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Болдырмау</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirm === "rejected" && reason.trim().length === 0}
              onClick={() => {
                const decision = confirm;
                setConfirm(null);
                if (decision && onModerate) {
                  onModerate(decision, decision === "rejected" ? reason.trim() : undefined);
                }
              }}
            >
              Растау
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
