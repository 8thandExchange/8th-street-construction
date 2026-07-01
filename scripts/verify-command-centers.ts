/**
 * Command center verification — data loaders + route smoke tests.
 * Run: npx tsx scripts/verify-command-centers.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
}

async function main() {
  // ── Database: projects exist ──────────────────────────────────────────
  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("id, title, slug, status, client_id, contract_value")
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (projErr) {
    fail("Fetch projects", projErr.message);
  } else if (!projects?.length) {
    fail("Fetch projects", "No projects found");
  } else {
    pass("Fetch projects", `${projects.length} active project(s)`);
  }

  const project = projects?.[0];
  if (!project) {
    printReport();
    process.exit(1);
  }

  pass("Sample project", `${project.title} (${project.id.slice(0, 8)}…)`);

  // ── Related data for dashboard ────────────────────────────────────────
  const tables = [
    "project_milestones",
    "project_tasks",
    "project_updates",
    "project_daily_logs",
    "project_messages",
    "invoices",
    "payment_draws",
    "change_orders",
    "project_selections",
    "project_documents",
    "punch_list_items",
  ] as const;

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id);
    if (error) {
      fail(`Table ${table}`, error.message);
    } else {
      pass(`Table ${table}`, `${count ?? 0} row(s) for sample project`);
    }
  }

  // ── Client-linked project ─────────────────────────────────────────────
  const clientProject = projects?.find((p) => p.client_id) ?? project;
  if (clientProject.client_id) {
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("email, role")
      .eq("id", clientProject.client_id)
      .single();
    pass(
      "Client link",
      clientProfile ? `${clientProfile.email} (${clientProfile.role})` : "profile found"
    );
  } else {
    fail("Client link", "No project with client_id — client portal test limited");
  }

  // ── HTTP smoke tests (no auth) ─────────────────────────────────────────
  const routes: { path: string; expect: number | "redirect" }[] = [
    { path: "/", expect: 200 },
    { path: "/login", expect: 200 },
    { path: "/admin", expect: "redirect" },
    { path: "/admin/projects", expect: "redirect" },
    { path: `/admin/projects/${project.id}`, expect: "redirect" },
    { path: "/client", expect: "redirect" },
    { path: `/client/projects/${clientProject.id}`, expect: "redirect" },
  ];

  for (const { path, expect } of routes) {
    try {
      const res = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
      const status = res.status;
      if (expect === "redirect") {
        if (status === 307 || status === 308 || status === 302 || status === 301) {
          const loc = res.headers.get("location") ?? "";
          pass(`GET ${path}`, `→ ${status} ${loc.slice(0, 60)}`);
        } else {
          fail(`GET ${path}`, `Expected redirect, got ${status}`);
        }
      } else if (status === expect) {
        pass(`GET ${path}`, `${status}`);
      } else {
        fail(`GET ${path}`, `Expected ${expect}, got ${status}`);
      }
    } catch (e) {
      fail(`GET ${path}`, e instanceof Error ? e.message : String(e));
    }
  }

  // ── Page content checks (unauthenticated — login redirect target) ───────
  try {
    const adminRes = await fetch(`${baseUrl}/admin/projects/${project.id}`, {
      redirect: "manual",
    });
    const loc = adminRes.headers.get("location") ?? "";
    if (loc.includes("/login")) {
      pass("Admin auth gate", "Unauthenticated users sent to login");
    } else {
      fail("Admin auth gate", `Unexpected redirect: ${loc}`);
    }
  } catch (e) {
    fail("Admin auth gate", e instanceof Error ? e.message : String(e));
  }

  printReport();
  const failed = checks.filter((c) => !c.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

function printReport() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  Command Center Verification Report");
  console.log("══════════════════════════════════════════════════\n");

  const maxName = Math.max(...checks.map((c) => c.name.length), 10);
  for (const c of checks) {
    const icon = c.ok ? "✓" : "✗";
    const pad = c.name.padEnd(maxName);
    const detail = c.detail ? ` — ${c.detail}` : "";
    console.log(`  ${icon}  ${pad}${detail}`);
  }

  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n  ${passed} passed, ${failed} failed (${checks.length} total)\n`);
}

main();
