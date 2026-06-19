"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button (with pending state + confirm) for converting a lead or
 * consultation into a project. Place inside a <form action={convert...}>.
 */
export function ConvertToProjectButton({
  label = "Convert to Project →",
  confirmText,
  className,
}: {
  label?: string;
  confirmText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
      className={
        className ??
        "inline-flex h-12 w-full items-center justify-center px-6 bg-copper text-bone hover:bg-copper-400 disabled:opacity-60 disabled:cursor-wait font-mono text-[11px] tracking-[0.2em] uppercase transition-colors"
      }
    >
      {pending ? "Creating project…" : label}
    </button>
  );
}
