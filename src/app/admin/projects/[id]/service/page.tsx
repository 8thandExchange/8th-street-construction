import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  assignServiceRequest,
  createServiceRequest,
  setServiceRequestStatus,
} from "@/lib/actions/service-requests";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { serviceSlaOverdue } from "@/lib/construction/service-status";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  draft: "app-badge-neutral",
  open: "app-badge-amber",
  assigned: "app-badge-blue",
  in_progress: "app-badge-blue",
  waiting_client: "app-badge-amber",
  resolved: "app-badge-green",
  closed: "app-badge-green",
  void: "app-badge-red",
};

export default async function ProjectServicePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: project } = await supabase.from("projects").select("id, title").eq("id", id).single();
  if (!project) notFound();

  const [{ data: requests }, { data: vendors }, { data: owners }] = await Promise.all([
    supabase
      .from("project_service_requests")
      .select("*, project_service_images(id, caption, kind)")
      .eq("project_id", id)
      .order("number", { ascending: false }),
    supabase.from("vendors").select("id, name").order("name"),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("role", "admin")
      .order("first_name"),
  ]);

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h2 className="app-h2">Warranty and service</h2>
        <p className="mt-2 max-w-2xl text-sm app-muted">
          After-close items for {project.title}. A request is not done until someone owns it, the
          SLA is visible, and closeout proof is on the record.
        </p>
      </div>

      <section className="app-card space-y-4 p-6">
        <h3 className="app-h2 !text-[16px]">New request</h3>
        <form action={createServiceRequest} className="space-y-4">
          <input type="hidden" name="project_id" value={id} />
          <div className="grid gap-4 md:grid-cols-[1fr_160px_180px]">
            <div>
              <label className="field-label">Title *</label>
              <input name="title" required className="field-input" placeholder="Kitchen faucet drip" />
            </div>
            <div>
              <label className="field-label">Type</label>
              <select name="category" className="field-input" defaultValue="warranty">
                <option value="warranty">Warranty</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label className="field-label">Respond by</label>
              <input type="date" name="sla_due" className="field-input" />
            </div>
          </div>
          <div>
            <label className="field-label">Description *</label>
            <textarea name="description" required rows={3} className="field-input" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="field-label">Location</label>
              <input name="location" className="field-input" />
            </div>
            <div>
              <label className="field-label">Owner</label>
              <select name="owner_id" className="field-input" defaultValue="">
                <option value="">— unassigned —</option>
                {(owners ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {[person.first_name, person.last_name].filter(Boolean).join(" ") || "Admin"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Vendor</label>
              <select name="vendor_id" className="field-input" defaultValue="">
                <option value="">— none —</option>
                {(vendors ?? []).map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">Evidence photo</label>
            <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" className="field-input" />
          </div>
          <SubmitButton>Create request</SubmitButton>
        </form>
      </section>

      <ul className="space-y-4">
        {(requests ?? []).map((row) => {
          const overdue = serviceSlaOverdue({
            status: row.status,
            slaDue: row.sla_due,
            today,
          });
          const owner = (owners ?? []).find((person) => person.id === row.owner_id);
          const vendor = (vendors ?? []).find((item) => item.id === row.vendor_id);
          return (
            <li key={row.id} className="app-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs app-muted">#{row.number}</span>
                <h3 className="app-h2 !text-[15px]">{row.title}</h3>
                <span className={`app-badge ${STATUS_BADGE[row.status] ?? "app-badge-neutral"}`}>
                  {row.status.replaceAll("_", " ")}
                </span>
                <span className="text-xs app-muted">{row.category}</span>
                {overdue && <span className="app-badge app-badge-red">SLA overdue</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-navy/80">{row.description}</p>
              <p className="mt-2 text-xs app-muted">
                {[
                  row.location,
                  owner
                    ? `Owner ${[owner.first_name, owner.last_name].filter(Boolean).join(" ")}`
                    : "No owner",
                  vendor ? `Vendor ${vendor.name}` : null,
                  row.sla_due ? `Due ${row.sla_due}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {row.project_service_images?.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {row.project_service_images.map((image: { id: string; caption: string | null; kind: string }) => (
                    <figure key={image.id} className="overflow-hidden rounded-lg border border-navy/10">
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={`/api/service-images/${image.id}`}
                          alt={image.caption || row.title}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="220px"
                        />
                      </div>
                      <figcaption className="px-2 py-1 text-[11px] app-muted">{image.kind}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              {row.closeout_note && (
                <p className="mt-3 app-inset p-3 text-sm">
                  <span className="app-label">Closeout</span>
                  <span className="mt-1 block whitespace-pre-wrap">{row.closeout_note}</span>
                </p>
              )}

              {["open", "assigned", "in_progress"].includes(row.status) && (
                <form action={assignServiceRequest} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <select name="owner_id" className="field-input" defaultValue={row.owner_id ?? ""}>
                    <option value="">— owner —</option>
                    {(owners ?? []).map((person) => (
                      <option key={person.id} value={person.id}>
                        {[person.first_name, person.last_name].filter(Boolean).join(" ") || "Admin"}
                      </option>
                    ))}
                  </select>
                  <select name="vendor_id" className="field-input" defaultValue={row.vendor_id ?? ""}>
                    <option value="">— vendor —</option>
                    {(vendors ?? []).map((vendorRow) => (
                      <option key={vendorRow.id} value={vendorRow.id}>
                        {vendorRow.name}
                      </option>
                    ))}
                  </select>
                  <SubmitButton className="app-btn app-btn-secondary !h-10 !text-xs">Save assignment</SubmitButton>
                </form>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {row.status === "open" || row.status === "assigned" ? (
                  <form action={setServiceRequestStatus}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="status" value="in_progress" />
                    <SubmitButton className="app-btn app-btn-secondary !h-8 !text-xs">Start work</SubmitButton>
                  </form>
                ) : null}
                {row.status === "in_progress" && (
                  <form action={setServiceRequestStatus}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="status" value="waiting_client" />
                    <SubmitButton className="app-btn app-btn-secondary !h-8 !text-xs">
                      Ask client to confirm
                    </SubmitButton>
                  </form>
                )}
              </div>

              {["in_progress", "waiting_client", "resolved"].includes(row.status) && (
                <form action={setServiceRequestStatus} className="mt-4 space-y-2">
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <textarea
                    name="closeout_note"
                    rows={2}
                    className="field-input"
                    placeholder="What was done, and how we know it is finished"
                    defaultValue={row.closeout_note ?? ""}
                  />
                  <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" className="field-input" />
                  <div className="flex flex-wrap gap-2">
                    {row.status !== "resolved" && (
                      <button type="submit" name="status" value="resolved" className="app-btn app-btn-primary !h-8 !text-xs">
                        Mark resolved
                      </button>
                    )}
                    {row.status === "resolved" && (
                      <button type="submit" name="status" value="closed" className="app-btn app-btn-primary !h-8 !text-xs">
                        Close request
                      </button>
                    )}
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
