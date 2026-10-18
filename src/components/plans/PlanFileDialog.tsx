import { useQuery } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/format-date";
import { Download, LoaderCircle, RotateCcw } from "lucide-react";

import { formatFileSize, getPlanFileUrl } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function isPdf(plan: Plan): boolean {
  return (
    plan.file_mime_type === "application/pdf" ||
    (plan.file_name ?? "").toLowerCase().endsWith(".pdf")
  );
}

export function PlanFileDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const url = useQuery({
    queryKey: ["plan-file", plan?.id],
    enabled: !!plan?.file_path,
    gcTime: 0,
    staleTime: 0,
    queryFn: () => getPlanFileUrl(plan!.file_path!),
  });

  return (
    <Dialog open={!!plan} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {plan ? (
          <>
            <DialogHeader>
              <DialogTitle>{plan.title}</DialogTitle>
              <DialogDescription>
                {plan.file_name ?? "Файл жоқ"} · {plan.file_mime_type ?? "—"} ·{" "}
                {formatFileSize(plan.file_size)}
                {plan.uploaded_at
                  ? ` · ${formatDateTime(plan.uploaded_at)}`
                  : ""}
              </DialogDescription>
            </DialogHeader>

            {!plan.file_path ? (
              <p className="text-sm text-muted-foreground">Бұл жоспарға файл тіркелмеген.</p>
            ) : url.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" /> Жүктелуде...
              </p>
            ) : url.isError || !url.data ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  Файлды ашу мүмкін болмады. Файл жойылған немесе сілтеме мерзімі өткен.
                </p>
                <Button variant="outline" size="sm" onClick={() => void url.refetch()}>
                  <RotateCcw /> Қайта жүктеу
                </Button>
              </div>
            ) : isPdf(plan) ? (
              <div className="space-y-3">
                <iframe
                  src={url.data}
                  title={plan.file_name ?? plan.title}
                  className="h-[60vh] w-full rounded-md border bg-muted"
                />
                <Button asChild variant="outline">
                  <a href={url.data} download={plan.file_name ?? undefined}>
                    <Download /> Жүктеу
                  </a>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 rounded-md border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Бұл файл түрін браузерде сенімді қарау мүмкін емес. Файлды жүктеп алыңыз.
                </p>
                <Button asChild>
                  <a href={url.data} download={plan.file_name ?? undefined}>
                    <Download /> Жүктеу
                  </a>
                </Button>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
