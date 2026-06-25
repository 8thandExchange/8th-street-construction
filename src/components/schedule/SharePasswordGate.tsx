"use client";

import { useActionState } from "react";
import Image from "next/image";
import { submitSharePassword } from "@/lib/actions/project-share";

export function SharePasswordGate({
  token,
  projectTitle,
}: {
  token: string;
  projectTitle: string;
}) {
  const [state, formAction, pending] = useActionState(submitSharePassword, { error: null });

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-6 py-16">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <Image
            src="/img/logo-horizontal-navy.svg"
            alt="8th Street Construction"
            width={240}
            height={56}
            className="h-12 w-auto"
            priority
          />
        </div>

        <div className="bg-paper border border-bone/10 p-8 md:p-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper text-center">
            Build progress
          </p>
          <h1 className="mt-2 font-display text-2xl text-ink text-center leading-snug">
            {projectTitle}
          </h1>
          <p className="mt-3 text-sm text-ink/55 text-center leading-relaxed">
            Enter the access code your builder shared to view this project&apos;s schedule and
            updates.
          </p>

          <form action={formAction} className="mt-8 space-y-5">
            <input type="hidden" name="token" value={token} />
            <div>
              <label className="field-label">Access code</label>
              <input
                type="password"
                name="password"
                autoFocus
                required
                className="field-input"
                placeholder="Enter access code"
              />
            </div>
            {state?.error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
                {state.error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full h-12 bg-ink text-bone font-mono text-[10px] tracking-[0.18em] uppercase hover:bg-copper transition-colors disabled:opacity-50"
            >
              {pending ? "Checking…" : "View progress"}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-bone/40">
          8th Street Construction · Augusta, Georgia
        </p>
      </div>
    </div>
  );
}
