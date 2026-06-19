import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DOCUMENT_CATEGORIES } from "@/lib/project/labels";

export const dynamic = "force-dynamic";

export default async function ClientDocumentsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const { data: documents } = await supabase
    .from("project_documents")
    .select("id, title, description, category, file_size_bytes, created_at")
    .eq("project_id", id)
    .eq("visibility", "client")
    .order("created_at", { ascending: false });

  const catLabel = (v: string) =>
    DOCUMENT_CATEGORIES.find((c) => c.value === v)?.label ?? v.replace(/_/g, " ");

  return (
    <div className="px-6 md:px-10 lg:px-14 py-10 max-w-3xl">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink transition-colors"
      >
        ← Overview
      </Link>
      <h2 className="mt-4 font-display text-xl text-ink mb-2">Documents</h2>
      <p className="mt-2 text-sm text-ink/60">
        Contracts, permits, plans, and other files we&apos;ve shared with you.
      </p>

      <ul className="mt-10 space-y-3">
        {(documents ?? []).map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-4 p-5 border border-ink/15 bg-paper"
          >
            <div className="min-w-0">
              <div className="font-medium text-ink truncate">{d.title}</div>
              <div className="text-xs font-mono text-stone-300 mt-1 uppercase tracking-wider">
                {catLabel(d.category)}
                {d.file_size_bytes ? ` · ${Math.round(d.file_size_bytes / 1024)} KB` : ""}
              </div>
              {d.description && (
                <p className="text-sm text-ink/60 mt-2">{d.description}</p>
              )}
            </div>
            <Link
              href={`/api/documents/${d.id}/download`}
              className="shrink-0 h-10 px-4 inline-flex items-center bg-ink text-bone hover:bg-copper font-mono text-[10px] tracking-[0.15em] uppercase transition-colors"
            >
              Download
            </Link>
          </li>
        ))}
        {!documents?.length && (
          <p className="text-ink/50 italic py-12 text-center border border-dashed border-ink/20">
            No documents have been shared yet. We&apos;ll post contracts and plans here.
          </p>
        )}
      </ul>
    </div>
  );
}
