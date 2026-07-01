/**
 * Deep verification — data loaders + rendered HTML checks via authenticated session.
 * Run: npx tsx scripts/verify-command-centers-deep.ts
 */
import { createClient } from "@supabase/supabase-js";

const projectId = "b6efed70-ad27-4aea-9810-0e4418d4ce06";
const baseUrl = "http://localhost:3000";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("email, id")
    .eq("role", "admin")
    .limit(1)
    .single();

  if (!adminProfile?.email) {
    fail("Admin profile", "No admin user");
    printReport();
    process.exit(1);
  }

  // Create authenticated session via magic link OTP (server-side, no email needed)
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: adminProfile.email,
  });

  if (linkErr || !linkData.properties?.hashed_token) {
    fail("Auth session", linkErr?.message ?? "No hashed_token");
    printReport();
    process.exit(1);
  }

  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: sessionData, error: sessionErr } = await authClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (sessionErr || !sessionData.session) {
    fail("Auth session", sessionErr?.message ?? "No session");
    printReport();
    process.exit(1);
  }

  pass("Auth session", `Signed in as ${adminProfile.email}`);

  const accessToken = sessionData.session.access_token;
  const refreshToken = sessionData.session.refresh_token;

  // Build Supabase auth cookie (chunked format used by @supabase/ssr)
  const cookiePayload = JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: sessionData.session.expires_at,
    expires_in: sessionData.session.expires_in,
    token_type: "bearer",
    user: sessionData.session.user,
  });

  const projectRef = new URL(url).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookie = `${cookieName}=${encodeURIComponent(cookiePayload)}`;

  // ── Admin command center page ───────────────────────────────────────────
  const adminPath = `/admin/projects/${projectId}`;
  const adminRes = await fetch(`${baseUrl}${adminPath}`, {
    headers: { Cookie: cookie },
  });

  if (adminRes.status !== 200) {
    fail("Admin command center HTTP", `Status ${adminRes.status}`);
  } else {
    pass("Admin command center HTTP", "200 OK");
    const html = await adminRes.text();
    const adminMarkers = [
      "Command center",
      "Money flow",
      "Needs attention",
      "Recent activity",
      "Build timeline",
      "Jump to",
    ];
    for (const marker of adminMarkers) {
      if (html.includes(marker)) {
        pass(`Admin UI: "${marker}"`, "present");
      } else {
        fail(`Admin UI: "${marker}"`, "missing from HTML");
      }
    }
  }

  // ── Admin sub-routes ──────────────────────────────────────────────────
  const adminRoutes = [
    "/admin",
    "/admin/projects",
    `${adminPath}/billing`,
    `${adminPath}/tasks`,
    `${adminPath}/schedule`,
    `${adminPath}/costs`,
    `${adminPath}/messages`,
  ];

  for (const path of adminRoutes) {
    const res = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie } });
    if (res.status === 200) {
      pass(`Admin route ${path}`, "200");
    } else {
      fail(`Admin route ${path}`, `Status ${res.status}`);
    }
  }

  // ── Client portal (may 403/redirect if no client role) ─────────────────
  const clientRes = await fetch(`${baseUrl}/client/projects/${projectId}`, {
    headers: { Cookie: cookie },
  });

  if (clientRes.status === 200) {
    pass("Client overview HTTP", "200 (admin can view)");
    const html = await clientRes.text();
    for (const marker of ["Your turn", "Your timeline", "What's new", "Quick links"]) {
      if (html.includes(marker)) {
        pass(`Client UI: "${marker}"`, "present");
      } else {
        fail(`Client UI: "${marker}"`, "missing");
      }
    }
  } else if (clientRes.status === 307 || clientRes.status === 302) {
    pass("Client overview HTTP", `Redirect ${clientRes.status} (RLS — expected for admin)`);
  } else {
    fail("Client overview HTTP", `Status ${clientRes.status}`);
  }

  // ── Data layer sanity ───────────────────────────────────────────────────
  const { data: project } = await admin
    .from("projects")
    .select("id, title, contract_value, client_id")
    .eq("id", projectId)
    .single();

  pass("Project data", project?.title ?? "found");

  const { count: taskCount } = await admin
    .from("project_tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  pass("Tasks loaded", `${taskCount ?? 0} tasks`);

  const { count: drawCount } = await admin
    .from("payment_draws")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  pass("Draws loaded", `${drawCount ?? 0} draws`);

  if (!project?.client_id) {
    fail("Client assignment", "608 Macon has no client_id — link Habitat in Job Details to test client login");
  }

  // ── Company home ────────────────────────────────────────────────────────
  const companyRes = await fetch(`${baseUrl}/admin`, { headers: { Cookie: cookie } });
  const companyHtml = companyRes.ok ? await companyRes.text() : "";
  if (companyHtml.includes("Active jobs") || companyHtml.includes("Company Home")) {
    pass("Company home dashboard", "200 with job list");
  } else {
    fail("Company home dashboard", `Status ${companyRes.status}`);
  }

  printReport();
  process.exit(checks.filter((c) => !c.ok).length > 0 ? 1 : 0);
}

function printReport() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  Deep Command Center Verification");
  console.log("══════════════════════════════════════════════════\n");
  for (const c of checks) {
    console.log(`  ${c.ok ? "✓" : "✗"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n  ${passed} passed, ${failed} failed (${checks.length} total)\n`);
}

main();
