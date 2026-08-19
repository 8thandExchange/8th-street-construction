import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { NewContractForm } from "@/components/admin/NewContractForm";
import { deleteProjectDocument } from "@/lib/actions/documents";

export const dynamic = "force-dynamic";

type ContractRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  visibility: string;
  file_size_bytes: number | null;
  created_at: string;
  project: {
    title: string;
    street_address: string | null;
  } | null;
};

export default async function ContractsPage() {
  const supabase = await createClient();

  const [{ data: rows }, { data: projects }] = await Promise.all([
    supabase
      .from("project_documents")
      .select(
        "id, project_id, title, description, visibility, file_size_bytes, created_at, project:projects(title, street_address)"
      )
      .eq("category", "contract")
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id, title").order("title"),
  ]);

  const contracts = (rows ?? []) as unknown as ContractRow[];

  const groups = new Map<string, ContractRow[]>();
  for (const c of contracts) {
    const list = groups.get(c.project_id) ?? [];
    list.push(c);
    groups.set(c.project_id, list);
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="app-h1">Contracts</h1>
          <p className="text-sm text-ink/60 mt-2 max-w-2xl">
            Every contract across every job, in one place. Files are private —
            downloads use signed links and only admins see this page. Contracts
            uploaded on a job&apos;s Files tab with the Contract category show
            up here automatically.
          </p>
        </div>
        <NewContractForm projects={projects ?? []} />
      </div>

      <div className="space-y-10">
        {[...groups.entries()].map(([projectId, docs]) => {
          const project = docs[0]?.project;
          return (
            <section key={projectId}>
              <div className="flex items-baseline justify-between gap-4 border-b border-ink/15 pb-2 mb-3">
                <h2 className="font-medium text-ink">
                  {project?.title ?? "Unknown job"}
                  {project?.street_address ? (
                    <span className="text-ink/50 font-normal">
                      {" "}
                      · {project.street_address}
                    </span>
                  ) : null}
                </h2>
                <Link
                  href={`/admin/projects/${projectId}/documents`}
                  className="font-mono text-[10px] tracking-[0.15em] uppercase text-copper hover:underline shrink-0"
                >
                  Job files
                </Link>
              </div>
              <ul className="space-y-3">
                {docs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-4 p-5 bg-paper border border-ink/15"
                  >
                    <div>
                      <div className="font-medium text-ink">{d.title}</div>
                      {d.description && (
                        <div className="text-sm text-ink/60 mt-1">
                          {d.description}
                        </div>
                      )}
                      <div className="text-xs font-mono text-stone-300 mt-1 uppercase tracking-wider">
                        Added {fmtDate(d.created_at)} · {d.visibility}
                        {d.file_size_bytes
                          ? ` · ${Math.round(d.file_size_bytes / 1024)} KB`
                          : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <Link
                        href={`/api/documents/${d.id}/download`}
                        className="font-mono text-[10px] tracking-[0.15em] uppercase text-copper hover:underline"
                      >
                        Download
                      </Link>
                      <form
                        action={async (fd) => {
                          "use server";
                          await deleteProjectDocument(fd);
                        }}
                      >
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="project_id" value={d.project_id} />
                        <button type="submit" className="app-label hover:text-red-600">
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {!contracts.length && (
        <p className="text-ink/50 italic py-16 text-center border border-dashed border-ink/20">
          No contracts on file yet. Click <strong>Add Contract</strong> above to
          upload the first one.
        </p>
      )}
    </div>
  );
}
