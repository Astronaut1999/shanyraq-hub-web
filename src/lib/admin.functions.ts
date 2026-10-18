import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  organization_id: z.string().uuid(),
});

/**
 * SUPER_ADMIN only: creates an ORGANIZATION_ADMIN account and binds it to an
 * organization. Uses the service-role client strictly on the server.
 */
export const createOrganizationAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createAdminSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isSuper, error: roleError } = await context.supabase.rpc("is_super_admin");
    if (roleError) throw new Error(roleError.message);
    if (!isSuper) throw new Error("FORBIDDEN");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "USER_CREATE_FAILED");
    }
    const userId = created.data.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: data.full_name,
      email: data.email,
      organization_id: data.organization_id,
    });
    if (profileError) throw new Error(profileError.message);

    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "ORGANIZATION_ADMIN" });
    if (roleInsertError) throw new Error(roleInsertError.message);

    return { user_id: userId };
  });

const bootstrapSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  setup_token: z.string().min(16),
});

/**
 * One-time creation of the first Shaңyraq SUPER_ADMIN account.
 * Refuses to run once any SUPER_ADMIN exists.
 */
export const bootstrapSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bootstrapSchema.parse(data))
  .handler(async ({ data }) => {
    // Never let an anonymous visitor claim the first SUPER_ADMIN on a new database.
    // This value must be a Cloudflare runtime secret, never a VITE_* build variable.
    const requiredToken = process.env["SHANYRAQ_BOOTSTRAP_TOKEN"];
    if (!requiredToken || requiredToken.length < 16 || data.setup_token !== requiredToken) {
      throw new Error("INVALID_SETUP_TOKEN");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "SUPER_ADMIN");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) throw new Error("ALREADY_INITIALIZED");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "USER_CREATE_FAILED");
    }
    const userId = created.data.user.id;

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: data.full_name, email: data.email });
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "SUPER_ADMIN" });
    if (roleError) throw new Error(roleError.message);

    return { user_id: userId };
  });

export const isPlatformInitialized = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "SUPER_ADMIN");
  return { initialized: (count ?? 0) > 0 };
});
