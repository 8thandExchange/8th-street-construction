import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionItemCard } from "@/components/admin/meetings/ActionItemCard";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { addActionItemForm, requestActionUpdatesForm } from "@/lib/actions/meetings";
import { listActionItems } from "@/lib/meetings/queries";
import {
  ACTION_ITEM_STATUSES,
  OPEN_ACTION_STATUSES,
  ownerLabel,
  type ActionItemStatus,
} from "@/lib/meetings/types";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "overdue", label: "Overdue" },
  { key: "done", label: "Done" },
  { key: "all", label: "Everything" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

export default async function ActionItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = (FILTERS.find((f) => f.key === params.view)?.key ?? "open") as Filter;

  const supabase = await createClient();

  const status: ActionItemStatus[] =
    view === "done"
      ? ["done"]
      : view === "all"
        ? [...ACTION_ITEM_STATUSES]
        : [...OPEN_ACTION_STATUSES];

  const [items, projectsResult] = await Promise.all([
    listActionItems(supabase, { status, overdueOnly: view === "overdue" }),
    supabase.from("projects").select("id, title").order("title"),
  ]);

  const projects = (projectsResult.data ?? []) as { id: string; title: string }[];

  // Grouped by owner — the question is nearly always "what does this person owe".
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = ownerLabel(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const ordered = [...groups.entries()].sort((a, b) => {
    const externalA = a[1][0]?.is_external ? 1 : 0;
    const externalB = b[1][0]?.is_external ? 1 : 0;
    if (externalA !== externalB) return externalA - externalB;
    return b[1].length - a[1].length;
  });

  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = items.filter(
    (a) => a.due_date && a.due_date < today && OPEN_ACTION_STATUSES.includes(a.status)
  ).length;

  return (
    <div className="max-w-4xl space-y-8 p-4 md:p-8 lg:p-10">
      <div>
        <p className="app-label">Company</p>
        <h2 className="mt-2 app-h1">Action Items</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed app-muted">
          Everything anyone committed to, across every meeting. Say where something stands in your
          own words — the note is kept permanently against the item, which is what makes the record
          worth anything later.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/meetings/action-items?view=${f.key}`}
            className={`app-btn ${view === f.key ? "app-btn-primary" : "app-btn-secondary"}`}
          >
            {f.label}
            {f.key === "overdue" && overdueCount > 0 ? ` (${overdueCount})` : ""}
          </Link>
        ))}
        <span className="flex-1" />
        <form
          action={async (fd: FormData) => {
            "use server";
            await requestActionUpdatesForm(fd);
          }}
        >
          <SubmitButton className="app-btn app-btn-secondary">
            Ask everyone for an update
          </SubmitButton>
        </form>
        <Link href="/admin/meetings" className="app-btn app-btn-ghost">
          Meetings
        </Link>
      </div>

      {items.length === 0 && (
        <div className="app-card p-8 text-sm italic app-muted">
          Nothing here.{" "}
          {view === "open" ? "Everything has been closed out." : "Try another filter."}
        </div>
      )}

      {ordered.map(([owner, list]) => (
        <section key={owner} className="space-y-3">
          <h3 className="app-h2 !text-[15px] flex items-center gap-2">
            {owner}
            <span className="app-badge app-badge-neutral">{list.length}</span>
            {list[0]?.is_external && (
              <span className="text-xs font-normal app-muted">
                outside the company — not emailed automatically
              </span>
            )}
          </h3>
          {list.map((item) => (
            <ActionItemCard key={item.id} item={item} projects={projects} />
          ))}
        </section>
      ))}

      <div className="app-card p-6 md:p-8">
        <h3 className="app-h2 !text-[16px] mb-5">Add an action item</h3>
        <form
          action={async (fd: FormData) => {
            "use server";
            await addActionItemForm(fd);
          }}
          className="grid gap-4 md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <label className="app-label" htmlFor="new-title">
              What needs doing
            </label>
            <input id="new-title" name="title" required className="mt-1 w-full" />
          </div>
          <div>
            <label className="app-label" htmlFor="new-owner">
              Who owns it
            </label>
            <input id="new-owner" name="owner_name" className="mt-1 w-full" />
          </div>
          <div>
            <label className="app-label" htmlFor="new-owner-email">
              Their email (so it can be chased)
            </label>
            <input id="new-owner-email" type="email" name="owner_email" className="mt-1 w-full" />
          </div>
          <div>
            <label className="app-label" htmlFor="new-due">
              Due
            </label>
            <input id="new-due" type="date" name="due_date" className="mt-1 w-full" />
          </div>
          <div>
            <label className="app-label" htmlFor="new-project">
              Job (optional)
            </label>
            <select id="new-project" name="project_id" className="mt-1 w-full">
              <option value="">—</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <SubmitButton className="app-btn app-btn-accent">Add it</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
