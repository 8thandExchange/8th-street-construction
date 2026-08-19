import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NewDocumentForm } from "@/components/project-hub/NewDocumentForm";
import { deleteProjectDocument } from "@/lib/actions/documents";
import { DOCUMENT_CATEGORIES } from "@/lib/project/labels";

export const dynamic = "force-dynamic";

export default async function ProjectDocumentsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", id).single();
  if (!project) notFound();

  const { data: documents } = await supabase
    .from("project_documents")
    .select("id, title, description, category, visibility, file_size_bytes, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const catLabel = (v: string) =>
    DOCUMENT_CATEGORIES.find((c) => c.value === v)?.label ?? v;

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h2 className="app-h1 !text-[18px]">Documents</h2>
          <p className="text-sm app-muted mt-2">
            Private storage — clients download via signed links.
          </p>
        </div>
        <NewDocumentForm projectId={id} />
      </div>

      <ul className="space-y-3">
        {(documents ?? []).map((d) => (
          <li
            key={d.id}
            className="app-card flex items-center justify-between gap-4 p-5"
          >
            <div>
              <div className="font-medium text-ink">{d.title}</div>
              <div className="text-xs app-muted mt-1">
                {catLabel(d.category)} · {d.visibility}
                {d.file_size_bytes
                  ? ` · ${Math.round(d.file_size_bytes / 1024)} KB`
                  : ""}
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <Link
                href={`/api/documents/${d.id}/download`}
                className="text-[13px] font-medium text-copper hover:underline"
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
                <input type="hidden" name="project_id" value={id} />
                <button
                  type="submit"
                  className="text-xs text-red-700 hover:underline"
                >
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      {!documents?.length && (
        <p className="app-card p-10 text-center text-sm italic app-muted mt-6">
          No documents uploaded yet.
        </p>
      )}
    </div>
  );
}
