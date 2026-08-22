import Link from "next/link";
import { clientAnswerRfi } from "@/lib/actions/rfis";
import { requireClientProjectFeature } from "@/lib/portal/access";

export const dynamic = "force-dynamic";

export default async function ClientRfisPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { supabase, project } = await requireClientProjectFeature(id, "rfis");
  const { data: rfis } = await supabase
    .from("project_rfis")
    .select("id, number, title, question, trade, schedule_impact, status, answer, answered_at")
    .eq("project_id", id)
    .in("status", ["open", "answered", "closed"])
    .order("number", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <Link href={`/client/projects/${id}`} className="text-xs font-medium app-muted hover:text-copper">
        ← {project.title}
      </Link>
      <div className="mt-5">
        <span className="app-label">Build</span>
        <h1 className="mt-1 app-h1 !text-[26px]">Questions</h1>
        <p className="mt-2 max-w-xl app-muted">
          The project team needs a written answer before the work can continue.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {(rfis ?? []).map((rfi) => (
          <article key={rfi.id} className="app-card p-5 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="app-label">RFI #{rfi.number}</span>
              <span className={`app-badge ${rfi.status === "open" ? "app-badge-amber" : "app-badge-green"}`}>
                {rfi.status}
              </span>
            </div>
            <h2 className="mt-2 app-h2 !text-[18px]">{rfi.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-navy/80">{rfi.question}</p>
            {rfi.status === "open" && (
              <form
                action={async (formData) => {
                  "use server";
                  await clientAnswerRfi(formData);
                }}
                className="mt-6 space-y-3"
              >
                <input type="hidden" name="id" value={rfi.id} />
                <input type="hidden" name="project_id" value={id} />
                <label className="app-label" htmlFor={`answer-${rfi.id}`}>
                  Your answer
                </label>
                <textarea id={`answer-${rfi.id}`} name="answer" required rows={4} className="w-full" />
                <button type="submit" className="app-btn app-btn-primary">
                  Submit answer
                </button>
              </form>
            )}
            {rfi.answer && (
              <div className="mt-5 app-inset p-4 text-sm">
                <span className="app-label">Recorded answer</span>
                <p className="mt-2 whitespace-pre-wrap">{rfi.answer}</p>
              </div>
            )}
          </article>
        ))}
      </div>

      {!rfis?.length && (
        <div className="app-card mt-8 px-6 py-14 text-center">
          <p className="text-sm app-muted">No questions are waiting on you.</p>
        </div>
      )}
    </div>
  );
}
