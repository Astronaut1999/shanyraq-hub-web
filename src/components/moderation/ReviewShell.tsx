import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Shared full-detail review layout for every moderation submission type.
 * Full-screen on phones, large modal on larger screens, with a scrollable
 * body and a sticky action bar that respects the safe-area inset.
 */
export function ReviewShell({
  open,
  onClose,
  title,
  subtitle,
  badges,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="inset-0 left-0 top-0 flex h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 pt-[env(safe-area-inset-top)] sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[92dvh] sm:w-[calc(100%-2rem)] sm:max-w-4xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:pt-0">
        <DialogHeader className="shrink-0 border-b border-border bg-card px-4 py-3 pr-12 text-left sm:px-6">
          <DialogTitle className="text-base leading-snug sm:text-lg">{title}</DialogTitle>
          {subtitle ? <DialogDescription className="text-sm">{subtitle}</DialogDescription> : null}
          {badges ? <div className="flex flex-wrap gap-1.5 pt-1">{badges}</div> : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">{children}</div>
        {actions ? (
          <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
            <div className="flex gap-2">{actions}</div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{children ?? "—"}</dd>
    </div>
  );
}

/** Tap-to-enlarge full-screen image viewer. */
export function ImageLightbox({ src, alt, onClose }: { src: string | null; alt: string; onClose: () => void }) {
  return (
    <Dialog open={!!src} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="inset-0 left-0 top-0 flex h-[100dvh] max-w-none translate-x-0 translate-y-0 items-center justify-center overflow-auto rounded-none border-0 bg-foreground/95 p-2 [&>button]:bg-background [&>button]:p-2 [&>button]:opacity-100">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {src ? <img src={src} alt={alt} className="max-h-full max-w-full object-contain" onClick={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}
