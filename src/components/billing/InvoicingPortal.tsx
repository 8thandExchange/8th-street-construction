"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CustomInvoiceForm } from "./CustomInvoiceForm";
import { formatMoney } from "@/lib/billing/constants";

export type InvoicingProject = {
  id: string;
  title: string;
  slug: string;
  clientName: string | null;
  invoiceCount: number;
  openCount: number;
  outstanding: number;
  draftCount: number;
};

type InvoicingPortalProps = {
  projects: InvoicingProject[];
};

export function InvoicingPortal({ projects }: InvoicingPortalProps) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "");

  const selected = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId]
  );

  if (!projects.length) {
    return (
      <div className="hub-panel text-center py-14 px-6 border-dashed border-ink/15">
        <p className="app-h2 text-navy/70">No billable jobs yet</p>
        <p className="text-ink/45 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
          Create a project and link a client to start sending invoices.
        </p>
        <Link
          href="/admin/projects"
          className="app-btn app-btn-primary mt-6"
        >
          View projects
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="app-h1 !text-[18px]">All jobs</h2>
            <p className="mt-1 text-sm text-ink/55">
              Every project with billing activity — open a job or create a custom invoice here.
            </p>
          </div>
        </div>

        <ul className="space-y-3">
          {projects.map((project) => {
            const active = project.id === selectedId;
            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                  className={`w-full text-left hub-panel p-4 md:p-5 transition-colors ${
                    active ? "!border-copper/40 !bg-copper/[0.03]" : "hover:border-ink/20"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{project.title}</p>
                      <p className="mt-1 text-xs app-muted">
                        {project.clientName ?? "No client linked"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="app-num text-lg font-medium text-navy">
                        {formatMoney(project.outstanding)}
                      </p>
                      <p className="mt-1 text-xs app-muted">
                        {project.openCount} open · {project.invoiceCount} total
                      </p>
                      {project.draftCount > 0 && (
                        <span className="mt-1.5 inline-flex app-badge app-badge-amber !h-[18px] !text-[11px]">
                          {project.draftCount} draft{project.draftCount > 1 ? "s" : ""} — not sent
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/admin/projects/${project.id}/billing`}
                      className="font-mono text-[10px] uppercase tracking-wider text-copper hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open billing →
                    </Link>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        {selected ? (
          <>
            <div className="mb-4">
              <p className="font-sans text-[10px] tracking-[0.28em] uppercase text-copper mb-2">
                Create invoice
              </p>
              <h2 className="app-h1 !text-[18px]">{selected.title}</h2>
            </div>
            <CustomInvoiceForm
              projectId={selected.id}
              projectTitle={selected.title}
              clientName={selected.clientName}
              compact
            />
          </>
        ) : null}
      </section>
    </div>
  );
}
