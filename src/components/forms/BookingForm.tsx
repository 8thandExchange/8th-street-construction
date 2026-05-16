"use client";
import { useState, useTransition } from "react";
import { Input, Textarea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { bookingSchema } from "@/lib/validations";
import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";

const MEETING_TYPES = [
  { value: "phone", label: "Phone call" },
  { value: "video", label: "Video call" },
  { value: "in_person", label: "In-person meeting" },
  { value: "site_visit", label: "On-site visit" },
];

const TIME_WINDOWS = [
  { value: "morning", label: "Morning (8 AM – 12 PM)" },
  { value: "afternoon", label: "Afternoon (12 PM – 5 PM)" },
  { value: "evening", label: "Evening (5 PM – 7 PM)" },
];

const projectOptions = Object.entries(PROJECT_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function BookingForm({ dark = false }: { dark?: boolean }) {
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
      phone: formData.get("phone"),
      project_type: formData.get("project_type") || undefined,
      project_location: formData.get("project_location") || undefined,
      meeting_type: formData.get("meeting_type"),
      preferred_date: formData.get("preferred_date"),
      preferred_time_window: formData.get("preferred_time_window"),
      notes: formData.get("notes") || undefined,
      website: formData.get("website") || "",
    };

    const result = bookingSchema.safeParse(raw);
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
        const res = await fetch("/api/bookings", {
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
        <span className="eyebrow-copper">— Consultation requested</span>
        <h3 className="mt-4 font-display text-3xl md:text-4xl leading-snug">
          Thank you. We'll confirm a specific time within one business day.
        </h3>
        <p className={`mt-6 max-w-prose leading-relaxed ${dark ? "text-bone/70" : "text-ink/70"}`}>
          A confirmation has been sent to your email. We typically reply within a few hours during weekdays.
        </p>
      </div>
    );
  }

  const today = new Date();
  const minDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <form action={handleSubmit} className="flex flex-col gap-7">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] w-px h-px"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="First Name" name="first_name" required dark={dark} autoComplete="given-name" error={errors.first_name} />
        <Input label="Last Name" name="last_name" required dark={dark} autoComplete="family-name" error={errors.last_name} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="Email" name="email" type="email" required dark={dark} autoComplete="email" error={errors.email} />
        <Input label="Phone" name="phone" type="tel" required dark={dark} autoComplete="tel" error={errors.phone} />
      </div>

      <Select label="Meeting Type" name="meeting_type" required dark={dark} options={MEETING_TYPES} error={errors.meeting_type} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Preferred Date"
          name="preferred_date"
          type="date"
          required
          dark={dark}
          min={minDate}
          error={errors.preferred_date}
        />
        <Select
          label="Time Window"
          name="preferred_time_window"
          required
          dark={dark}
          options={TIME_WINDOWS}
          error={errors.preferred_time_window}
        />
      </div>

      <Select label="Project Type" name="project_type" dark={dark} options={projectOptions} error={errors.project_type} />

      <Input
        label="Project Location"
        name="project_location"
        dark={dark}
        placeholder="City or neighborhood"
        error={errors.project_location}
      />

      <Textarea
        label="Notes (optional)"
        name="notes"
        dark={dark}
        rows={4}
        placeholder="Anything specific you'd like to discuss"
        error={errors.notes}
      />

      {serverError && (
        <p className={`text-sm font-mono tracking-wide ${dark ? "text-copper-100" : "text-copper"}`}>
          {serverError}
        </p>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-6 pt-2">
        <Button type="submit" disabled={pending} variant={dark ? "copper" : "primary"} size="lg">
          {pending ? "Sending…" : "Request Consultation"}
        </Button>
        <p className={`text-xs font-mono tracking-wide ${dark ? "text-bone/40" : "text-stone-300"}`}>
          We'll confirm a specific time within one business day.
        </p>
      </div>
    </form>
  );
}
