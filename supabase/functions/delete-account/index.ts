import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "missing_auth" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await anonClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "invalid_session" }), { status: 401 });
  }
  const userId = userData.user.id;

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const scrambledEmail = `deleted-${userId}@deleted.invalid`;

  try {
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        display_name: "Usuario eliminado",
        avatar_url: null,
        push_token: null,
        email: scrambledEmail,
      })
      .eq("id", userId);
    if (profileError) throw profileError;

    const { error: membersError } = await admin.from("group_members").delete().eq("user_id", userId);
    if (membersError) throw membersError;

    const { error: notificationsError } = await admin
      .from("notifications")
      .delete()
      .eq("recipient_id", userId);
    if (notificationsError) throw notificationsError;

    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      email: scrambledEmail,
      password: randomPassword,
      ban_duration: "876000h",
    });
    if (banError) throw banError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "delete_failed", detail: String(err) }), { status: 500 });
  }
});
