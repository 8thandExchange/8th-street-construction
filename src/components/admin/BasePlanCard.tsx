"use client";

import { useState } from "react";
import Link from "next/link";
import {
  replaceBasePlanPdf,
  toggleBasePlanActive,
  updateBasePlan,
} from "@/lib/actions/base-plans";
import { BasePlanPdfUpload } from "./BasePlanPdfUpload";
import type { HouseBasePlan } from "@/types/database";

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadedPdf = {
  path: string;
  size: number;
  type: string;
  fileName: string;
};

export function BasePlanCard({ plan }: { plan: HouseBasePlan }) {
  const [editing, setEditing] = useState(false);
  const [replacingPdf, setReplacingPdf] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedPdf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <article className="bg-paper border border-ink/15 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="font-mono text-xs text-stone-300">#{plan.plan_number}</span>
            <h2 className="font-display text-xl text-ink">{plan.name}</h2>
            {plan.variant && (
              <span className="text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-0.5 border border-ink/20 text-ink/70">
                {plan.variant}
              </span>
            )}
            {!plan.active && (
              <span className="text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-0.5 border border-red-200 text-red-700">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-ink/60">
            {plan.designer}
            {plan.sheet_count ? ` · ${plan.sheet_count} sheets` : ""}
            {" · "}
            {formatBytes(plan.file_size_bytes)}
          </p>
          {plan.notes && <p className="text-sm text-ink/75 mt-2">{plan.notes}</p>}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href={`/api/base-plans/${plan.id}/download`}
            className="inline-flex h-10 items-center px-5 app-btn app-btn-secondary"
          >
            Download PDF
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditing((v) => !v);
              setReplacingPdf(false);
              setUploaded(null);
              setError(null);
            }}
            className="inline-flex h-10 items-center px-5 app-btn app-btn-secondary"
          >
            {editing ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-6 pt-6 border-t border-ink/10 space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              setError(null);
              const result = await updateBasePlan(new FormData(e.currentTarget));
              setSaving(false);
              if ("error" in result && result.error) {
                setError(result.error);
                return;
              }
              setEditing(false);
            }}
            className="space-y-4"
          >
            <input type="hidden" name="id" value={plan.id} />
            <h3 className="eyebrow">Plan Details</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Plan Name</label>
                <input name="name" required defaultValue={plan.name} className="field-input" />
              </div>
              <div>
                <label className="field-label">Designer</label>
                <input name="designer" defaultValue={plan.designer} className="field-input" />
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="field-label">Sheet Count</label>
                <input
                  name="sheet_count"
                  type="number"
                  min={1}
                  defaultValue={plan.sheet_count ?? ""}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Display Order</label>
                <input
                  name="display_order"
                  type="number"
                  min={0}
                  defaultValue={plan.display_order}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Sq Ft</label>
                <input
                  name="square_footage"
                  type="number"
                  min={1}
                  defaultValue={plan.square_footage ?? ""}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Stories</label>
                <input
                  name="stories"
                  type="number"
                  min={1}
                  defaultValue={plan.stories ?? ""}
                  className="field-input"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Bedrooms</label>
                <input
                  name="bedrooms"
                  type="number"
                  min={0}
                  defaultValue={plan.bedrooms ?? ""}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Bathrooms</label>
                <input
                  name="bathrooms"
                  type="number"
                  min={0}
                  step={0.5}
                  defaultValue={plan.bathrooms ?? ""}
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Notes</label>
              <textarea name="notes" rows={2} defaultValue={plan.notes ?? ""} className="field-input" />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 app-btn app-btn-primary"
            >
              {saving ? "Saving…" : "Save Details"}
            </button>
          </form>

          <div className="space-y-3">
            <h3 className="eyebrow">Replace PDF</h3>
            {!replacingPdf ? (
              <button
                type="button"
                onClick={() => {
                  setReplacingPdf(true);
                  setUploaded(null);
                  setError(null);
                }}
                className="h-10 px-5 app-btn app-btn-secondary"
              >
                Upload New PDF
              </button>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!uploaded) return;
                  setSaving(true);
                  setError(null);
                  const fd = new FormData();
                  fd.set("id", plan.id);
                  fd.set("storage_path", uploaded.path);
                  fd.set("file_type", uploaded.type);
                  fd.set("file_size_bytes", String(uploaded.size));
                  const result = await replaceBasePlanPdf(fd);
                  setSaving(false);
                  if ("error" in result && result.error) {
                    setError(result.error);
                    return;
                  }
                  setReplacingPdf(false);
                  setUploaded(null);
                }}
                className="space-y-3"
              >
                <BasePlanPdfUpload
                  planNumber={plan.plan_number}
                  variant={plan.variant}
                  onComplete={setUploaded}
                  label="Drop in replacement PDF"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={!uploaded || saving}
                    className="h-10 px-5 app-btn app-btn-primary"
                  >
                    {saving ? "Replacing…" : "Replace PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplacingPdf(false);
                      setUploaded(null);
                    }}
                    className="h-10 px-5 app-btn app-btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <form
            action={async (fd) => {
              setError(null);
              const result = await toggleBasePlanActive(fd);
              if ("error" in result && result.error) setError(result.error);
            }}
          >
            <input type="hidden" name="id" value={plan.id} />
            <input type="hidden" name="active" value={plan.active ? "false" : "true"} />
            <button
              type="submit"
              className={`h-10 px-5 border font-mono text-[10px] tracking-[0.2em] uppercase ${
                plan.active
                  ? "border-red-200 text-red-700 hover:border-red-400"
                  : "border-emerald-200 text-emerald-700 hover:border-emerald-400"
              }`}
            >
              {plan.active ? "Deactivate Plan" : "Reactivate Plan"}
            </button>
          </form>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </article>
  );
}
