import Link from "next/link";
import Image from "next/image";
import { requireClientProjectFeature } from "@/lib/portal/access";
import { clientConfirmServiceRequest } from "@/lib/actions/service-requests";
import { ClientServiceRequestForm } from "@/components/service/ClientServiceRequestForm";
import { serviceSlaOverdue } from "@/lib/construction/service-status";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  open: "Received",
  assigned: "Assigned",
  in_progress: "In progress",
  waiting_client: "Waiting on you",
  resolved: "Resolved",
  closed: "Closed",
  void: "Void",
};

export default async function ClientServicePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { supabase, project } = await requireClientProjectFeature(id, "service");
  const today = new Date().toISOString().slice(0, 10);
  const { data: requests } = await supabase
    .from("project_service_requests")
    .select(
      "id, number, title, description, location, category, status, sla_due, closeout_note, project_service_images(id, caption, kind)"
    )
    .eq("project_id", id)
    .neq("status", "draft")
    .order("number", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
      <Link href={`/client/projects/${id}`} className="text-xs font-medium app-muted hover:text-copper">
        ← {project.title}
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="app-label">After the build</span>
          <h1 className="mt-1 app-h1 !text-[26px]">Service</h1>
          <p className="mt-2 max-w-xl app-muted">
            Warranty items and extra work after the job. A request is not closed until the work and
            the proof are on the record.
          </p>
        </div>
        <ClientServiceRequestForm projectId={id} />
      </div>

      <div className="mt-8 space-y-5">
        {(requests ?? []).map((row) => {
          const overdue = serviceSlaOverdue({
            status: row.status,
            slaDue: row.sla_due,
            today,
          });
          return (
            <article key={row.id} className="app-card p-5 md:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="app-label">
                  {row.category === "warranty" ? "Warranty" : "Service"} #{row.number}
                </span>
                <span className={`app-badge ${row.status === "waiting_client" ? "app-badge-amber" : "app-badge-neutral"}`}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
                {overdue && <span className="app-badge app-badge-red">Past response date</span>}
              </div>
              <h2 className="mt-2 app-h2 !text-[18px]">{row.title}</h2>
              {row.location && <p className="mt-1 text-xs app-muted">{row.location}</p>}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-navy/80">{row.description}</p>
              {row.project_service_images?.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {row.project_service_images.map((image) => (
                    <figure key={image.id} className="overflow-hidden rounded-lg border border-navy/10">
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={`/api/service-images/${image.id}`}
                          alt={image.caption || row.title}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 340px"
                        />
                      </div>
                    </figure>
                  ))}
                </div>
              )}
              {row.status === "waiting_client" && (
                <form
                  action={async (formData) => {
                    "use server";
                    await clientConfirmServiceRequest(formData);
                  }}
                  className="mt-6 space-y-3"
                >
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <label className="app-label" htmlFor={`confirm-${row.id}`}>
                    Confirm the work is done
                  </label>
                  <textarea
                    id={`confirm-${row.id}`}
                    name="closeout_note"
                    rows={3}
                    className="w-full"
                    placeholder="Looks good — the leak is gone."
                  />
                  <button type="submit" className="app-btn app-btn-primary">
                    Confirm complete
                  </button>
                </form>
              )}
              {row.closeout_note && (
                <div className="mt-5 app-inset p-4 text-sm">
                  <span className="app-label">Closeout</span>
                  <p className="mt-2 whitespace-pre-wrap">{row.closeout_note}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!requests?.length && (
        <div className="app-card mt-8 px-6 py-14 text-center">
          <p className="text-sm app-muted">No service requests yet.</p>
        </div>
      )}
    </div>
  );
}
