import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/format-date";
import { Flag, Heart, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addComment, listEngagement, reportComment, toggleLike, type PublicationType } from "@/lib/engagement.functions";
import { useAuth } from "@/lib/auth-context";

interface PostEngagementProps {
  publicationType: PublicationType;
  publicationId: string;
}

export function PostEngagement({ publicationType, publicationId }: PostEngagementProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [commenting, setCommenting] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [body, setBody] = useState("");
  const queryKey = ["engagement", publicationType, publicationId];
  const engagement = useQuery({
    queryKey,
    queryFn: async () => (await listEngagement({ data: { publications: [{ publicationType, publicationId }] } }))[0],
    staleTime: 30_000,
  });
  const summary = engagement.data;

  const like = useMutation({
    mutationFn: () => toggleLike({ data: { publicationType, publicationId } }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<typeof summary>(queryKey);
      if (previous) queryClient.setQueryData(queryKey, { ...previous, liked: !previous.liked, likeCount: Math.max(0, previous.likeCount + (previous.liked ? -1 : 1)) });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error("Лайкты сақтау мүмкін болмады");
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });
  const comment = useMutation({
    mutationFn: () => addComment({ data: { publicationType, publicationId, displayName: name, body } }),
    onSuccess: () => {
      setBody("");
      setCommenting(false);
      void queryClient.invalidateQueries({ queryKey });
      toast.success("Пікір жарияланды");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Пікір жіберілмеді"),
  });
  const report = useMutation({
    mutationFn: (commentId: string) => reportComment({ data: { commentId } }),
    onSuccess: () => toast.success("Шағым қабылданды"),
    onError: () => toast.error("Шағым жіберілмеді"),
  });

  return (
    <div className="border-t border-border/60 px-3 pb-3 pt-2.5">
      <div className="flex items-center gap-4">
        <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 px-1.5" onClick={() => like.mutate()} aria-label="Лайк">
          <Heart className={`size-5 ${summary?.liked ? "fill-destructive text-destructive" : ""}`} />
          <span>{summary?.likeCount ?? 0}</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 px-1.5" onClick={() => setCommenting((value) => !value)}>
          <MessageCircle className="size-5" /> <span>{summary?.commentCount ?? 0}</span>
        </Button>
      </div>

      {(summary?.comments ?? []).map((item) => (
        <div key={item.id} className="group mt-2 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0"><strong className="mr-1.5 font-semibold">{item.display_name}</strong>{item.body}</p>
            <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 gap-1 px-1.5 text-[11px] text-muted-foreground opacity-70" aria-label="Шағымдану" onClick={() => report.mutate(item.id)}>
              <Flag className="size-3" /> Шағымдану
            </Button>
          </div>
          <time className="text-[11px] text-muted-foreground">{formatDateTime(item.created_at)}</time>
        </div>
      ))}

      {!commenting ? (
        <button type="button" className="mt-2 text-sm text-muted-foreground" onClick={() => setCommenting(true)}>Пікір жазу...</button>
      ) : (
        <div className="mt-2 space-y-2 rounded-lg bg-muted/60 p-2.5">
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="Атыңыз" aria-label="Атыңыз" />
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={500} rows={2} placeholder="Пікір" aria-label="Пікір" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCommenting(false)}>Болдырмау</Button>
            <Button type="button" size="sm" disabled={comment.isPending || name.trim().length < 2 || body.trim().length < 1} onClick={() => comment.mutate()}><Send className="size-4" /> Жіберу</Button>
          </div>
        </div>
      )}
    </div>
  );
}