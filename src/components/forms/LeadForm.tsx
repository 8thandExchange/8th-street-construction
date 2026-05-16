"use client";
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Input, Textarea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { leadSchema, type LeadInput } from "@/lib/validations";
import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";

const projectOptions = Object.entries(PROJECT_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function LeadForm({ dark = false }: { dark?: boolean }) {
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErrors({});
    setServerError(null);

    const raw: Record<string, unknown> = {
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      project_type: formData.get("project_type") || undefined,
      message: formData.get("message"),
      website: formData.get("website") || "",
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
    };

    const result = leadSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.data),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setServerError(body.error || "Something went wrong. Please try again.");
          return;
        }
        setDone(true);
      } catch {
        setServerError("Couldn't reach the server. Please try again.");
      }
    });
  }

  if (done) {
    return (
      <div className={dark ? "text-bone" : "text-ink"}>
        <span className={dark ? "eyebrow-copper" : "eyebrow-copper"}>— Message received</span>
        <h3 className="mt-4 font-display text-3xl md:text-4xl leading-snug">
          Thank you. We'll be in touch within one business day.
        </h3>
        <p className={`mt-6 max-w-prose leading-relaxed ${dark ? "text-bone/70" : "text-ink/70"}`}>
          A confirmation has been sent to your email. If anything's urgent, you can reach us directly at{" "}
          <a
            href="mailto:construction@8thandexchange.com"
            className={`editorial-link ${dark ? "text-copper-100" : "text-copper"}`}
          >
            construction@8thandexchange.com
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-7">
      {/* Honeypot — hidden from users */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] w-px h-px"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="First Name"
          name="first_name"
          required
          dark={dark}
          autoComplete="given-name"
          error={errors.first_name}
        />
        <Input
          label="Last Name"
          name="last_name"
          required
          dark={dark}
          autoComplete="family-name"
          error={errors.last_name}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Email"
          name="email"
          type="email"
          required
          dark={dark}
          autoComplete="email"
          error={errors.email}
        />
        <Input
          label="Phone"
          name="phone"
          type="tel"
          dark={dark}
          autoComplete="tel"
          error={errors.phone}
        />
      </div>

      <Select
        label="Project Type"
        name="project_type"
        dark={dark}
        options={projectOptions}
        error={errors.project_type}
      />

      <Textarea
        label="Tell us about your project"
        name="message"
        required
        dark={dark}
        rows={6}
        placeholder="Scope, timeline, location, budget range — whatever you're comfortable sharing."
        error={errors.message}
      />

      {serverError && (
        <p className={`text-sm font-mono tracking-wide ${dark ? "text-copper-100" : "text-copper"}`}>
          {serverError}
        </p>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-6 pt-2">
        <Button type="submit" disabled={pending} variant={dark ? "copper" : "primary"} size="lg">
          {pending ? "Sending…" : "Send Inquiry"}
        </Button>
        <p className={`text-xs font-mono tracking-wide ${dark ? "text-bone/40" : "text-stone-300"}`}>
          We reply within one business day.
        </p>
      </div>
    </form>
  );
}
