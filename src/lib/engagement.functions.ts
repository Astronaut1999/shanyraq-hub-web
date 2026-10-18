import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

export type PublicationType = Database["public"]["Enums"]["publication_type"];

export interface PublicComment {
  id: string;
  display_name: string;
  body: string;
  created_at: string;
}

export interface EngagementSummary {
  publicationType: PublicationType;
  publicationId: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  comments: PublicComment[];
}

const publicationSchema = z.object({
  publicationType: z.enum(["event", "media_item"]),
  publicationId: z.string().uuid(),
});

const publicationsSchema = z.object({ publications: z.array(publicationSchema).max(60) });

export const listEngagement = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => publicationsSchema.parse(input))
  .handler(async ({ data }): Promise<EngagementSummary[]> => {
    const { getEngagementActor } = await import("./engagement.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await getEngagementActor();
    if (data.publications.length === 0) return [];

    const eventIds = data.publications.filter((item) => item.publicationType === "event").map((item) => item.publicationId);
    const mediaIds = data.publications.filter((item) => item.publicationType === "media_item").map((item) => item.publicationId);
    const [eventsResult, mediaResult] = await Promise.all([
      eventIds.length ? supabaseAdmin.from("events").select("id").in("id", eventIds).eq("moderation_status", "approved").is("unpublished_at", null) : Promise.resolve({ data: [], error: null }),
      mediaIds.length ? supabaseAdmin.from("media_items").select("id").in("id", mediaIds).eq("status", "approved").is("event_id", null).is("unpublished_at", null) : Promise.resolve({ data: [], error: null }),
    ]);
    if (eventsResult.error || mediaResult.error) throw new Error("Жарияланымдарды тексеру мүмкін болмады.");
    const publicKeys = new Set([
      ...(eventsResult.data ?? []).map((item) => `event:${item.id}`),
      ...(mediaResult.data ?? []).map((item) => `media_item:${item.id}`),
    ]);
    const visible = data.publications.filter((item) => publicKeys.has(`${item.publicationType}:${item.publicationId}`));
    const ids = visible.map((item) => item.publicationId);
    if (ids.length === 0) return data.publications.map((publication) => ({ ...publication, likeCount: 0, commentCount: 0, liked: false, comments: [] }));
    const [likesResult, commentsResult] = await Promise.all([
      supabaseAdmin.from("content_likes").select("publication_type, publication_id, actor_key").in("publication_id", ids),
      supabaseAdmin
        .from("content_comments")
        .select("id, publication_type, publication_id, display_name, body, created_at")
        .in("publication_id", ids)
        .eq("status", "approved")
        .order("created_at", { ascending: false }),
    ]);
    if (likesResult.error || commentsResult.error) throw new Error("Жазба әрекеттерін жүктеу мүмкін болмады.");

    return data.publications.map((publication) => {
      if (!publicKeys.has(`${publication.publicationType}:${publication.publicationId}`)) {
        return { ...publication, likeCount: 0, commentCount: 0, liked: false, comments: [] };
      }
      const likes = (likesResult.data ?? []).filter(
        (item) => item.publication_type === publication.publicationType && item.publication_id === publication.publicationId,
      );
      const comments = (commentsResult.data ?? []).filter(
        (item) => item.publication_type === publication.publicationType && item.publication_id === publication.publicationId,
      );
      return {
        ...publication,
        likeCount: likes.length,
        commentCount: comments.length,
        liked: likes.some((item) => item.actor_key === actor.actorKey),
        comments: comments.slice(0, 3).map(({ id, display_name, body, created_at }) => ({ id, display_name, body, created_at })),
      };
    });
  });

export const toggleLike = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => publicationSchema.parse(input))
  .handler(async ({ data }) => {
    const { getEngagementActor } = await import("./engagement.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await getEngagementActor();
    const { data: liked, error } = await supabaseAdmin.rpc("toggle_publication_like", {
      _type: data.publicationType,
      _id: data.publicationId,
      _actor_key: actor.actorKey,
      _guest_session_id: actor.guestSessionId as unknown as string,
      _user_id: actor.userId as unknown as string,
    });
    if (error) throw new Error("Лайкты сақтау мүмкін болмады.");
    return { liked: Boolean(liked) };
  });

export const addComment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => publicationSchema.extend({ displayName: z.string().min(2).max(60), body: z.string().min(1).max(500) }).parse(input))
  .handler(async ({ data }) => {
    const { cleanText, getEngagementActor } = await import("./engagement.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await getEngagementActor();
    const displayName = cleanText(data.displayName);
    const body = cleanText(data.body);
    if (displayName.length < 2 || body.length < 1) throw new Error("Аты-жөніңіз бен пікіріңізді толтырыңыз.");
    const { error } = await supabaseAdmin.rpc("add_publication_comment", {
      _type: data.publicationType,
      _id: data.publicationId,
      _actor_key: actor.actorKey,
      _guest_session_id: actor.guestSessionId as unknown as string,
      _user_id: actor.userId as unknown as string,
      _display_name: displayName,
      _body: body,
    });
    if (error?.message.includes("COMMENT_RATE_LIMITED")) throw new Error("Тым көп пікір жіберілді. Бір минуттан кейін қайталап көріңіз.");
    if (error?.message.includes("COMMENT_DUPLICATE")) throw new Error("Бұл пікір жақында жіберілген.");
    if (error) throw new Error("Пікірді жіберу мүмкін болмады.");
    return { ok: true };
  });

export const reportComment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ commentId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { getEngagementActor } = await import("./engagement.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await getEngagementActor();
    const { error } = await supabaseAdmin.rpc("report_publication_comment", {
      _comment_id: data.commentId,
      _actor_key: actor.actorKey,
      _guest_session_id: actor.guestSessionId as unknown as string,
      _user_id: actor.userId as unknown as string,
      _reason: "inappropriate",
    });
    if (error) throw new Error("Шағымды жіберу мүмкін болмады.");
    return { ok: true };
  });