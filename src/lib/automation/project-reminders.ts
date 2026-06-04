import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "8th Street Construction <hello@8thstreetconstruction.com>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.8thstreetconstruction.com";

function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

async function adminEmails(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.from("profiles").select("email").eq("role", "admin");
  const emails = (data ?? []).map((p) => p.email).filter(Boolean) as string[];
  return emails.length ? emails : [process.env.EMAIL_TO_LEADS || "hello@8thstreetconstruction.com"];
}

async function alreadySent(
  admin: ReturnType<typeof createAdminClient>,
  key: string,
  entityId: string
) {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const { data } = await admin
    .from("project_reminder_log")
    .select("id")
    .eq("reminder_key", key)
    .eq("entity_id", entityId)
    .gte("sent_at", since.toISOString())
    .limit(1);
  return Boolean(data?.length);
}

function rel<T>(v: T | T[] | null): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function daysUntil(dateStr: string, today = new Date()) {
  const d = new Date(dateStr + "T12:00:00");
  const t = new Date(today.toISOString().slice(0, 10) + "T12:00:00");
  return Math.ceil((d.getTime() - t.getTime()) / 86400000);
}

export async function runProjectAutomation() {
  const admin = createAdminClient();
  const client = resend();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  let sent = 0;
  let skipped = 0;

  const admins = await adminEmails(admin);

  // Selection deadlines
  const { data: selections } = await admin
    .from("project_selections")
    .select("id, title, due_date, status, project_id, projects(title, client_id)")
    .not("due_date", "is", null)
    .in("status", ["pending", "client_review", "selected"]);

  for (const sel of selections ?? []) {
    if (!sel.due_date) continue;
    const days = daysUntil(sel.due_date, today);
    if (days > 7 || days < -1) continue;

    const key = days <= 0 ? "selection_overdue" : days <= 3 ? "selection_urgent" : "selection_soon";
    if (await alreadySent(admin, key, sel.id)) {
      skipped++;
      continue;
    }

    const project = rel(sel.projects as { title: string; client_id: string | null } | { title: string; client_id: string | null }[] | null);
    const recipients = [...admins];

    if (sel.status === "client_review" && project?.client_id) {
      const { data: clientProfile } = await admin
        .from("profiles")
        .select("email")
        .eq("id", project.client_id)
        .single();
      if (clientProfile?.email) recipients.push(clientProfile.email);
    }

    const subject =
      days <= 0
        ? `Selection overdue — ${sel.title}`
        : `Selection due in ${days} day(s) — ${sel.title}`;

    if (client) {
      await client.emails.send({
        from: FROM,
        to: [...new Set(recipients)],
        subject: `${project?.title ?? "Project"}: ${subject}`,
        html: `<p>${subject} on <strong>${project?.title}</strong>.</p><p><a href="${SITE}/admin/projects/${sel.project_id}/selections">Open selections →</a></p>`,
        text: subject,
      });
    }

    await admin.from("project_reminder_log").insert({
      project_id: sel.project_id,
      reminder_key: key,
      entity_type: "selection",
      entity_id: sel.id,
      sent_to: recipients.join(", "),
    });
    sent++;
  }

  // Draw / invoice due dates
  const { data: draws } = await admin
    .from("payment_draws")
    .select("id, title, scheduled_date, status, project_id, projects(title, client_id)")
    .eq("status", "invoiced")
    .not("scheduled_date", "is", null);

  for (const draw of draws ?? []) {
    if (!draw.scheduled_date) continue;
    const days = daysUntil(draw.scheduled_date, today);
    if (days > 7 || days < -14) continue;

    const key = days <= 0 ? "draw_overdue" : "draw_due_soon";
    if (await alreadySent(admin, key, draw.id)) {
      skipped++;
      continue;
    }

    const project = rel(draw.projects as { title: string; client_id: string | null } | { title: string; client_id: string | null }[] | null);
    const recipients = [...admins];
    if (project?.client_id) {
      const { data: cp } = await admin.from("profiles").select("email").eq("id", project.client_id).single();
      if (cp?.email) recipients.push(cp.email);
    }

    if (client) {
      await client.emails.send({
        from: FROM,
        to: [...new Set(recipients)],
        subject: `${project?.title}: Draw payment ${days <= 0 ? "overdue" : `due in ${days}d`}`,
        html: `<p>Draw <strong>${draw.title}</strong> ${days <= 0 ? "is overdue" : `due in ${days} days`}.</p><p><a href="${SITE}/client/projects/${draw.project_id}/billing">Client billing →</a></p>`,
        text: `Draw ${draw.title} reminder`,
      });
    }

    await admin.from("project_reminder_log").insert({
      project_id: draw.project_id,
      reminder_key: key,
      entity_type: "draw",
      entity_id: draw.id,
      sent_to: recipients.join(", "),
    });
    sent++;
  }

  // Bid deadlines
  const { data: rfqs } = await admin
    .from("bid_requests")
    .select("id, title, bid_deadline, project_id, projects(title)")
    .eq("status", "open")
    .not("bid_deadline", "is", null);

  for (const rfq of rfqs ?? []) {
    const deadline = rfq.bid_deadline!.slice(0, 10);
    const days = daysUntil(deadline, today);
    if (days > 3 || days < 0) continue;

    const key = "bid_deadline";
    if (await alreadySent(admin, key, rfq.id)) {
      skipped++;
      continue;
    }

    const { data: bids } = await admin
      .from("bids")
      .select("subcontractor_id, subcontractors(profile_id)")
      .eq("bid_request_id", rfq.id)
      .in("status", ["invited", "viewed"]);

    const subEmails: string[] = [];
    for (const b of bids ?? []) {
      const sub = rel(b.subcontractors as { profile_id: string | null } | { profile_id: string | null }[] | null);
      if (sub?.profile_id) {
        const { data: p } = await admin.from("profiles").select("email").eq("id", sub.profile_id).single();
        if (p?.email) subEmails.push(p.email);
      }
    }

    const project = rel(rfq.projects as { title: string } | { title: string }[] | null);
    const recipients = [...new Set([...admins, ...subEmails])];

    if (client && recipients.length) {
      await client.emails.send({
        from: FROM,
        to: recipients,
        subject: `Bid deadline ${days === 0 ? "today" : `in ${days}d`} — ${rfq.title}`,
        html: `<p>RFQ <strong>${rfq.title}</strong> on ${project?.title} closes ${days === 0 ? "today" : `in ${days} days`}.</p><p><a href="${SITE}/subs">Sub portal →</a></p>`,
        text: `Bid deadline: ${rfq.title}`,
      });
    }

    await admin.from("project_reminder_log").insert({
      project_id: rfq.project_id,
      reminder_key: key,
      entity_type: "bid_request",
      entity_id: rfq.id,
      sent_to: recipients.join(", "),
    });
    sent++;
  }

  // Punch items overdue
  const { data: punch } = await admin
    .from("punch_list_items")
    .select("id, title, due_date, project_id, projects(title)")
    .neq("status", "complete")
    .not("due_date", "is", null)
    .lt("due_date", todayStr);

  for (const item of punch ?? []) {
    const key = "punch_overdue";
    if (await alreadySent(admin, key, item.id)) {
      skipped++;
      continue;
    }

    const project = rel(item.projects as { title: string } | { title: string }[] | null);
    if (client) {
      await client.emails.send({
        from: FROM,
        to: admins,
        subject: `Punch item overdue — ${item.title}`,
        html: `<p><strong>${item.title}</strong> on ${project?.title} is past due.</p><p><a href="${SITE}/admin/projects/${item.project_id}/punch-list">Punch list →</a></p>`,
        text: `Punch overdue: ${item.title}`,
      });
    }

    await admin.from("project_reminder_log").insert({
      project_id: item.project_id,
      reminder_key: key,
      entity_type: "punch",
      entity_id: item.id,
      sent_to: admins.join(", "),
    });
    sent++;
  }

  return { sent, skipped };
}
