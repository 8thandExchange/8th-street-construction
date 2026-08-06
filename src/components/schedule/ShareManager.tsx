"use client";

import { useState } from "react";
import {
  disableProjectShare,
  enableProjectShare,
  regenerateShareLink,
  updateSharePassword,
  type ShareSettings,
} from "@/lib/actions/project-share";

export function ShareManager({
  projectId,
  settings,
}: {
  projectId: string;
  settings: ShareSettings;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!settings.url) return;
    await navigator.clipboard.writeText(settings.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="relative overflow-hidden border border-ink/10 bg-paper">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-copper/80 via-copper/30 to-transparent" />
      <div className="p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">
              Client progress link
            </p>
            <h3 className="mt-1 font-display text-xl text-ink">Share build progress</h3>
            <p className="mt-2 text-sm text-ink/55 max-w-lg leading-relaxed">
              A password-protected page showing this job&apos;s Gantt schedule and recent updates.
              Each link is unique to this job — no one can reach another client&apos;s project.
            </p>
          </div>
          <span
            className={`shrink-0 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 border ${
              settings.enabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-stone-100 text-stone-500 border-stone-200"
            }`}
          >
            {settings.enabled ? "Live" : "Off"}
          </span>
        </div>

        {!settings.enabled ? (
          <form action={enableProjectShare} className="mt-6 flex flex-wrap items-end gap-3">
            <input type="hidden" name="project_id" value={projectId} />
            <div>
              <label className="field-label">Set an access code</label>
              <input
                type="text"
                name="share_password"
                placeholder="Choose an access code"
                className="field-input w-56"
                required
                minLength={4}
              />
            </div>
            <button
              type="submit"
              className="h-11 px-6 app-btn app-btn-primary"
            >
              Turn on sharing
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-5">
            {settings.url && (
              <div className="flex flex-wrap items-center gap-3">
                <code className="flex-1 min-w-0 truncate font-mono text-xs text-ink/70 bg-bone/60 border border-ink/10 px-3 py-2.5">
                  {settings.url}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="h-10 px-4 app-btn app-btn-secondary"
                >
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
                <a
                  href={settings.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 inline-flex items-center px-4 font-mono text-[10px] uppercase tracking-wider text-copper hover:underline"
                >
                  Preview ↗
                </a>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <form action={updateSharePassword} className="flex items-end gap-2">
                <input type="hidden" name="project_id" value={projectId} />
                <div className="flex-1">
                  <label className="field-label">Change access code</label>
                  <input
                    type="text"
                    name="share_password"
                    placeholder="New code"
                    className="field-input"
                    required
                    minLength={4}
                  />
                </div>
                <button
                  type="submit"
                  className="h-10 px-4 app-btn app-btn-secondary"
                >
                  Update
                </button>
              </form>

              <div className="flex items-end gap-2 justify-start sm:justify-end">
                <form action={regenerateShareLink}>
                  <input type="hidden" name="project_id" value={projectId} />
                  <button
                    type="submit"
                    className="h-10 px-4 app-btn app-btn-secondary"
                    title="Creates a new link and invalidates the old one"
                  >
                    New link
                  </button>
                </form>
                <form action={disableProjectShare}>
                  <input type="hidden" name="project_id" value={projectId} />
                  <button
                    type="submit"
                    className="h-10 px-4 border border-red-200 text-red-700 font-mono text-[10px] uppercase tracking-wider hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                  >
                    Turn off
                  </button>
                </form>
              </div>
            </div>

            <p className="text-xs text-ink/45 leading-relaxed">
              Changing the access code or generating a new link immediately signs out anyone who had
              the old one.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
