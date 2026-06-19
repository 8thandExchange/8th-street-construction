"use client";

import { useRef, useState, useTransition } from "react";

type Option = { value: string; label: string };

/**
 * Inline status editor: shows an on-brand status badge that, on change,
 * posts to a server action via FormData. Used on the job master board,
 * projects list, milestones and tasks.
 */
export function InlineStatusSelect({
  value,
  options,
  styles,
  action,
  hiddenFields = {},
  size = "sm",
  "aria-label": ariaLabel = "Change status",
}: {
  value: string;
  options: Option[];
  styles: Record<string, string>;
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields?: Record<string, string>;
  size?: "sm" | "md";
  "aria-label"?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(value);
  const formRef = useRef<HTMLFormElement>(null);

  const badgeClass = styles[current] ?? "bg-stone-100 text-stone-500 border-stone-200";
  const sizeClass =
    size === "md"
      ? "text-[11px] px-2.5 py-1.5"
      : "text-[10px] px-2 py-1";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    fd.set("status", next);
    startTransition(async () => {
      await action(fd);
    });
  }

  return (
    <form ref={formRef} className="inline-flex">
      {Object.entries(hiddenFields).map(([name, val]) => (
        <input key={name} type="hidden" name={name} value={val} />
      ))}
      <span className="relative inline-flex items-center">
        <select
          aria-label={ariaLabel}
          value={current}
          onChange={onChange}
          disabled={pending}
          className={`appearance-none cursor-pointer border font-mono uppercase tracking-[0.1em] rounded-none pr-6 transition-colors focus:outline-none focus:ring-1 focus:ring-copper/40 ${badgeClass} ${sizeClass} ${
            pending ? "opacity-60 cursor-wait" : "hover:brightness-95"
          }`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="text-ink bg-paper normal-case">
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="pointer-events-none absolute right-1.5 h-2.5 w-2.5 opacity-60"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </span>
    </form>
  );
}
