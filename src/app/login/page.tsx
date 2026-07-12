"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") || "").trim();
    if (!email) {
      setError("Enter your email");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setSent(true);
    });
  }

  return (
    <main className="min-h-screen bg-navy text-bone grain-overlay flex flex-col">
      <header className="px-6 md:px-10 lg:px-14 py-8">
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-display text-2xl text-bone">8<span className="italic">th</span> Street</span>
          <span className="eyebrow text-bone/50 mt-0.5">Construction</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {!sent ? (
            <>
              <span className="eyebrow-copper">— Sign in</span>
              <h1 className="mt-4 font-display text-display-md leading-[1.05] text-bone">
                Welcome back.
              </h1>
              <p className="mt-4 text-bone/65 leading-relaxed">
                Enter your email and we'll send a one-time sign-in link.
              </p>

              <form action={handleSubmit} className="mt-10 flex flex-col gap-6">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  required
                  dark
                  autoComplete="email"
                  autoFocus
                />
                {error && (
                  <p className="text-sm font-mono tracking-wide text-copper-100">{error}</p>
                )}
                <Button type="submit" disabled={pending} variant="copper" size="lg">
                  {pending ? "Sending…" : "Send Sign-in Link"}
                </Button>
              </form>

              <div className="mt-12 pt-8 border-t border-bone/15 text-xs font-mono tracking-[0.15em] uppercase text-bone/40">
                <p>
                  Don't have an account?<br/>
                  Reach out to{" "}
                  <a
                    href="mailto:hello@8thstreetconstruction.com"
                    className="text-copper-100 hover:text-copper"
                  >
                    hello@8thstreetconstruction.com
                  </a>{" "}
                  to get set up.
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="eyebrow-copper">— Check your email</span>
              <h1 className="mt-4 font-display text-display-md leading-[1.05] text-bone">
                Sign-in link sent.
              </h1>
              <p className="mt-6 text-bone/65 leading-relaxed">
                We've sent a one-time sign-in link to your email. Click it to access your account.
              </p>
              <p className="mt-4 text-sm text-bone/50">
                The link expires in one hour. If you don't see it, check your spam folder.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
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
            <p className="text-bone/50 font-mono text-sm tracking-wider">Loading…</p>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
