import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type PlanInsert = Database["public"]["Tables"]["plans"]["Insert"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type PlanItemInsert = Database["public"]["Tables"]["plan_items"]["Insert"];

/** Stable identifiers — every demo record is created with these fixed ids. */
const DEMO = {
  orgs: {
    aksu: "0de00000-0000-4000-8000-000000000a02",
    bayanaul: "0de00000-0000-4000-8000-000000000a03",
  },
  plans: {
    estay: "0de00000-0000-4000-8000-000000000b01",
    aksu: "0de00000-0000-4000-8000-000000000b02",
    bayanaul: "0de00000-0000-4000-8000-000000000b03",
    estayMonthly: "0de00000-0000-4000-8000-000000000b04",
  },
  events: {
    estay: "0de00000-0000-4000-8000-000000000c01",
    aksu: "0de00000-0000-4000-8000-000000000c02",
    bayanaul: "0de00000-0000-4000-8000-000000000c03",
    estayPast: "0de00000-0000-4000-8000-000000000c04",
    aksuPast: "0de00000-0000-4000-8000-000000000c05",
  },
  items: {
    estayCompleted: "0de00000-0000-4000-8000-000000000e01",
    estayOverdue: "0de00000-0000-4000-8000-000000000e02",
    estayPlanned: "0de00000-0000-4000-8000-000000000e03",
    aksuAwaiting: "0de00000-0000-4000-8000-000000000e04",
    bayanaulCancelled: "0de00000-0000-4000-8000-000000000e05",
    estayMonthlyCopy: "0de00000-0000-4000-8000-000000000e06",
    bayanaulReturned: "0de00000-0000-4000-8000-000000000e07",
  },
  media: {
    estay: "0de00000-0000-4000-8000-000000000d01",
    aksu: "0de00000-0000-4000-8000-000000000d02",
    bayanaul: "0de00000-0000-4000-8000-000000000d03",
    estayGallery: "0de00000-0000-4000-8000-000000000d04",
    estayGalleryTwo: "0de00000-0000-4000-8000-000000000d05",
    estayPostOne: "0de00000-0000-4000-8000-000000000d06",
    estayPostTwo: "0de00000-0000-4000-8000-000000000d07",
    aksuPostOne: "0de00000-0000-4000-8000-000000000d08",
    aksuPostTwo: "0de00000-0000-4000-8000-000000000d09",
    bayanaulPostOne: "0de00000-0000-4000-8000-000000000d0a",
    bayanaulPostTwo: "0de00000-0000-4000-8000-000000000d0b",
    estayEvidence: "0de00000-0000-4000-8000-000000000d0c",
    aksuEvidence: "0de00000-0000-4000-8000-000000000d0d",
  },
} as const;

const ESTAY_NAME = "Естай атындағы қалалық мәдениет сарайы";

const DEMO_ACCOUNTS = {
  estay: { email: "demo.estay@example.com", full_name: "Естай МС әкімшісі — ДЕМО" },
  aksu: { email: "demo.aksu@example.com", full_name: "Ақсу МҮ әкімшісі — ДЕМО" },
  bayanaul: { email: "demo.bayanaul@example.com", full_name: "Баянауыл МҮ әкімшісі — ДЕМО" },
} as const;

type OrgKey = keyof typeof DEMO_ACCOUNTS;

export interface DemoCredential {
  organization: string;
  email: string;
  password: string;
}

export interface SeedReport {
  created: string[];
  reused: string[];
  credentials: DemoCredential[];
}

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*?";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  const pick = (set: string, i: number) => set[bytes[i]! % set.length]!;
  const chars = [pick(upper, 0), pick(lower, 1), pick(digits, 2), pick(symbols, 3)];
  for (let i = 4; i < 16; i += 1) chars.push(pick(all, i));
  return chars.join("");
}

async function assertSuperAdmin(supabase: {
  rpc: (
    fn: "is_super_admin",
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
}) {
  const { data, error } = await supabase.rpc("is_super_admin");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("FORBIDDEN");
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** SUPER_ADMIN only: idempotently creates the full demo dataset. */
export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SeedReport> => {
    await assertSuperAdmin(context.supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { DEMO_IMAGES } = await import("./demo-media.server");
    const { DEMO_VISUALS, DEMO_ANNUAL_PDF, DEMO_MONTHLY_XLSX } = await import("./demo-assets.server");

    const created: string[] = [];
    const reused: string[] = [];

    // ---- Organizations -----------------------------------------------------
    const { data: estayExisting, error: estayError } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("name", ESTAY_NAME)
      .maybeSingle();
    if (estayError) throw new Error(estayError.message);

    let estayId: string;
    if (estayExisting) {
      estayId = estayExisting.id;
      reused.push(`Ұйым: ${ESTAY_NAME}`);
    } else {
      const { data, error } = await supabaseAdmin
        .from("organizations")
        .insert({ name: ESTAY_NAME, status: "active" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      estayId = data.id;
      created.push(`Ұйым: ${ESTAY_NAME}`);
    }

    const profileVisuals = {
      estay: { avatar: "venue", cover: "dombra", locality: "Павлодар қаласы" },
      aksu: { avatar: "dance", cover: "concert", locality: "Ақсу қаласы" },
      bayanaul: { avatar: "exhibition", cover: "venue", locality: "Баянауыл ауылы" },
    } as const;

    for (const [key, profileVisual] of Object.entries(profileVisuals)) {
      const organizationId = key === "estay" ? estayId : DEMO.orgs[key as "aksu" | "bayanaul"];
      const avatarPath = `${organizationId}/profile/demo-avatar.webp`;
      const coverPath = `${organizationId}/profile/demo-cover.webp`;
      for (const [path, visual] of [[avatarPath, profileVisual.avatar], [coverPath, profileVisual.cover]] as const) {
        const bytes = decodeBase64(DEMO_VISUALS[visual]!);
        const upload = await supabaseAdmin.storage.from("media").upload(path, bytes, { contentType: "image/webp", upsert: true });
        if (upload.error) throw new Error(upload.error.message);
      }
      const { error } = await supabaseAdmin.from("organizations").update({ locality: profileVisual.locality, avatar_path: avatarPath, cover_path: coverPath }).eq("id", organizationId);
      if (error) throw new Error(error.message);
    }

    const demoOrgs = [
      {
        key: "aksu" as const,
        id: DEMO.orgs.aksu,
        name: "Ақсу қалалық мәдениет үйі — ДЕМО",
        description: "Демонстрациялық ұйым. Ақсу қаласының мәдениет үйі.",
        address: "Ақсу қаласы, Астана көшесі 12",
        phone: "+7 (718) 375-00-12",
        email: "demo.aksu@example.com",
        locality: "Ақсу қаласы",
        avatar_path: `${DEMO.orgs.aksu}/profile/demo-avatar.webp`,
        cover_path: `${DEMO.orgs.aksu}/profile/demo-cover.webp`,
      },
      {
        key: "bayanaul" as const,
        id: DEMO.orgs.bayanaul,
        name: "Баянауыл аудандық мәдениет үйі — ДЕМО",
        description: "Демонстрациялық ұйым. Баянауыл ауданының мәдениет үйі.",
        address: "Баянауыл ауылы, Сәтбаев көшесі 5",
        phone: "+7 (718) 402-00-34",
        email: "demo.bayanaul@example.com",
        locality: "Баянауыл ауылы",
        avatar_path: `${DEMO.orgs.bayanaul}/profile/demo-avatar.webp`,
        cover_path: `${DEMO.orgs.bayanaul}/profile/demo-cover.webp`,
      },
    ];

    for (const { key: _key, ...org } of demoOrgs) {
      const { data: existing } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("id", org.id)
        .maybeSingle();
      const { error } = await supabaseAdmin
        .from("organizations")
        .upsert({ ...org, status: "active" as const, is_demo: true });
      if (error) throw new Error(error.message);
      (existing ? reused : created).push(`Ұйым: ${org.name}`);
    }

    const orgIds: Record<OrgKey, string> = {
      estay: estayId,
      aksu: DEMO.orgs.aksu,
      bayanaul: DEMO.orgs.bayanaul,
    };
    const orgNames: Record<OrgKey, string> = {
      estay: ESTAY_NAME,
      aksu: demoOrgs[0]!.name,
      bayanaul: demoOrgs[1]!.name,
    };

    // ---- Demo administrator accounts --------------------------------------
    const credentials: DemoCredential[] = [];
    const adminIds: Record<OrgKey, string> = {} as Record<OrgKey, string>;

    for (const key of Object.keys(DEMO_ACCOUNTS) as OrgKey[]) {
      const account = DEMO_ACCOUNTS[key];
      const password = generatePassword();

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", account.email)
        .maybeSingle();

      let userId: string;
      if (profile) {
        userId = profile.id;
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        });
        if (error) throw new Error(error.message);
        reused.push(`Әкімші: ${account.email} (құпия сөз жаңартылды)`);
      } else {
        const res = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: account.full_name },
        });
        if (res.error || !res.data.user) {
          throw new Error(res.error?.message ?? "USER_CREATE_FAILED");
        }
        userId = res.data.user.id;
        created.push(`Әкімші: ${account.email}`);
      }
      adminIds[key] = userId;

      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: userId,
        full_name: account.full_name,
        email: account.email,
        organization_id: orgIds[key],
      });
      if (profileError) throw new Error(profileError.message);

      await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: userId, role: "ORGANIZATION_ADMIN" as const },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );

      credentials.push({ organization: orgNames[key], email: account.email, password });
    }

    // ---- Plans -------------------------------------------------------------
    const plans: PlanInsert[] = [
      {
        id: DEMO.plans.estay,
        organization_id: orgIds.estay,
        title: "2026 жылға арналған мәдени іс-шаралар жоспары — ДЕМО",
        description:
          "Жыл бойына өтетін концерттер, көрмелер, ұлттық мерекелер мен үйірме жұмыстарының жылдық жоспары.",
        plan_type: "annual" as const,
        period_year: 2026,
        period_month: null,
        created_by: adminIds.estay,
      },
      {
        id: DEMO.plans.aksu,
        organization_id: orgIds.aksu,
        title: "Қыркүйек айының мәдени іс-шаралар жоспары — ДЕМО",
        description: "Қыркүйек айында өткізілетін мәдени-ағарту іс-шараларының айлық жоспары.",
        plan_type: "monthly" as const,
        period_year: 2026,
        period_month: 9,
        created_by: adminIds.aksu,
      },
      {
        id: DEMO.plans.bayanaul,
        organization_id: orgIds.bayanaul,
        title: "Қыркүйек айының шығармашылық жоспары — ДЕМО",
        description: "Шығармашылық ұжымдардың қыркүйек айындағы дайындық және өнер көрсету жоспары.",
        plan_type: "monthly" as const,
        period_year: 2026,
        period_month: 9,
        created_by: adminIds.bayanaul,
      },
    ];
    for (const plan of plans) {
      const { data: existing } = await supabaseAdmin
        .from("plans")
        .select("id")
        .eq("id", plan.id!)
        .maybeSingle();
      const { error } = await supabaseAdmin.from("plans").upsert(plan);
      if (error) throw new Error(error.message);
      (existing ? reused : created).push(`Жоспар: ${plan.title}`);
    }

    const planFiles = [
      { id: DEMO.plans.estay, org: orgIds.estay, path: `${orgIds.estay}/${DEMO.plans.estay}/demo-annual-plan.pdf`, name: "2026-zhyldyk-zhospar.pdf", mime: "application/pdf", content: DEMO_ANNUAL_PDF },
      { id: DEMO.plans.aksu, org: orgIds.aksu, path: `${orgIds.aksu}/${DEMO.plans.aksu}/demo-monthly-plan.xlsx`, name: "2026-qyrkuyek-zhospary.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content: DEMO_MONTHLY_XLSX },
      { id: DEMO.plans.bayanaul, org: orgIds.bayanaul, path: `${orgIds.bayanaul}/${DEMO.plans.bayanaul}/demo-monthly-plan.xlsx`, name: "2026-shygarmashylyk-zhospary.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", content: DEMO_MONTHLY_XLSX },
    ];
    for (const file of planFiles) {
      const bytes = decodeBase64(file.content);
      const upload = await supabaseAdmin.storage.from("plan-files").upload(file.path, bytes, { contentType: file.mime, upsert: true });
      if (upload.error) throw new Error(upload.error.message);
      const { error } = await supabaseAdmin.from("plans").update({ file_path: file.path, file_name: file.name, file_mime_type: file.mime, file_size: bytes.byteLength, uploaded_at: new Date().toISOString() }).eq("id", file.id);
      if (error) throw new Error(error.message);
    }

    // ---- Events ------------------------------------------------------------
    const events: EventInsert[] = [
      {
        id: DEMO.events.estay,
        organization_id: orgIds.estay,
        title: "Ұлттық домбыра күні — ДЕМО",
        description: "Домбырашылар байқауы, шәкірттер концерті және ұлттық аспаптар көрмесі.",
        event_date: "2026-11-15",
        event_time: "15:00",
        location: "Естай атындағы мәдениет сарайының үлкен залы",
        created_by: adminIds.estay,
        moderation_status: "approved" as const,
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      },
      {
        id: DEMO.events.aksu,
        organization_id: orgIds.aksu,
        title: "Жастар шығармашылық концерті — ДЕМО",
        description: "Қала жастарының ән, би және театр қойылымдарынан тұратын кеші.",
        event_date: "2026-10-24",
        event_time: "18:30",
        location: "Ақсу қалалық мәдениет үйі, концерт залы",
        created_by: adminIds.aksu,
        moderation_status: "pending" as const,
        submitted_at: new Date().toISOString(),
      },
      {
        id: DEMO.events.bayanaul,
        organization_id: orgIds.bayanaul,
        title: "Ұлттық өнер кеші — ДЕМО",
        description: "Халық әндері, айтыс және қолөнер шеберлерінің көрмесі өтеді.",
        event_date: "2026-12-05",
        event_time: "17:00",
        location: "Баянауыл аудандық мәдениет үйі",
        created_by: adminIds.bayanaul,
        moderation_status: "rejected" as const,
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
        rejection_reason: "Іс-шара сипаттамасын нақтылау қажет.",
      },
    ];
    for (const event of events) {
      const { data: existing } = await supabaseAdmin
        .from("events")
        .select("id")
        .eq("id", event.id!)
        .maybeSingle();
      const { error } = await supabaseAdmin.from("events").upsert(event);
      if (error) throw new Error(error.message);
      (existing ? reused : created).push(`Іс-шара: ${event.title}`);
    }

    // ---- Media + moderation statuses --------------------------------------
    const now = new Date().toISOString();
    const mediaPlan = [
      {
        key: "estay" as const,
        id: DEMO.media.estay,
        title: "Ұлттық домбыра күні — афиша (ДЕМО)",
        description: "Іс-шара афишасы. Демонстрациялық материал.",
        status: "approved" as const,
        rejection_reason: null,
        visual: "dombra" as const,
      },
      {
        key: "aksu" as const,
        id: DEMO.media.aksu,
        title: "Жастар шығармашылық концерті — афиша (ДЕМО)",
        description: "Модерацияны күтіп тұрған демонстрациялық материал.",
        status: "pending" as const,
        rejection_reason: null,
        visual: "concert" as const,
      },
      {
        key: "bayanaul" as const,
        id: DEMO.media.bayanaul,
        title: "Ұлттық өнер кеші — афиша (ДЕМО)",
        description: "Қабылданбаған демонстрациялық материал.",
        status: "rejected" as const,
        rejection_reason: "Сурет сапасы талапқа сәйкес келмейді.",
        visual: "exhibition" as const,
      },
    ];

    for (const item of mediaPlan) {
      const bytes = decodeBase64(DEMO_VISUALS[item.visual] ?? DEMO_IMAGES[item.key]!);
      const storagePath = `${orgIds[item.key]}/demo/${item.key}-demo.webp`;
      const upload = await supabaseAdmin.storage
        .from("media")
        .upload(storagePath, bytes, { contentType: "image/webp", upsert: true });
      if (upload.error) throw new Error(upload.error.message);

      const { data: existing } = await supabaseAdmin
        .from("media_items")
        .select("id")
        .eq("id", item.id)
        .maybeSingle();

      const reviewed = item.status !== "pending";
      const { error } = await supabaseAdmin.from("media_items").upsert({
        id: item.id,
        organization_id: orgIds[item.key],
        uploader_id: adminIds[item.key],
        title: item.title,
        description: item.description,
        storage_path: storagePath,
        event_id: DEMO.events[item.key],
        media_kind: "photo" as const,
        mime_type: "image/webp",
        file_size: bytes.byteLength,
        status: item.status,
        rejection_reason: item.rejection_reason,
        reviewed_by: reviewed ? context.userId : null,
        reviewed_at: reviewed ? now : null,
      });
      if (error) throw new Error(error.message);
      (existing ? reused : created).push(`Медиа: ${item.title} (${item.status})`);
    }


    for (const gallery of [
      { id: DEMO.media.estayGallery, visual: "dance", title: "Шығармашылық ұжымдардың өнері — ДЕМО" },
      { id: DEMO.media.estayGalleryTwo, visual: "venue", title: "Мәдениет сарайының үлкен залы — ДЕМО" },
    ] as const) {
      const bytes = decodeBase64(DEMO_VISUALS[gallery.visual]!);
      const storagePath = `${orgIds.estay}/demo/${gallery.visual}-gallery.webp`;
      const upload = await supabaseAdmin.storage.from("media").upload(storagePath, bytes, { contentType: "image/webp", upsert: true });
      if (upload.error) throw new Error(upload.error.message);
      const { error } = await supabaseAdmin.from("media_items").upsert({ id: gallery.id, organization_id: orgIds.estay, uploader_id: adminIds.estay, event_id: DEMO.events.estay, title: gallery.title, description: "Іс-шара топтамасындағы демонстрациялық фотосурет.", storage_path: storagePath, media_kind: "photo" as const, mime_type: "image/webp", file_size: bytes.byteLength, status: "approved" as const, rejection_reason: null, reviewed_by: context.userId, reviewed_at: now });
      if (error) throw new Error(error.message);
    }

    // Standalone approved posts (no event link) so each organization profile and
    // the public feed always show at least two real records with visible photos.
    const standalonePosts = [
      { id: DEMO.media.estayPostOne, key: "estay" as const, visual: "concert" as const, title: "Естай әндері — кеш — ДЕМО", description: "Мәдениет сарайының шығармашылық ұжымдары дайындаған концерттік бағдарлама." },
      { id: DEMO.media.estayPostTwo, key: "estay" as const, visual: "dombra" as const, title: "Домбыра үйірмесінің сабағы — ДЕМО", description: "Балалар мен жасөспірімдерге арналған домбыра үйірмесінің ашық сабағы." },
      { id: DEMO.media.aksuPostOne, key: "aksu" as const, visual: "dance" as const, title: "Ақсу би ансамблінің жаттығуы — ДЕМО", description: "Халықтық би ансамблінің жаңа қойылымға дайындығы." },
      { id: DEMO.media.aksuPostTwo, key: "aksu" as const, visual: "venue" as const, title: "Мәдениет үйінің жаңартылған залы — ДЕМО", description: "Ақсу мәдениет үйінің көрермендер залы жөндеуден кейін." },
      { id: DEMO.media.bayanaulPostOne, key: "bayanaul" as const, visual: "exhibition" as const, title: "Қолөнер көрмесі — ДЕМО", description: "Баянауыл шеберлерінің ұлттық қолөнер бұйымдары көрмесі." },
      { id: DEMO.media.bayanaulPostTwo, key: "bayanaul" as const, visual: "concert" as const, title: "Ауыл клубындағы мерекелік кеш — ДЕМО", description: "Ауыл тұрғындарына арналған мерекелік мәдени бағдарлама." },
    ];

    for (const post of standalonePosts) {
      const bytes = decodeBase64(DEMO_VISUALS[post.visual]!);
      const storagePath = `${orgIds[post.key]}/demo/${post.id}.webp`;
      const upload = await supabaseAdmin.storage
        .from("media")
        .upload(storagePath, bytes, { contentType: "image/webp", upsert: true });
      if (upload.error) throw new Error(upload.error.message);

      const { data: existing } = await supabaseAdmin
        .from("media_items")
        .select("id")
        .eq("id", post.id)
        .maybeSingle();

      const { error } = await supabaseAdmin.from("media_items").upsert({
        id: post.id,
        organization_id: orgIds[post.key],
        uploader_id: adminIds[post.key],
        event_id: null,
        title: post.title,
        description: post.description,
        storage_path: storagePath,
        media_kind: "photo" as const,
        mime_type: "image/webp",
        file_size: bytes.byteLength,
        status: "approved" as const,
        rejection_reason: null,
        reviewed_by: context.userId,
        reviewed_at: now,
      });
      if (error) throw new Error(error.message);
      (existing ? reused : created).push(`Жазба: ${post.title}`);
    }

    // ---- Structured plan activities (execution tracking demo) --------------
    // Each activity is marked as demo data and is linked only to demo events.
    const monthlyPlan = {
      id: DEMO.plans.estayMonthly,
      organization_id: orgIds.estay,
      title: "Тамыз айының іс-шаралар жоспары — ДЕМО",
      description: "Жылдық жоспардан алынған тамыз айының іс-шаралары.",
      plan_type: "monthly" as const,
      period_year: 2026,
      period_month: 8,
      created_by: adminIds.estay,
    };
    {
      const { data: existing } = await supabaseAdmin.from("plans").select("id").eq("id", monthlyPlan.id).maybeSingle();
      const { error } = await supabaseAdmin.from("plans").upsert(monthlyPlan);
      if (error) throw new Error(error.message);
      const bytes = decodeBase64(DEMO_MONTHLY_XLSX);
      const path = `${orgIds.estay}/${monthlyPlan.id}/demo-monthly-plan.xlsx`;
      const upload = await supabaseAdmin.storage.from("plan-files").upload(path, bytes, { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", upsert: true });
      if (upload.error) throw new Error(upload.error.message);
      await supabaseAdmin.from("plans").update({ file_path: path, file_name: "2026-tamyz-zhospary.xlsx", file_mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", file_size: bytes.byteLength, uploaded_at: now }).eq("id", monthlyPlan.id);
      (existing ? reused : created).push(`Жоспар: ${monthlyPlan.title}`);
    }

    // Past demo events that carry the completion evidence.
    const evidenceEvents: EventInsert[] = [
      {
        id: DEMO.events.estayPast,
        organization_id: orgIds.estay,
        title: "Абай оқулары — ДЕМО",
        description: "Ақын шығармашылығына арналған әдеби кеш өткізілді.",
        event_date: "2026-08-20",
        event_time: "16:00",
        location: "Естай атындағы мәдениет сарайы, кіші зал",
        created_by: adminIds.estay,
        moderation_status: "approved" as const,
        submitted_at: now,
        reviewed_at: now,
        reviewed_by: context.userId,
      },
      {
        id: DEMO.events.aksuPast,
        organization_id: orgIds.aksu,
        title: "Мектеп жасындағы балаларға арналған би байқауы — ДЕМО",
        description: "Аудандық би байқауы өткізілді.",
        event_date: "2026-09-10",
        event_time: "14:00",
        location: "Ақсу қалалық мәдениет үйі",
        created_by: adminIds.aksu,
        moderation_status: "approved" as const,
        submitted_at: now,
        reviewed_at: now,
        reviewed_by: context.userId,
      },
    ];
    for (const event of evidenceEvents) {
      const { data: existing } = await supabaseAdmin.from("events").select("id").eq("id", event.id!).maybeSingle();
      const { error } = await supabaseAdmin.from("events").upsert(event);
      if (error) throw new Error(error.message);
      (existing ? reused : created).push(`Іс-шара: ${event.title}`);
    }

    const evidenceMedia = [
      { id: DEMO.media.estayEvidence, key: "estay" as const, eventId: DEMO.events.estayPast, visual: "venue" as const, title: "Абай оқулары — есеп фотосы (ДЕМО)" },
      { id: DEMO.media.aksuEvidence, key: "aksu" as const, eventId: DEMO.events.aksuPast, visual: "dance" as const, title: "Би байқауы — есеп фотосы (ДЕМО)" },
    ];
    for (const item of evidenceMedia) {
      const bytes = decodeBase64(DEMO_VISUALS[item.visual]!);
      const storagePath = `${orgIds[item.key]}/demo/${item.id}.webp`;
      const upload = await supabaseAdmin.storage.from("media").upload(storagePath, bytes, { contentType: "image/webp", upsert: true });
      if (upload.error) throw new Error(upload.error.message);
      const { error } = await supabaseAdmin.from("media_items").upsert({
        id: item.id,
        organization_id: orgIds[item.key],
        uploader_id: adminIds[item.key],
        event_id: item.eventId,
        title: item.title,
        description: "Орындалуын растауға арналған демонстрациялық материал.",
        storage_path: storagePath,
        media_kind: "photo" as const,
        mime_type: "image/webp",
        file_size: bytes.byteLength,
        status: "approved" as const,
        rejection_reason: null,
        reviewed_by: context.userId,
        reviewed_at: now,
      });
      if (error) throw new Error(error.message);
    }

    const planItems: PlanItemInsert[] = [
      {
        id: DEMO.items.estayCompleted,
        organization_id: orgIds.estay,
        plan_id: DEMO.plans.estay,
        event_id: DEMO.events.estayPast,
        source_item_id: null,
        title: "Абай оқулары — әдеби кеш (ДЕМО)",
        planned_date: "2026-08-20",
        responsible: "Әдеби бөлім меңгерушісі",
        notes: "Жылдық жоспардың тамыз айындағы тармағы.",
        status: "completed" as const,
        completed_on: "2026-08-20",
        completion_report: "Кешке 120 көрермен қатысты, фото есебі тіркелді.",
        submitted_at: now,
        reviewed_at: now,
        reviewed_by: context.userId,
        is_demo: true,
        created_by: adminIds.estay,
      },
      {
        id: DEMO.items.estayOverdue,
        organization_id: orgIds.estay,
        plan_id: DEMO.plans.estay,
        event_id: null,
        source_item_id: null,
        title: "Жазғы демалыс алаңын ашу (ДЕМО)",
        planned_date: "2026-08-05",
        responsible: "Ұйымдастыру бөлімі",
        notes: "Мерзімі өтті, орындалуы туралы есеп жіберілмеген.",
        status: "planned" as const,
        is_demo: true,
        created_by: adminIds.estay,
      },
      {
        id: DEMO.items.estayPlanned,
        organization_id: orgIds.estay,
        plan_id: DEMO.plans.estay,
        event_id: DEMO.events.estay,
        source_item_id: null,
        title: "Ұлттық домбыра күні (ДЕМО)",
        planned_date: "2026-11-15",
        responsible: "Көркемдік жетекші",
        notes: "Болашақ іс-шара. Хабарландыру мақұлданғанымен, орындалуы расталмаған.",
        status: "planned" as const,
        is_demo: true,
        created_by: adminIds.estay,
      },
      {
        id: DEMO.items.estayMonthlyCopy,
        organization_id: orgIds.estay,
        plan_id: DEMO.plans.estayMonthly,
        event_id: null,
        source_item_id: DEMO.items.estayCompleted,
        title: "Абай оқулары — айлық жоспардағы сол тармақ (ДЕМО)",
        planned_date: "2026-08-20",
        responsible: "Әдеби бөлім меңгерушісі",
        notes: "Жылдық тармақтың айлық жоспардағы көшірмесі — жиынтықта екі рет есептелмейді.",
        status: "planned" as const,
        is_demo: true,
        created_by: adminIds.estay,
      },
      {
        id: DEMO.items.aksuAwaiting,
        organization_id: orgIds.aksu,
        plan_id: DEMO.plans.aksu,
        event_id: DEMO.events.aksuPast,
        source_item_id: null,
        title: "Балалар би байқауы (ДЕМО)",
        planned_date: "2026-09-10",
        responsible: "Би ансамблінің жетекшісі",
        notes: "Орындалуы туралы есеп орталық әкімшіліктің растауын күтуде.",
        status: "completion_submitted" as const,
        completed_on: "2026-09-10",
        completion_report: "Байқауға 8 ұжым қатысты, жеңімпаздар марапатталды.",
        submitted_at: now,
        is_demo: true,
        created_by: adminIds.aksu,
      },
      {
        id: DEMO.items.bayanaulCancelled,
        organization_id: orgIds.bayanaul,
        plan_id: DEMO.plans.bayanaul,
        event_id: null,
        source_item_id: null,
        title: "Ауылдық клубтағы ашық концерт (ДЕМО)",
        planned_date: "2026-09-18",
        responsible: "Клуб меңгерушісі",
        notes: null,
        status: "cancelled" as const,
        cancel_reason: "Ауа райының қолайсыздығына байланысты тоқтатылды.",
        cancelled_at: now,
        is_demo: true,
        created_by: adminIds.bayanaul,
      },
      {
        id: DEMO.items.bayanaulReturned,
        organization_id: orgIds.bayanaul,
        plan_id: DEMO.plans.bayanaul,
        event_id: DEMO.events.bayanaul,
        source_item_id: null,
        title: "Ақындар айтысы (ДЕМО)",
        planned_date: "2026-09-05",
        responsible: "Мәдениет ұйымдастырушысы",
        notes: "Орталық әкімшілік есепті түзетуге қайтарды.",
        status: "completion_returned" as const,
        completed_on: "2026-09-05",
        completion_report: "Айтысқа 6 ақын қатысты.",
        review_note: "Есепте қатысушылар саны мен нақты күн нақтыланбаған.",
        submitted_at: now,
        is_demo: true,
        created_by: adminIds.bayanaul,
      },
    ];


    for (const item of planItems) {
      const { data: existing } = await supabaseAdmin.from("plan_items").select("id").eq("id", item.id!).maybeSingle();
      const { error } = await supabaseAdmin.from("plan_items").upsert(item);
      if (error) throw new Error(error.message);
      (existing ? reused : created).push(`Жоспар тармағы: ${item.title}`);
    }

    return { created, reused, credentials };
  });

/** SUPER_ADMIN only: removes only records carrying the stable demo identifiers. */
export const cleanupDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ removed: string[] }> => {
    await assertSuperAdmin(context.supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const removed: string[] = [];

    const { data: itemRows } = await supabaseAdmin
      .from("plan_items")
      .delete()
      .in("id", Object.values(DEMO.items))
      .select("id");
    if (itemRows?.length) removed.push(`Жоспар тармағы: ${itemRows.length}`);

    const mediaIds = Object.values(DEMO.media);
    const { data: mediaRows } = await supabaseAdmin
      .from("media_items")
      .select("id, storage_path")
      .in("id", mediaIds);
    if (mediaRows && mediaRows.length > 0) {
      await supabaseAdmin.storage.from("media").remove(mediaRows.map((m) => m.storage_path));
      await supabaseAdmin.from("media_items").delete().in("id", mediaIds);
      removed.push(`Медиа: ${mediaRows.length}`);
    }

    const { data: eventRows } = await supabaseAdmin
      .from("events")
      .delete()
      .in("id", Object.values(DEMO.events))
      .select("id");
    if (eventRows?.length) removed.push(`Іс-шара: ${eventRows.length}`);

    const { data: planRows } = await supabaseAdmin
      .from("plans")
      .select("file_path")
      .in("id", Object.values(DEMO.plans));
    const planPaths = (planRows ?? []).map((plan) => plan.file_path).filter((path): path is string => !!path);
    if (planPaths.length) await supabaseAdmin.storage.from("plan-files").remove(planPaths);

    const { data: deletedPlanRows } = await supabaseAdmin
      .from("plans")
      .delete()
      .in("id", Object.values(DEMO.plans))
      .select("id");
    if (deletedPlanRows?.length) removed.push(`Жоспар: ${deletedPlanRows.length}`);

    const emails = Object.values(DEMO_ACCOUNTS).map((a) => a.email);
    const { data: demoProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("email", emails);
    for (const profile of demoProfiles ?? []) {
      await supabaseAdmin.auth.admin.deleteUser(profile.id);
      removed.push(`Әкімші: ${profile.email}`);
    }

    const { data: orgRows } = await supabaseAdmin
      .from("organizations")
      .delete()
      .in("id", Object.values(DEMO.orgs))
      .select("name");
    for (const org of orgRows ?? []) removed.push(`Ұйым: ${org.name}`);

    return { removed };
  });
