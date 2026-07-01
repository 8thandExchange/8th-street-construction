/** Print auth cookie for localhost browser testing. Run: npx tsx scripts/print-auth-cookie.ts [email] */
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2] || "troy@8thstreetconstruction.com";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !link.properties?.hashed_token) {
    console.error(error?.message ?? "No token");
    process.exit(1);
  }

  const auth = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: sess, error: sessErr } = await auth.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });
  if (sessErr || !sess.session) {
    console.error(sessErr?.message ?? "No session");
    process.exit(1);
  }

  const ref = new URL(url).hostname.split(".")[0];
  const name = `sb-${ref}-auth-token`;
  const value = JSON.stringify({
    access_token: sess.session.access_token,
    refresh_token: sess.session.refresh_token,
    expires_at: sess.session.expires_at,
    expires_in: sess.session.expires_in,
    token_type: "bearer",
    user: sess.session.user,
  });

  console.log(JSON.stringify({ name, value, email }));
}

main();
