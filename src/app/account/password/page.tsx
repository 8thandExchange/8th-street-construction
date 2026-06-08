"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { changePassword } from "@/lib/actions/account";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [needsCurrent, setNeedsCurrent] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await changePassword(formData);
      if ("error" in result && result.error) {
        if (result.error.includes("Current password")) setNeedsCurrent(true);
        setError(result.error);
        return;
      }
      if ("redirectTo" in result) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <main className="min-h-screen bg-navy text-bone grain-overlay flex flex-col">
      <header className="px-6 md:px-10 lg:px-14 py-8">
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-display text-2xl text-bone">
            8<span className="italic">th</span> Street
          </span>
          <span className="eyebrow text-bone/50 mt-0.5">Construction</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <span className="eyebrow-copper">— Security</span>
          <h1 className="mt-4 font-display text-display-md leading-[1.05] text-bone">
            Set your password
          </h1>
          <p className="mt-4 text-bone/65 leading-relaxed">
            Choose a new password to finish activating your account. You&apos;ll use this email and
            password to sign in going forward.
          </p>

          <form action={handleSubmit} className="mt-10 flex flex-col gap-6">
            {needsCurrent && (
              <Input
                label="Current password"
                name="current_password"
                type="password"
                required
                dark
                autoComplete="current-password"
              />
            )}
            <Input
              label="New password"
              name="new_password"
              type="password"
              required
              dark
              autoComplete="new-password"
              minLength={8}
            />
            <Input
              label="Confirm new password"
              name="confirm_password"
              type="password"
              required
              dark
              autoComplete="new-password"
              minLength={8}
            />
            {error && (
              <p className="text-sm font-mono tracking-wide text-copper-100">{error}</p>
            )}
            <Button type="submit" disabled={pending} variant="copper" size="lg">
              {pending ? "Saving…" : "Save Password"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
