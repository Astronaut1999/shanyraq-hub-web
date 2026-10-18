import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Pause, Play, Upload, X, Video } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { listPlanItemOptions, MATERIAL_STATUS_LABELS } from "@/lib/plan-material";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { formatBytes, optimizeImage, type OptimizedImage } from "@/lib/image-optimize";
import { uploadMedia, validateMediaFile } from "@/lib/media";
import { needsResumableUpload, type ResumableHandle } from "@/lib/resumable-upload";

interface SelectedFile {
  file: File;
  previewUrl: string;
  optimized: OptimizedImage | null;
}

interface MediaUploaderProps {
  organizationId: string;
  uploaderId: string | null;
  eventId?: string | null;
  /** Allow attaching several photos at once (event packages). */
  multiple?: boolean;
  /** Pre-selected planned activity (e.g. opened from an overdue notification). */
  initialPlanItemId?: string | null;
  onUploaded: () => void;
}

export function MediaUploader({
  organizationId,
  uploaderId,
  eventId = null,
  multiple = true,
  initialPlanItemId = null,
  onUploaded,
}: MediaUploaderProps) {
  const [planItemId, setPlanItemId] = useState<string>(initialPlanItemId ?? "");
  const planOptions = useQuery({
    queryKey: ["plan-item-options", organizationId],
    queryFn: () => listPlanItemOptions(organizationId),
    enabled: !eventId,
  });
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; percentage: number } | null>(null);
  const [paused, setPaused] = useState(false);
  const handleRef = useRef<ResumableHandle | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      for (const item of selected) URL.revokeObjectURL(item.previewUrl);
    },
    [selected],
  );

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next: SelectedFile[] = [];
    for (const file of Array.from(files)) {
      try {
        const { kind } = validateMediaFile(file);
        const optimized = kind === "photo" ? await optimizeImage(file) : null;
        next.push({ file, previewUrl: URL.createObjectURL(file), optimized });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Файлды оқу мүмкін болмады.");
      }
    }
    setSelected((prev) => (multiple ? [...prev, ...next] : next.slice(-1)));
  }

  function removeAt(index: number) {
    setSelected((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleUpload() {
    if (selected.length === 0) return;
    setUploading(true);
    setPaused(false);
    let uploadedCount = 0;

    try {
      for (const item of selected) {
        await uploadMedia({
          file: item.file,
          title: title.trim() || item.file.name,
          description: description.trim() || null,
          organizationId,
          uploaderId,
          eventId,
          planItemId: eventId ? null : planItemId || null,
          onProgress: (p) =>
            setProgress({
              done: p.uploadedBytes,
              total: p.totalBytes,
              percentage: p.percentage,
            }),
          onHandle: (handle) => {
            handleRef.current = handle;
          },
        });
        uploadedCount += 1;
      }
      for (const item of selected) URL.revokeObjectURL(item.previewUrl);
      setSelected([]);
      setTitle("");
      setDescription("");
      toast.success(`${uploadedCount} файл сәтті жүктелді.`);
      void planOptions.refetch();
      onUploaded();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Жүктеу сәтсіз аяқталды.");
    } finally {
      handleRef.current = null;
      setProgress(null);
      setUploading(false);
    }
  }

  function togglePause() {
    const handle = handleRef.current;
    if (!handle) return;
    if (paused) {
      void handle.resume();
      setPaused(false);
    } else {
      void handle.pause();
      setPaused(true);
    }
  }

  function cancelUpload() {
    handleRef.current?.abort();
    handleRef.current = null;
    setPaused(false);
  }

  const hasResumable = selected.some((item) => needsResumableUpload(item.optimized?.file ?? item.file));

  return (
    <div className="space-y-4">
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button type="button" variant="outline" className="min-h-12" onClick={() => cameraRef.current?.click()}>
          <Camera className="mr-2 size-4" /> Сурет түсіру
        </Button>
        <Button type="button" variant="outline" className="min-h-12" onClick={() => videoRef.current?.click()}>
          <Video className="mr-2 size-4" /> Видео жазу
        </Button>
        <Button type="button" variant="outline" className="min-h-12" onClick={() => galleryRef.current?.click()}>
          <ImagePlus className="mr-2 size-4" /> Галереядан таңдау
        </Button>
      </div>

      {selected.length > 0 ? (
        <div className="space-y-2">
          {selected.map((item, index) => (
            <div
              key={`${item.file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-border p-2"
            >
              {item.file.type.startsWith("image/") ? (
                <img src={item.previewUrl} alt="" className="size-16 rounded object-cover" />
              ) : (
                <video src={item.previewUrl} className="size-16 rounded object-cover" preload="metadata" />
              )}
              <div className="min-w-0 flex-1 text-xs">
                <p className="truncate font-medium">{item.file.name}</p>
                <p className="text-muted-foreground">
                  {item.file.type.startsWith("image/") ? "Фото" : "Видео"} · {formatBytes(item.file.size)}
                  {item.optimized?.optimized
                    ? ` → ${formatBytes(item.optimized.optimizedSize)} (оңтайландырылды)`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Алып тастау"
                disabled={uploading}
                onClick={() => removeAt(index)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {!eventId ? (
        <div className="space-y-2">
          <Label htmlFor="media-plan-item">Қай жоспарланған іс-шараға қатысты?</Label>
          <select
            id="media-plan-item"
            value={planItemId}
            onChange={(e) => setPlanItemId(e.target.value)}
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Жоспарға қатысы жоқ</option>
            {(planOptions.data ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.planned_date} · {option.title} ({MATERIAL_STATUS_LABELS[option.material_status]})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="media-title">Атауы</Label>
        <Input
          id="media-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Материал атауы"
          className="min-h-11"
        />
        <Label htmlFor="media-description">Сипаттамасы</Label>
        <Textarea
          id="media-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {progress ? (
        <div className="space-y-2">
          <Progress value={progress.percentage} />
          <p className="text-xs text-muted-foreground">
            {formatBytes(progress.done)} / {formatBytes(progress.total)} · {progress.percentage}%
          </p>
          {hasResumable ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={togglePause}>
                {paused ? <Play className="mr-2 size-4" /> : <Pause className="mr-2 size-4" />}
                {paused ? "Жалғастыру" : "Кідірту"}
              </Button>
              <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={cancelUpload}>
                Болдырмау
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <Button
        type="button"
        className="min-h-12 w-full"
        disabled={selected.length === 0 || uploading}
        onClick={() => void handleUpload()}
      >
        {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
        Жүктеу
      </Button>
    </div>
  );
}
