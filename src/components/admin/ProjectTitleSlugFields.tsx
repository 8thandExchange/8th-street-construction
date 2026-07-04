"use client";

import { useEffect, useId, useState } from "react";
import { slugifyProjectTitle } from "@/lib/utils";

const SITE_HOST =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
    : null) ?? "8thstreetconstruction.com";

interface ProjectTitleSlugFieldsProps {
  defaultTitle?: string;
  defaultSlug?: string;
  /** When true, slug updates from title until the user edits the slug manually */
  autoSlugFromTitle?: boolean;
}

export function ProjectTitleSlugFields({
  defaultTitle = "",
  defaultSlug = "",
  autoSlugFromTitle = false,
}: ProjectTitleSlugFieldsProps) {
  const titleId = useId();
  const slugId = useId();
  const [title, setTitle] = useState(defaultTitle);
  const [slug, setSlug] = useState(defaultSlug);
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultSlug));

  useEffect(() => {
    if (!autoSlugFromTitle || slugTouched) return;
    setSlug(slugifyProjectTitle(title));
  }, [title, autoSlugFromTitle, slugTouched]);

  const previewSlug = slug.trim() || "your-project";

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor={titleId} className="field-label">
          Job name *
        </label>
        <input
          id={titleId}
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="field-input"
          placeholder="Job name or street address"
        />
      </div>

      <div className="rounded border border-ink/10 bg-bone/40 px-5 py-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-300">
          Public project page
        </p>
        <p className="mt-2 font-mono text-sm text-ink/80 break-all">
          <span className="text-stone-300">{SITE_HOST}/projects/</span>
          <span className="text-copper">{previewSlug}</span>
        </p>
        <p className="mt-2 text-xs text-ink/55 leading-relaxed">
          {autoSlugFromTitle
            ? "This link is created from the job name. Only change it if you need a different address on the website."
            : "Changing this breaks old links — update only if you moved the public page."}
        </p>
        <label htmlFor={slugId} className="field-label mt-4 block">
          Link ending
        </label>
        <input
          id={slugId}
          name="slug"
          required
          pattern="[a-z0-9-]+"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
          }}
          className="field-input font-mono text-sm"
          placeholder="job-name-or-address"
        />
      </div>
    </div>
  );
}
