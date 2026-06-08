"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  requestMagicLink,
  requestPortalAccess,
  signInWithPassword,
} from "@/lib/actions/auth-login";
import { getPortalKind, getPortalLoginCopy } from "@/lib/portal-links";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Mode = "signin" | "request";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const portalCopy = getPortalLoginCopy(getPortalKind(redirect));
  const [mode, setMode] = useState<Mode>("signin");
  const [signInEmail, setSignInEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSignIn(formData: FormData) {
    setError(null);
    setSuccess(null);
    formData.set("redirect", redirect);

    startTransition(async () => {
      const result = await signInWithPassword(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("redirectTo" in result) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  function handleRequestAccess(formData: FormData) {
    setError(null);
    setSuccess(null);
    formData.set("redirect", redirect);

    startTransition(async () => {
      const result = await requestPortalAccess(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSuccess(
        "Request submitted. If approved, you'll receive an email with your login credentials."
      );
    });
  }

  function handleMagicLink(formData: FormData) {
    setError(null);
    setSuccess(null);
    formData.set("redirect", redirect);

    startTransition(async () => {
      const result = await requestMagicLink(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Sign-in link sent. Check your email — link expires in one hour.");
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
          <span className="eyebrow-copper">{portalCopy.eyebrow}</span>
          <h1 className="mt-4 font-display text-display-md leading-[1.05] text-bone">
            {portalCopy.title}
          </h1>
          <p className="mt-4 text-bone/65 leading-relaxed">{portalCopy.description}</p>

          <div className="mt-8 flex gap-2 border-b border-bone/15">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setSuccess(null);
              }}
              className={`px-4 py-3 font-mono text-[10px] tracking-[0.18em] uppercase border-b-2 -mb-px transition-colors ${
                mode === "signin"
                  ? "border-copper text-bone"
                  : "border-transparent text-bone/40 hover:text-bone/70"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("request");
                setError(null);
                setSuccess(null);
              }}
              className={`px-4 py-3 font-mono text-[10px] tracking-[0.18em] uppercase border-b-2 -mb-px transition-colors ${
                mode === "request"
                  ? "border-copper text-bone"
                  : "border-transparent text-bone/40 hover:text-bone/70"
              }`}
            >
              Request Access
            </button>
          </div>

          {success ? (
            <div className="mt-10">
              <p className="text-bone/80 leading-relaxed">{success}</p>
              <button
                type="button"
                onClick={() => {
                  setSuccess(null);
                  setMode("signin");
                }}
                className="mt-6 font-mono text-[10px] tracking-[0.15em] uppercase text-copper-100 hover:text-copper"
              >
                ← Back to sign in
              </button>
            </div>
          ) : mode === "signin" ? (
            <>
              <form action={handleSignIn} className="mt-10 flex flex-col gap-6">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  required
                  dark
                  autoComplete="email"
                  autoFocus
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                />
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  required
                  dark
                  autoComplete="current-password"
                />
                {error && (
                  <p className="text-sm font-mono tracking-wide text-copper-100">{error}</p>
                )}
                <Button type="submit" disabled={pending} variant="copper" size="lg">
                  {pending ? "Signing in…" : "Sign In"}
                </Button>
              </form>

              <p className="mt-6 text-xs text-bone/45 font-mono">
                Prefer email link?{" "}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!signInEmail.includes("@")) {
                      setError("Enter your email above first, then click send magic link.");
                      return;
                    }
                    const fd = new FormData();
                    fd.set("email", signInEmail);
                    fd.set("redirect", redirect);
                    startTransition(async () => {
                      const result = await requestMagicLink(fd);
                      if ("error" in result && result.error) setError(result.error);
                      else
                        setSuccess(
                          "Sign-in link sent. Check your email — link expires in one hour."
                        );
                    });
                  }}
                  className="text-copper-100 hover:text-copper underline"
                >
                  Send one-time sign-in link
                </button>
              </p>
            </>
          ) : (
            <form action={handleRequestAccess} className="mt-10 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First name" name="first_name" dark autoComplete="given-name" />
                <Input label="Last name" name="last_name" dark autoComplete="family-name" />
              </div>
              <Input
                label="Email"
                name="email"
                type="email"
                required
                dark
                autoComplete="email"
              />
              <div>
                <label className="field-label text-bone/70">Message (optional)</label>
                <textarea
                  name="message"
                  rows={3}
                  className="field-input bg-navy/50 border-bone/20 text-bone"
                  placeholder="Project name, trade, or why you need access…"
                />
              </div>
              {error && (
                <p className="text-sm font-mono tracking-wide text-copper-100">{error}</p>
              )}
              <Button type="submit" disabled={pending} variant="copper" size="lg">
                {pending ? "Submitting…" : "Request Access"}
              </Button>
              <p className="text-xs text-bone/45">
                An admin will review your request. If approved, you&apos;ll get an email with a
                temporary password.
              </p>
            </form>
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
