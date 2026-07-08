import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintPacketButton } from "@/components/billing/PrintPacketButton";
import {
  computeDrawPacket,
  defaultPacketDrawId,
  type PacketDrawInput,
} from "@/lib/billing/draw-packet";
import { loadGanttMilestones } from "@/lib/schedule/load-gantt-milestones";
import { isHudHomeProject } from "@/lib/project/funding";
import { MILESTONE_STATUS_LABELS } from "@/lib/project/labels";

export const dynamic = "force-dynamic";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function DrawPacketPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ draw?: string; retainage?: string }>;
}) {
  const { id } = await props.params;
  const { draw: drawParam, retainage: retainageParam } = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/admin`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, slug, street_address, location, contract_value, client_id, funding_type, hud_grant_year"
    )
    .eq("id", id)
    .single();
  if (!project) notFound();

  const [{ data: draws }, { data: changeOrders }, clientRes, milestones] = await Promise.all([
    supabase
      .from("payment_draws")
      .select("id, draw_number, title, description, amount, status, scheduled_date")
      .eq("project_id", id)
      .order("draw_number"),
    supabase
      .from("change_orders")
      .select("cost_impact, status")
      .eq("project_id", id)
      .eq("status", "approved"),
    project.client_id
      ? supabase
          .from("profiles")
          .select("first_name, last_name, organization_name, email")
          .eq("id", project.client_id)
          .single()
      : Promise.resolve({ data: null }),
    loadGanttMilestones(supabase, id),
  ]);

  const drawInputs: PacketDrawInput[] = (draws ?? []).map((d) => ({
    ...d,
    amount: Number(d.amount),
  }));
  if (!drawInputs.length) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-display text-2xl text-ink">No payment draws yet</h1>
        <p className="mt-3 text-sm text-ink/60 leading-relaxed">
          Set up the draw schedule on the project&apos;s billing page first — the draw packet is
          generated from the schedule of values.
        </p>
        <Link href={`/admin/projects/${id}/billing`} className="mt-6 inline-block text-sm text-copper underline">
          Go to billing
        </Link>
      </main>
    );
  }

  const currentDrawId = drawParam ?? defaultPacketDrawId(drawInputs)!;
  const retainagePct = Math.min(Math.max(Number(retainageParam ?? 0) || 0, 0), 50);
  const changeOrderTotal = (changeOrders ?? []).reduce(
    (sum, co) => sum + Number(co.cost_impact ?? 0),
    0
  );

  const packet = computeDrawPacket({
    contractValue: Number(project.contract_value ?? 0),
    changeOrderTotal,
    draws: drawInputs,
    currentDrawId,
    retainagePct,
  });
  if ("error" in packet) notFound();

  const client = clientRes?.data;
  const ownerName =
    client?.organization_name ||
    [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
    "Owner";
  const today = new Date();
  const periodTo = packet.currentDraw.scheduled_date
    ? new Date(`${packet.currentDraw.scheduled_date}T12:00:00`)
    : today;
  const hud = isHudHomeProject(project);

  const summaryRows: { label: string; value: number; strong?: boolean }[] = [
    { label: "1. Original contract sum", value: packet.summary.originalContractSum },
    { label: "2. Net change by approved change orders", value: packet.summary.netChangeOrders },
    { label: "3. Contract sum to date (1 + 2)", value: packet.summary.contractSumToDate },
    { label: "4. Total completed to date", value: packet.summary.totalCompletedToDate },
    {
      label: `5. Retainage (${packet.summary.retainagePct}% of completed work)`,
      value: packet.summary.retainageAmount,
    },
    { label: "6. Total earned less retainage (4 − 5)", value: packet.summary.totalEarnedLessRetainage },
    { label: "7. Less previous payments certified", value: packet.summary.lessPreviousCertificates },
    { label: "8. Current payment due (6 − 7)", value: packet.summary.currentPaymentDue, strong: true },
    {
      label: "9. Balance to finish, including retainage (3 − 6)",
      value: packet.summary.balanceToFinishIncludingRetainage,
    },
  ];

  return (
    <main className="min-h-screen bg-stone-100 print:bg-white">
      {/* Screen-only controls */}
      <div className="mx-auto max-w-4xl px-6 pt-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink/60">
            <span className="font-medium text-ink">Draw:</span>
            {drawInputs.map((d) => (
              <Link
                key={d.id}
                href={`/print/draw-packet/${id}?draw=${d.id}&retainage=${retainagePct}`}
                className={`rounded px-2 py-1 ${
                  d.id === currentDrawId ? "bg-navy text-white" : "hover:bg-ink/5"
                }`}
              >
                #{d.draw_number}
              </Link>
            ))}
            <span className="ml-3 font-medium text-ink">Retainage:</span>
            {[0, 5, 10].map((r) => (
              <Link
                key={r}
                href={`/print/draw-packet/${id}?draw=${currentDrawId}&retainage=${r}`}
                className={`rounded px-2 py-1 ${
                  r === retainagePct ? "bg-navy text-white" : "hover:bg-ink/5"
                }`}
              >
                {r}%
              </Link>
            ))}
          </div>
          <PrintPacketButton />
        </div>
      </div>

      {/* The document */}
      <div className="mx-auto my-6 max-w-4xl bg-white px-10 py-12 shadow-sm print:my-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="border-b-2 border-black pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-black">
                Application and Certificate for Payment
              </h1>
              <p className="mt-0.5 text-[12px] text-black/70">
                Prepared in the format of AIA Document G702/G703 · Draw No.{" "}
                {packet.currentDraw.draw_number}
                {hud && " · HUD HOME Program (24 CFR Part 92)"}
              </p>
            </div>
            <div className="text-right text-[12px] leading-relaxed text-black/80">
              <div className="font-semibold text-black">8th Street Construction</div>
              <div>A division of 8th and Exchange Capital</div>
              <div>Augusta, Georgia</div>
            </div>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-x-10 gap-y-1.5 text-[12.5px] leading-relaxed text-black">
          <div>
            <span className="text-black/55">To (Owner):</span> <strong>{ownerName}</strong>
          </div>
          <div>
            <span className="text-black/55">Application date:</span> {fmtDate(today)}
          </div>
          <div>
            <span className="text-black/55">Project:</span>{" "}
            <strong>{project.street_address || project.title}</strong>
            {project.location ? ` — ${project.location}` : ""}
          </div>
          <div>
            <span className="text-black/55">Period to:</span> {fmtDate(periodTo)}
          </div>
          <div>
            <span className="text-black/55">From (Contractor):</span> 8th Street Construction
          </div>
          <div>
            <span className="text-black/55">Application no.:</span>{" "}
            {packet.currentDraw.draw_number}
            {hud && project.hud_grant_year ? ` · Grant year ${project.hud_grant_year}` : ""}
          </div>
        </section>

        {/* G702 summary */}
        <section className="mt-6">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-black">
            Contractor&apos;s Application for Payment
          </h2>
          <table className="mt-2 w-full text-[12.5px]">
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.label} className="border-b border-black/15">
                  <td className={`py-1.5 pr-4 ${row.strong ? "font-bold" : ""} text-black`}>
                    {row.label}
                  </td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${
                      row.strong ? "font-bold text-black" : "text-black/85"
                    }`}
                  >
                    {usd(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* G703 continuation sheet */}
        <section className="mt-8 break-inside-avoid">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-black">
            Continuation Sheet — Schedule of Values
          </h2>
          <table className="mt-2 w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="border-b-2 border-black text-left text-black">
                <th className="py-1.5 pr-2 font-semibold">No.</th>
                <th className="py-1.5 pr-2 font-semibold">Description of work</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Scheduled value</th>
                <th className="py-1.5 pr-2 text-right font-semibold">Previous applications</th>
                <th className="py-1.5 pr-2 text-right font-semibold">This period</th>
                <th className="py-1.5 pr-2 text-right font-semibold">%</th>
                <th className="py-1.5 text-right font-semibold">Balance to finish</th>
              </tr>
            </thead>
            <tbody>
              {packet.lines.map((line) => (
                <tr
                  key={line.itemNo}
                  className={`border-b border-black/15 text-black/85 ${
                    line.isCurrent ? "bg-black/[0.045] font-medium text-black" : ""
                  }`}
                >
                  <td className="py-1.5 pr-2 tabular-nums">{line.itemNo}</td>
                  <td className="py-1.5 pr-2">{line.description}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{usd(line.scheduledValue)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {usd(line.previousApplications)}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{usd(line.thisPeriod)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{line.percentComplete}%</td>
                  <td className="py-1.5 text-right tabular-nums">{usd(line.balanceToFinish)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-black font-bold text-black">
                <td className="py-2 pr-2" colSpan={2}>
                  Totals
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{usd(packet.totals.scheduledValue)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {usd(packet.totals.previousApplications)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{usd(packet.totals.thisPeriod)}</td>
                <td className="py-2 pr-2" />
                <td className="py-2 text-right tabular-nums">{usd(packet.totals.balanceToFinish)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Phase progress appendix */}
        {milestones.length > 0 && (
          <section className="mt-8 break-inside-avoid">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-black">
              Construction Progress by Phase
            </h2>
            <table className="mt-2 w-full text-[11.5px]">
              <thead>
                <tr className="border-b-2 border-black text-left text-black">
                  <th className="py-1.5 pr-2 font-semibold">Phase</th>
                  <th className="py-1.5 pr-2 font-semibold">Status</th>
                  <th className="py-1.5 pr-2 font-semibold">Target date</th>
                  <th className="py-1.5 text-right font-semibold">Tasks complete</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m) => (
                  <tr key={m.id} className="border-b border-black/15 text-black/85">
                    <td className="py-1.5 pr-2">{m.title}</td>
                    <td className="py-1.5 pr-2">
                      {MILESTONE_STATUS_LABELS[m.status] ?? m.status}
                    </td>
                    <td className="py-1.5 pr-2">
                      {m.target_date
                        ? new Date(`${m.target_date}T12:00:00`).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {m.status === "completed" ? "100%" : m.progress != null ? `${m.progress}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[10.5px] text-black/55">
              Dated progress photos and daily field logs supporting this application are maintained
              in the 8th Street Construction project portal and are available on request.
            </p>
          </section>
        )}

        {/* Certification + signatures */}
        <section className="mt-8 break-inside-avoid text-[12px] leading-relaxed text-black/85">
          <p>
            The undersigned Contractor certifies that, to the best of the Contractor&apos;s
            knowledge, information, and belief, the work covered by this application for payment
            has been completed in accordance with the contract documents; that all amounts
            previously paid to the Contractor under prior applications have been applied to the
            work; and that the current payment shown herein is now due.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-10">
            {[
              { title: "Contractor — 8th Street Construction", sub: "Signature / Date" },
              { title: `Owner — ${ownerName}`, sub: "Signature / Date" },
              ...(hud
                ? [
                    {
                      title: "Grant Administrator — Augusta Housing & Community Development",
                      sub: "Certified for payment / Date",
                    },
                    { title: "Inspection verified by", sub: "Signature / Date" },
                  ]
                : []),
            ].map((sig) => (
              <div key={sig.title}>
                <div className="h-10 border-b border-black" />
                <div className="mt-1 text-[11px] font-semibold text-black">{sig.title}</div>
                <div className="text-[10.5px] text-black/55">{sig.sub}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
