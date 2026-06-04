import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { clientApproveSelection } from "@/lib/actions/selections";

export const dynamic = "force-dynamic";

export default async function ClientSelectionsPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, title").eq("id", id).single();
  if (!project) notFound();

  const { data: items } = await supabase
    .from("project_selections")
    .select("*")
    .eq("project_id", id)
    .eq("client_visible", true)
    .order("due_date", { ascending: true, nullsFirst: false });

  return (
    <div className="px-6 md:px-10 lg:px-14 py-12 max-w-3xl mx-auto">
      <Link
        href={`/client/projects/${id}`}
        className="text-xs font-mono tracking-[0.18em] uppercase text-stone-300 hover:text-ink"
      >
        ← {project.title}
      </Link>
      <h1 className="mt-6 font-display text-2xl text-ink">Selections</h1>
      <p className="mt-2 text-sm text-ink/60">Finish selections and allowances for your home.</p>

      <ul className="mt-10 space-y-4">
        {(items ?? []).map((item) => (
          <li key={item.id} className="p-6 border border-ink/15 bg-paper">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="font-medium text-ink">{item.title}</h2>
                <div className="text-xs font-mono text-stone-300 mt-1 uppercase">
                  {item.category.replace(/_/g, " ")} · {item.status.replace(/_/g, " ")}
                </div>
              </div>
              {item.allowance_amount != null && (
                <div className="text-right font-mono text-sm">
                  ${Number(item.allowance_amount).toLocaleString()}
                  <div className="text-[10px] text-stone-300 uppercase">allowance</div>
                </div>
              )}
            </div>
            {item.product_spec && (
              <p className="mt-3 text-sm text-ink/70 whitespace-pre-wrap">{item.product_spec}</p>
            )}
            {item.vendor && (
              <p className="mt-2 text-xs text-stone-300">Vendor: {item.vendor}</p>
            )}
            {item.due_date && (
              <p className="mt-2 text-xs font-mono text-copper">Decision by {item.due_date}</p>
            )}
            {item.status === "client_review" && (
              <form
                action={async (fd) => {
                  "use server";
                  await clientApproveSelection(fd);
                }}
                className="mt-4"
              >
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="project_id" value={id} />
                <button
                  type="submit"
                  className="h-10 px-5 bg-copper text-bone font-mono text-[10px] uppercase"
                >
                  Approve Selection
                </button>
              </form>
            )}
          </li>
        ))}
        {!items?.length && (
          <p className="text-ink/50 italic py-8 text-center border border-dashed border-ink/20">
            No selections posted yet.
          </p>
        )}
      </ul>
    </div>
  );
}
