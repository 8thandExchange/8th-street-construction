import { SubmitButton } from "@/components/admin/SubmitButton";
import { recordNoticeToProceed } from "@/lib/actions/billing";
import {
  hasNoticeToProceed,
  requiresNoticeToProceed,
  type NoticeToProceedState,
} from "@/lib/project/funding";

function longDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * The notice-to-proceed gate, shown before anyone tries to bill rather than
 * as an error after. Renders nothing on a privately funded job, where the
 * notice does not apply.
 */
export function NoticeToProceedCard({
  projectId,
  project,
}: {
  projectId: string;
  project: NoticeToProceedState & { notice_to_proceed_note?: string | null };
}) {
  if (!requiresNoticeToProceed(project)) return null;

  const onFile = hasNoticeToProceed(project);

  if (onFile) {
    return (
      <div className="hub-panel border-emerald-600/25 bg-emerald-600/[0.04] p-5 md:p-6 mb-8">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-emerald-700">
          Notice to proceed on file
        </p>
        <p className="mt-2 text-sm text-ink/70 leading-relaxed">
          Augusta issued the notice on{" "}
          <strong className="text-ink">{longDate(project.notice_to_proceed_at!)}</strong>. This job
          is clear to invoice.
          {project.notice_to_proceed_note ? ` ${project.notice_to_proceed_note}` : ""}
        </p>
        <form action={recordNoticeToProceed} className="mt-4">
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="notice_to_proceed_at" value="" />
          <SubmitButton className="app-btn app-btn-secondary" pendingLabel="Clearing…">
            Clear notice
          </SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <div className="hub-panel border-amber-600/30 bg-amber-500/[0.06] p-5 md:p-6 mb-8">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-amber-700">
        Invoicing held — no notice to proceed
      </p>
      <p className="mt-2 text-sm text-ink/70 leading-relaxed max-w-2xl">
        Augusta will not reimburse a draw billed before it issues the notice to proceed. Invoices on
        this job can be drafted and edited, but not sent, until the notice is recorded here.
      </p>
      <form action={recordNoticeToProceed} className="mt-4 flex flex-wrap items-end gap-4">
        <input type="hidden" name="project_id" value={projectId} />
        <div>
          <label className="field-label" htmlFor="ntp-date">
            Date issued
          </label>
          <input
            id="ntp-date"
            type="date"
            name="notice_to_proceed_at"
            required
            className="field-input !w-44"
          />
        </div>
        <div className="grow min-w-56">
          <label className="field-label" htmlFor="ntp-note">
            Reference / who sent it
          </label>
          <input
            id="ntp-note"
            name="notice_to_proceed_note"
            className="field-input"
            placeholder="e.g. Augusta Housing & Community Development, NTP #2026-114"
          />
        </div>
        <SubmitButton pendingLabel="Recording…">Record notice</SubmitButton>
      </form>
    </div>
  );
}
