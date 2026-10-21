import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export interface PublicOrganization {
  id: string;
  name: string;
  description: string | null;
  locality: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  region_id: string | null;
  region_name: string | null;
  settlement: string | null;
  organization_type: OrganizationTypeValue | null;
  director_name: string | null;
  staff_count: number | null;
  source_url: string | null;
  verified_at: string | null;
  events_count: number;
  media_count: number;
}

export type OrganizationTypeValue =
  Database["public"]["Enums"]["organization_type"];

export interface PublicRegion {
  id: string;
  name: string;
  kind: "city" | "district";
  image_url: string | null;
  organizations_count: number;
}

const ORG_COLUMNS =
  "id, name, description, locality, address, phone, email, avatar_path, cover_path, region_id, settlement, organization_type, director_name, staff_count, source_url, verified_at, regions(name)";

export interface PublicEventMedia {
  id: string;
  title: string;
  media_kind: "photo" | "video";
  url: string | null;
  thumbnail_url: string | null;
}

export interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  published_at: string;
  organization: Pick<
    PublicOrganization,
    "id" | "name" | "locality" | "avatar_url"
  >;
  media: PublicEventMedia[];
}

export interface FeedItem {
  id: string;
  title: string;
  description: string | null;
  media_kind: "photo" | "video";
  created_at: string;
  organization: Pick<
    PublicOrganization,
    "id" | "name" | "locality" | "avatar_url"
  >;
  url: string | null;
  thumbnail_url: string | null;
}

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY on the server.",
    );
  }
  return createClient<Database>(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (
          key.startsWith("sb_") &&
          headers.get("Authorization") === `Bearer ${key}`
        ) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

// Server-only client used solely to sign storage paths. Every path passed to
// signMediaPaths comes from a publicClient() query, so RLS has already limited
// it to approved, published media and public directory images.
function storageSigningClient() {
  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) return publicClient();
  return createClient<Database>(url, serviceKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function signMediaPaths(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return new Map();
  // Storage failures must not erase successfully loaded publications.
  try {
    const { data, error } = await storageSigningClient()
      .storage.from("media")
      .createSignedUrls(unique, 3600);
    if (error) throw new Error(error.message);
    return new Map(
      (data ?? [])
        .filter((item) => item.path && item.signedUrl)
        .map((item) => [item.path as string, item.signedUrl as string]),
    );
  } catch (error) {
    console.error("Public media links unavailable:", error);
    return new Map();
  }
}

type OrgRow = {
  id: string;
  name: string;
  description: string | null;
  locality: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  region_id: string | null;
  settlement: string | null;
  organization_type: OrganizationTypeValue | null;
  director_name: string | null;
  staff_count: number | null;
  source_url: string | null;
  verified_at: string | null;
  regions: { name: string } | null;
};

async function countPublished(orgIds: string[]) {
  const events = new Map<string, number>();
  const media = new Map<string, number>();
  if (orgIds.length === 0) return { events, media };
  const client = publicClient();
  const [e, m] = await Promise.all([
    client
      .from("events")
      .select("organization_id")
      .eq("moderation_status", "approved")
      .is("unpublished_at", null)
      .in("organization_id", orgIds),
    client
      .from("media_items")
      .select("organization_id")
      .eq("status", "approved")
      .is("unpublished_at", null)
      .in("organization_id", orgIds),
  ]);
  for (const row of e.data ?? [])
    events.set(row.organization_id, (events.get(row.organization_id) ?? 0) + 1);
  for (const row of m.data ?? [])
    media.set(row.organization_id, (media.get(row.organization_id) ?? 0) + 1);
  return { events, media };
}

function publicOrganization(
  row: OrgRow,
  signed: Map<string, string>,
  counts?: { events: Map<string, number>; media: Map<string, number> },
): PublicOrganization {
  return {
    region_id: row.region_id,
    region_name: row.regions?.name ?? null,
    settlement: row.settlement,
    organization_type: row.organization_type,
    director_name: row.director_name,
    staff_count: row.staff_count,
    source_url: row.source_url,
    verified_at: row.verified_at,
    events_count: counts?.events.get(row.id) ?? 0,
    media_count: counts?.media.get(row.id) ?? 0,
    ...publicOrganizationBase(row, signed),
  };
}

function publicOrganizationBase(
  row: {
    id: string;
    name: string;
    description: string | null;
    locality: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    avatar_path: string | null;
    cover_path: string | null;
  },
  signed: Map<string, string>,
) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    locality: row.locality,
    address: row.address,
    phone: row.phone,
    email: row.email,
    avatar_url: row.avatar_path ? (signed.get(row.avatar_path) ?? null) : null,
    cover_url: row.cover_path ? (signed.get(row.cover_path) ?? null) : null,
  };
}

export const listPublicOrganizations = createServerFn({
  method: "GET",
}).handler(async (): Promise<PublicOrganization[]> => {
  try {
    return await loadPublicOrganizations();
  } catch (error) {
    console.error("listPublicOrganizations failed:", error);
    return [];
  }
});

async function loadPublicOrganizations(): Promise<PublicOrganization[]> {
  const { data, error } = await publicClient()
    .from("organizations")
    .select(ORG_COLUMNS)
    .eq("status", "active")
    .order("name");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as OrgRow[];
  const [signed, counts] = await Promise.all([
    signMediaPaths(
      rows.flatMap((row) =>
        [row.avatar_path, row.cover_path].filter(
          (path): path is string => !!path,
        ),
      ),
    ),
    countPublished(rows.map((row) => row.id)),
  ]);
  return rows.map((row) => publicOrganization(row, signed, counts));
}

export const getPublicOrganization = createServerFn({ method: "GET" })
  .inputValidator((data: { organizationId: string }) => data)
  .handler(async ({ data }): Promise<PublicOrganization | null> => {
    try {
      return await loadPublicOrganization(data.organizationId);
    } catch (error) {
      console.error("getPublicOrganization failed:", error);
      return null;
    }
  });

async function loadPublicOrganization(
  organizationId: string,
): Promise<PublicOrganization | null> {
  const result = await publicClient()
    .from("organizations")
    .select(ORG_COLUMNS)
    .eq("id", organizationId)
    .eq("status", "active")
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) return null;
  const row = result.data as unknown as OrgRow;
  const [signed, counts] = await Promise.all([
    signMediaPaths(
      [row.avatar_path, row.cover_path].filter(
        (path): path is string => !!path,
      ),
    ),
    countPublished([row.id]),
  ]);
  return publicOrganization(row, signed, counts);
}

export const listPublicEvents = createServerFn({ method: "GET" })
  .inputValidator(
    (
      data:
        | { page?: number; pageSize?: number; organizationId?: string }
        | undefined,
    ) => ({
      page: Math.max(0, data?.page ?? 0),
      pageSize: Math.min(18, Math.max(3, data?.pageSize ?? 8)),
      organizationId: data?.organizationId,
    }),
  )
  .handler(
    async ({ data }): Promise<{ items: PublicEvent[]; hasMore: boolean }> => {
      try {
        return await loadPublicEvents(data);
      } catch (error) {
        console.error("listPublicEvents failed:", error);
        throw new Error("Іс-шараларды жүктеу мүмкін болмады. Қайта көріңіз.");
      }
    },
  );

async function loadPublicEvents(data: {
  page: number;
  pageSize: number;
  organizationId: string | undefined;
}): Promise<{ items: PublicEvent[]; hasMore: boolean }> {
  const from = data.page * data.pageSize;
  let query = publicClient()
    .from("events")
    .select(
      "id, title, description, event_date, event_time, location, reviewed_at, created_at, organization_id, organizations(id, name, locality, avatar_path), media_items(id, title, media_kind, storage_path, thumbnail_path, status)",
    )
    .eq("moderation_status", "approved")
    .is("unpublished_at", null)
    .order("reviewed_at", { ascending: false, nullsFirst: false })
    .range(from, from + data.pageSize);
  if (data.organizationId)
    query = query.eq("organization_id", data.organizationId);
  const { data: rowsData, error } = await query;
  if (error) throw new Error(error.message);
  const all = rowsData ?? [];
  const hasMore = all.length > data.pageSize;
  const rows = all.slice(0, data.pageSize);
  const paths = rows.flatMap((row) => {
    const org = row.organizations as { avatar_path: string | null } | null;
    return [
      ...(org?.avatar_path ? [org.avatar_path] : []),
      ...(row.media_items ?? [])
        .filter((media) => media.status === "approved")
        .flatMap((media) => [
          media.storage_path,
          ...(media.thumbnail_path ? [media.thumbnail_path] : []),
        ]),
    ];
  });
  const signed = await signMediaPaths(paths);
  return {
    hasMore,
    items: rows.map((row) => {
      const org = row.organizations as {
        id: string;
        name: string;
        locality: string | null;
        avatar_path: string | null;
      } | null;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        event_date: row.event_date,
        event_time: row.event_time,
        location: row.location,
        published_at: row.reviewed_at ?? row.created_at,
        organization: {
          id: org?.id ?? row.organization_id,
          name: org?.name ?? "Мәдениет ұйымы",
          locality: org?.locality ?? null,
          avatar_url: org?.avatar_path
            ? (signed.get(org.avatar_path) ?? null)
            : null,
        },
        media: (row.media_items ?? [])
          .filter((media) => media.status === "approved")
          .map((media) => ({
            id: media.id,
            title: media.title,
            media_kind: media.media_kind,
            url: signed.get(media.storage_path) ?? null,
            thumbnail_url: media.thumbnail_path
              ? (signed.get(media.thumbnail_path) ?? null)
              : null,
          })),
      };
    }),
  };
}

export const listPublicFeed = createServerFn({ method: "GET" })
  .inputValidator((data: { organizationId?: string } | undefined) => data ?? {})
  .handler(async ({ data }): Promise<FeedItem[]> => {
    try {
      return await loadPublicFeed(data.organizationId);
    } catch (error) {
      console.error("listPublicFeed failed:", error);
      throw new Error("Фото/видеоны жүктеу мүмкін болмады. Қайта көріңіз.");
    }
  });

async function loadPublicFeed(organizationId?: string): Promise<FeedItem[]> {
  let query = publicClient()
    .from("media_items")
    .select(
      "id, title, description, media_kind, created_at, storage_path, thumbnail_path, organization_id, organizations(id, name, locality, avatar_path)",
    )
    .eq("status", "approved")
    .is("unpublished_at", null)
    .is("event_id", null)
    .order("created_at", { ascending: false })
    .limit(30);
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data: rowsData, error } = await query;
  if (error) throw new Error(error.message);
  const rows = rowsData ?? [];
  const paths = rows.flatMap((row) => {
    const org = row.organizations as { avatar_path: string | null } | null;
    return [
      row.storage_path,
      ...(row.thumbnail_path ? [row.thumbnail_path] : []),
      ...(org?.avatar_path ? [org.avatar_path] : []),
    ];
  });
  const signed = await signMediaPaths(paths);
  return rows.map((row) => {
    const org = row.organizations as {
      id: string;
      name: string;
      locality: string | null;
      avatar_path: string | null;
    } | null;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      media_kind: row.media_kind,
      created_at: row.created_at,
      organization: {
        id: org?.id ?? row.organization_id,
        name: org?.name ?? "Мәдениет ұйымы",
        locality: org?.locality ?? null,
        avatar_url: org?.avatar_path
          ? (signed.get(org.avatar_path) ?? null)
          : null,
      },
      url: signed.get(row.storage_path) ?? null,
      thumbnail_url: row.thumbnail_path
        ? (signed.get(row.thumbnail_path) ?? null)
        : null,
    };
  });
}
/** Fresh signed playback URL for an approved public media file (used when a URL expires). */
export const getPublicMediaUrl = createServerFn({ method: "GET" })
  .inputValidator((data: { mediaId: string }) => {
    if (
      !data ||
      typeof data.mediaId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(data.mediaId)
    )
      throw new Error("Invalid media id");
    return data;
  })
  .handler(async ({ data }): Promise<string> => {
    const { data: row, error } = await publicClient()
      .from("media_items")
      .select("storage_path")
      .eq("id", data.mediaId)
      .eq("status", "approved")
      .is("unpublished_at", null)
      .maybeSingle();
    if (error || !row) throw new Error("Медиа табылмады");
    const signed = await signMediaPaths([row.storage_path]);
    const url = signed.get(row.storage_path);
    if (!url) throw new Error("Медиа табылмады");
    return url;
  });

export const listPublicRegions = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicRegion[]> => {
    try {
      const client = publicClient();
      const [regions, orgs] = await Promise.all([
        client
          .from("regions")
          .select("id, name, kind, image_path, sort_order")
          .order("sort_order"),
        client
          .from("organizations")
          .select("region_id, cover_path")
          .eq("status", "active"),
      ]);
      if (regions.error) throw new Error(regions.error.message);
      const counts = new Map<string, number>();
      const fallbackCover = new Map<string, string>();
      for (const org of orgs.data ?? []) {
        if (!org.region_id) continue;
        counts.set(org.region_id, (counts.get(org.region_id) ?? 0) + 1);
        if (org.cover_path && !fallbackCover.has(org.region_id))
          fallbackCover.set(org.region_id, org.cover_path);
      }
      const rows = regions.data ?? [];
      const imageFor = (row: (typeof rows)[number]) =>
        row.image_path ?? fallbackCover.get(row.id) ?? null;
      const signed = await signMediaPaths(
        rows.map(imageFor).filter((path): path is string => !!path),
      );
      return rows.map((row) => {
        const image = imageFor(row);
        return {
          id: row.id,
          name: row.name,
          kind: row.kind,
          image_url: image ? (signed.get(image) ?? null) : null,
          organizations_count: counts.get(row.id) ?? 0,
        };
      });
    } catch (error) {
      console.error("listPublicRegions failed:", error);
      return [];
    }
  },
);
