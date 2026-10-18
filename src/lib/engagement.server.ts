import { createHash, randomUUID } from "crypto";
import { getCookie, getRequestHeader, setCookie } from "@tanstack/react-start/server";

import type { Database } from "@/integrations/supabase/types";

export type PublicationType = Database["public"]["Enums"]["publication_type"];

const GUEST_COOKIE = "shanyraq_guest";

function actorHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function getEngagementActor() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const bearer = getRequestHeader("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer) {
    const { data } = await supabaseAdmin.auth.getUser(bearer);
    if (data.user) {
      return { actorKey: actorHash(`user:${data.user.id}`), guestSessionId: null, userId: data.user.id };
    }
  }

  let token = getCookie(GUEST_COOKIE);
  if (!token || !/^[a-f0-9-]{36}$/i.test(token)) {
    token = randomUUID();
    setCookie(GUEST_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  const tokenHash = actorHash(`guest:${token}`);
  const { data, error } = await supabaseAdmin
    .from("guest_sessions")
    .upsert({ token_hash: tokenHash, last_seen_at: new Date().toISOString() }, { onConflict: "token_hash" })
    .select("id")
    .single();
  if (error) throw new Error("Қонақ сессиясын ашу мүмкін болмады.");
  return { actorKey: tokenHash, guestSessionId: data.id, userId: null };
}

export function cleanText(value: string) {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}