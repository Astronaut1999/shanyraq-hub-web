import { useState } from "react";
import { EyeOff, Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type Confirm = "delete" | "unpublish" | "permanent" | null;

interface Props {
  onView: () => void;
  onEdit?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
  onUnpublish?: (() => void) | undefined;
  /** Permanent deletion of approved content (central admin only). */
  onPermanentDelete?: (() => void) | undefined;
  busy?: boolean;
}

export function ArchiveItemMenu({ onView, onEdit, onDelete, onUnpublish, onPermanentDelete, busy }: Props) {
  const [confirm, setConfirm] = useState<Confirm>(null);

  const texts: Record<Exclude<Confirm, null>, { title: string; desc?: string; action: string }> = {
    delete: { title: "Бұл материалды өшіруге сенімдісіз бе?", action: "Өшіру" },
    unpublish: {
      title: "Жарияланымнан алып тастау керек пе?",
      desc: "Материал лентадан, ұйым профилінен және ашық бөлімдерден алынады, бірақ архивте сақталады.",
      action: "Алып тастау",
    },
    permanent: {
      title: "Мақұлданған материалды біржола өшіру керек пе?",
      desc: "Бұл әрекетті қайтару мүмкін емес. Жазба мен файл толығымен жойылады.",
      action: "Біржола өшіру",
    },
  };

  const run = () => {
    if (confirm === "delete") onDelete?.();
    if (confirm === "unpublish") onUnpublish?.();
    if (confirm === "permanent") onPermanentDelete?.();
    setConfirm(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-11" aria-label="Әрекеттер" disabled={busy}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem onSelect={onView}>
            <Eye /> Қарау
          </DropdownMenuItem>
          {onEdit ? (
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil /> Өңдеу және қайта жіберу
            </DropdownMenuItem>
          ) : null}
          {onUnpublish ? (
            <DropdownMenuItem onSelect={() => setConfirm("unpublish")}>
              <EyeOff /> Жарияланымнан алып тастау
            </DropdownMenuItem>
          ) : null}
          {onDelete || onPermanentDelete ? <DropdownMenuSeparator /> : null}
          {onDelete ? (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirm("delete")}>
              <Trash2 /> Өшіру
            </DropdownMenuItem>
          ) : null}
          {onPermanentDelete ? (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirm("permanent")}>
              <Trash2 /> Біржола өшіру
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          {confirm ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{texts[confirm].title}</AlertDialogTitle>
                {texts[confirm].desc ? (
                  <AlertDialogDescription>{texts[confirm].desc}</AlertDialogDescription>
                ) : null}
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Бас тарту</AlertDialogCancel>
                <AlertDialogAction
                  onClick={run}
                  className={confirm === "unpublish" ? undefined : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
                >
                  {texts[confirm].action}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
