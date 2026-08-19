"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button with a pending state, so every form says when it's
 * working. Drop-in for <button type="submit" className="app-btn …">.
 */
export function SubmitButton({
  children,
  className = "app-btn app-btn-primary",
  pendingLabel = "Working…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
