import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, RotateCcw } from "lucide-react";

import { getMediaPreviewUrl } from "@/lib/media";
import { formatDateTime } from "@/lib/format-date";
import type { MediaItemWithUrl } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VideoPlayer } from "@/components/media/VideoPlayer";

const STATUS_LABELS: Record<string, string> = {
  pending: "Күтуде",
  approved: "Мақұлданған",
  rejected: "Қабылданбаған",
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

export function MediaPreviewDialog({
  item,
  onClose,
}: {
  item: MediaItemWithUrl | null;
  onClose: () => void;
}) {
  const url = useQuery({
    queryKey: ["media-preview", item?.id],
    enabled: !!item,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    queryFn: () => getMediaPreviewUrl(item!.storage_path),
  });

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {item ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {item.title}
                <Badge
                  variant={
                    item.status === "approved"
                      ? "default"
                      : item.status === "rejected"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {STATUS_LABELS[item.status] ?? item.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {item.organizations?.name ?? ""}
                {item.events?.title ? ` · Іс-шара: ${item.events.title}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border bg-muted">
                {url.isLoading ? (
                  <p className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" /> Жүктелуде...
                  </p>
                ) : url.isError || !url.data ? (
                  <div className="space-y-3 p-10 text-center">
                    <p className="text-sm text-destructive">
                      Файлды ашу мүмкін болмады. Файл қоймада табылмады немесе сілтеме мерзімі
                      өткен.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => void url.refetch()}>
                      <RotateCcw /> Қайта жүктеу
                    </Button>
                  </div>
                ) : item.media_kind === "photo" ? (
                  <img
                    src={url.data}
                    alt={item.title}
                    className="max-h-[60vh] w-full object-contain"
                    onError={() => void url.refetch()}
                  />
                ) : (
                  <VideoPlayer
                    src={url.data}
                    poster={item.thumbnail_url}
                    title={item.title}
                    autoStart
                    className="max-h-[60vh]"
                    refreshUrl={() => getMediaPreviewUrl(item.storage_path)}
                  />
                )}
              </div>

              {item.status === "rejected" && item.rejection_reason ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  Қабылданбау себебі: {item.rejection_reason}
                </p>
              ) : null}

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Сипаттамасы</dt>
                  <dd className="whitespace-pre-wrap">{item.description ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Файл атауы</dt>
                  <dd className="break-all">{item.storage_path.split("/").pop()}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Түрі және өлшемі</dt>
                  <dd>
                    {item.mime_type} · {formatSize(item.file_size)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Жүктелген күні</dt>
                  <dd>{formatDateTime(item.created_at)}</dd>
                </div>
              </dl>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
