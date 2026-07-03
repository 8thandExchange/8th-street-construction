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
        "app-btn app-btn-accent w-full !h-10"
      }
    >
      {pending ? "Creating project…" : label}
    </button>
  );
}
