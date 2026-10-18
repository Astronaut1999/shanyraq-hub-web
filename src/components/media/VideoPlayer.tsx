import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  src: string | null | undefined;
  poster?: string | null | undefined;
  title?: string | undefined;
  /** Returns a freshly signed URL; used when the current one has expired or failed. */
  refreshUrl?: () => Promise<string>;
  /** Start playing as soon as the player mounts (only after a user tap). */
  autoStart?: boolean;
  className?: string | undefined;
  videoClassName?: string;
}

/**
 * Browser-native streaming video player: poster first, nothing downloaded until
 * the user taps play, inline playback on iOS, native touch-friendly controls
 * (play/pause, seek, volume, fullscreen), loading and recoverable error states.
 */
export function VideoPlayer({ src, poster, title, refreshUrl, autoStart, className, videoClassName }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState(src ?? null);
  const [started, setStarted] = useState(!!autoStart);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const retried = useRef(false);
  const resumeAt = useRef(0);

  useEffect(() => {
    setUrl(src ?? null);
    retried.current = false;
    setFailed(false);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!started || !video || !url) return;
    setLoading(true);
    video.play().catch(() => setLoading(false));
  }, [started, url]);

  const reload = async () => {
    setFailed(false);
    setLoading(true);
    try {
      const fresh = refreshUrl ? await refreshUrl() : url;
      if (!fresh) throw new Error("missing");
      setUrl(fresh === url ? `${fresh}${fresh.includes("?") ? "&" : "?"}r=${Date.now()}` : fresh);
      setStarted(true);
    } catch {
      setLoading(false);
      setFailed(true);
    }
  };

  const handleError = () => {
    const video = videoRef.current;
    resumeAt.current = video?.currentTime ?? 0;
    // Signed URLs expire: silently fetch a fresh one once before showing an error.
    if (refreshUrl && !retried.current) {
      retried.current = true;
      void reload();
      return;
    }
    setLoading(false);
    setFailed(true);
  };

  return (
    <div className={cn("relative aspect-video w-full max-w-full overflow-hidden bg-foreground", className)}>
      {started && url && !failed ? (
        <video
          ref={videoRef}
          key={url}
          src={url}
          poster={poster ?? undefined}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          className={cn("size-full object-contain", videoClassName)}
          aria-label={title}
          onLoadedMetadata={(e) => {
            if (resumeAt.current > 0) e.currentTarget.currentTime = resumeAt.current;
          }}
          onWaiting={() => setLoading(true)}
          onLoadStart={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onPlaying={() => setLoading(false)}
          onPause={() => setLoading(false)}
          onError={handleError}
        >
          Браузеріңіз бұл бейнені ойнатуды қолдамайды.
        </video>
      ) : !failed ? (
        <button
          type="button"
          className="group relative block size-full"
          onClick={() => (url ? setStarted(true) : void reload())}
          aria-label={title ? `Видеоны ойнату: ${title}` : "Видеоны ойнату"}
        >
          {poster ? (
            <img src={poster} alt={title ?? ""} className="size-full object-cover" loading="lazy" />
          ) : url ? (
            // No stored thumbnail: let the browser render the first frame (metadata-only fetch, no playback).
            <video
              src={`${url}${url.includes("#") ? "" : "#t=0.5"}`}
              preload="metadata"
              muted
              playsInline
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none size-full object-cover"
            />
          ) : null}
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/10">
            <span className="flex size-16 items-center justify-center rounded-full bg-background/95 text-primary shadow-lg transition-transform group-active:scale-95">
              <Play className="ml-1 size-7 fill-current" />
            </span>
          </span>
        </button>
      ) : null}

      {loading && !failed ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <LoaderCircle className="size-9 animate-spin text-background drop-shadow" />
        </span>
      ) : null}

      {failed ? (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted p-4 text-center">
          <p className="text-sm font-medium text-foreground">Видео жүктелмеді. Қайта көріңіз.</p>
          <Button size="sm" variant="outline" onClick={() => { retried.current = false; void reload(); }}>
            <RotateCcw /> Қайта көру
          </Button>
        </div>
      ) : null}
    </div>
  );
}
