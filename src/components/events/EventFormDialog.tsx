import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import {
  createEvent,
  listEventMedia,
  submitEventForModeration,
  updateEvent,
  type EventInput,
} from "@/lib/events";
import { deleteMedia } from "@/lib/media";
import { usePreferences } from "@/lib/preferences";
import { saveOfflineDraft } from "@/lib/offline-drafts";
import { MediaUploader } from "@/components/media/MediaUploader";
import type { EventItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export function EventFormDialog({
  organizationId,
  event,
  open,
  onOpenChange,
}: {
  organizationId: string;
  event?: EventItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile } = useAuth();
  const { online } = usePreferences();
  const queryClient = useQueryClient();
  const [eventId, setEventId] = useState<string | null>(event?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [offlineDraftId, setOfflineDraftId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    event_date: event?.event_date ?? "",
    event_time: event?.event_time?.slice(0, 5) ?? "",
    location: event?.location ?? "",
  });

  const media = useQuery({
    queryKey: ["event-media", eventId],
    enabled: !!eventId,
    gcTime: 0,
    staleTime: 0,
    queryFn: () => listEventMedia(eventId!),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    void queryClient.invalidateQueries({ queryKey: ["media"] });
    void media.refetch();
  };

  const save = useMutation({
    mutationFn: async () => {
      // Offline: keep the text on the device so nothing typed in a village club is lost.
      if (!online) {
        const draft = saveOfflineDraft({
          ...(offlineDraftId ? { id: offlineDraftId } : {}),
          organization_id: organizationId,
          title: form.title,
          description: form.description,
          event_date: form.event_date,
          event_time: form.event_time,
          location: form.location,
          media_names: [],
        });
        setOfflineDraftId(draft.id);
        return null;
      }
      const payload: EventInput = {
        organization_id: organizationId,
        title: form.title.trim().slice(0, 200),
        description: form.description.trim() || null,
        event_date: form.event_date,
        event_time: form.event_time || null,
        location: form.location.trim() || null,
      };
      if (eventId) return updateEvent(eventId, payload);
      return createEvent(payload);
    },
    onSuccess: (saved) => {
      setDirty(false);
      if (!saved) {
        toast.success("Құрылғыда сақталған — байланыс қалпына келгенде жіберіңіз");
        return;
      }
      setEventId(saved.id);
      refresh();
      toast.success("Іс-шара жоба ретінде сақталды");
    },
    onError: (error: Error) => toast.error(error.message || "Сақтау сәтсіз аяқталды"),
  });

  const removeMedia = useMutation({
    mutationFn: (item: Parameters<typeof deleteMedia>[0]) => deleteMedia(item),
    onSuccess: () => {
      refresh();
      toast.success("Материал өшірілді");
    },
    onError: (error: Error) => toast.error(error.message || "Өшіру сәтсіз аяқталды"),
  });

  const submit = useMutation({
    mutationFn: () => submitEventForModeration(eventId!),
    onSuccess: () => {
      refresh();
      onOpenChange(false);
      toast.success("Іс-шара модерацияға жіберілді");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const mediaCount = media.data?.length ?? 0;
  const canSubmit = !!eventId && mediaCount > 0;

  const requestClose = (next: boolean) => {
    if (!next && dirty) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(next);
  };

  const update = (patch: Partial<typeof form>) => {
    setDirty(true);
    setForm({ ...form, ...patch });
  };

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Іс-шараны өңдеу" : "Жаңа іс-шара"}</DialogTitle>
        </DialogHeader>

        {event?.moderation_status === "rejected" && event.rejection_reason ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            Қабылданбау себебі: {event.rejection_reason}
          </p>
        ) : null}

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="event-title">Атауы</Label>
            <Input
              id="event-title"
              className="min-h-11"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-description">Сипаттамасы</Label>
            <Textarea
              id="event-description"
              rows={3}
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-date">Күні</Label>
              <Input
                id="event-date"
                type="date"
                className="min-h-11"
                value={form.event_date}
                onChange={(e) => update({ event_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">Басталу уақыты</Label>
              <Input
                id="event-time"
                type="time"
                className="min-h-11"
                value={form.event_time}
                onChange={(e) => update({ event_time: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-location">Өтетін орны</Label>
            <Input
              id="event-location"
              className="min-h-11"
              value={form.location}
              onChange={(e) => update({ location: e.target.value })}
            />
          </div>
          <Button type="submit" variant="outline" className="min-h-12 w-full" disabled={save.isPending}>
            Жоба ретінде сақтау
          </Button>
        </form>

        <div className="space-y-3 border-t pt-4">
          <Label>Фото / видео</Label>
          {eventId ? (
            <MediaUploader
              organizationId={organizationId}
              uploaderId={profile?.id ?? null}
              eventId={eventId}
              onUploaded={refresh}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Файл қосу үшін алдымен іс-шараны жоба ретінде сақтаңыз.
            </p>
          )}

          {mediaCount > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {media.data!.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-md border bg-muted">
                  {item.url ? (
                    item.media_kind === "photo" ? (
                      <img
                        src={item.url}
                        alt={item.title}
                        className="max-h-40 w-full object-contain"
                      />
                    ) : (
                      <video src={item.url} controls preload="metadata" className="max-h-40 w-full" />
                    )
                  ) : null}
                  <div className="flex items-center justify-between gap-2 bg-card p-2">
                    <span className="truncate text-xs text-muted-foreground">{item.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={removeMedia.isPending}
                      onClick={() => removeMedia.mutate(item)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 space-y-2 border-t bg-background pb-2 pt-4">
          <Button
            className="min-h-12 w-full"
            disabled={!canSubmit || submit.isPending}
            onClick={() => submit.mutate()}
          >
            Модерацияға жіберу
          </Button>
          {!canSubmit ? (
            <p className="text-xs text-muted-foreground">
              Модерацияға жіберу үшін кемінде бір фото немесе видео қосыңыз.
            </p>
          ) : null}
        </div>

        <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Сақталмаған өзгерістер бар</AlertDialogTitle>
              <AlertDialogDescription>
                Терезені жапсаңыз, енгізілген мәліметтер жоғалады. Жалғастырасыз ба?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Бас тарту</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmClose(false);
                  setDirty(false);
                  onOpenChange(false);
                }}
              >
                Жабу
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
