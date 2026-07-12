"use client";
import { useRef, useState, useTransition } from "react";
import { Input, Textarea, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { volunteerSignupSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";

export type VolunteerEventCard = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  partner: string;
  capacity: number;
  spots_left: number;
  skills_needed: string | null;
  what_to_bring: string | null;
  signup_deadline: string | null;
  status: string;
};

const EXPERIENCE = [
  { value: "first_time", label: "First build — show me everything" },
  { value: "some", label: "Some experience" },
  { value: "experienced", label: "Experienced — put me to work" },
];

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function fmtShortDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return m ? `${hr}:${String(m).padStart(2, "0")} ${ampm}` : `${hr} ${ampm}`;
}

export function VolunteerSignup({ events }: { events: VolunteerEventCard[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    events.find((e) => e.spots_left > 0)?.id ?? events[0]?.id ?? null
  );
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<null | "confirmed" | "waitlist">(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const selected = events.find((e) => e.id === selectedId) ?? null;

  function choose(id: string) {
    setSelectedId(id);
    setDone(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSubmit(formData: FormData) {
    setErrors({});
    setServerError(null);
    if (!selected) return;

    const raw = {
      event_id: selected.id,
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      group_size: formData.get("group_size") || "1",
      experience_level: formData.get("experience_level") || undefined,
      notes: formData.get("notes") || undefined,
      website: (formData.get("website") as string) || "",
    };

    const result = volunteerSignupSchema.safeParse(raw);
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
        const res = await fetch("/api/volunteer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.data),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setServerError(body.error || "Something went wrong. Please try again.");
          return;
        }
        setDone(body.status === "waitlist" ? "waitlist" : "confirmed");
      } catch {
        setServerError("Couldn't reach the server. Please try again.");
      }
    });
  }

  if (events.length === 0) {
    return (
      <div className="border border-bone/15 p-10 text-center">
        <p className="font-display text-2xl text-bone mb-3">
          The next build-day schedule is being finalized.
        </p>
        <p className="text-bone/60 text-sm max-w-md mx-auto">
          We publish build days at least a month in advance. Email{" "}
          <a href="mailto:hello@8thstreetconstruction.com" className="text-copper hover:text-copper-glow">
            hello@8thstreetconstruction.com
          </a>{" "}
          and we'll notify you the moment the next schedule posts.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Schedule */}
      <div className="border-t border-bone/15">
        {events.map((e) => {
          const isFull = e.spots_left <= 0;
          const isSelected = e.id === selectedId;
          return (
            <div
              key={e.id}
              className={cn(
                "grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-6 md:gap-10 items-start py-8 md:py-10 border-b border-bone/15 transition-colors",
                isSelected && "bg-bone/[0.03]"
              )}
            >
              <div className="md:pl-2">
                <div className="font-display text-4xl md:text-5xl text-parchment leading-none">
                  {fmtShortDate(e.event_date).split(" ")[1]}
                </div>
                <div className="font-mono text-[11px] tracking-[0.22em] uppercase text-copper mt-2">
                  {new Date(`${e.event_date}T00:00:00`).toLocaleDateString("en-US", {
                    month: "long",
                  })}{" "}
                  ·{" "}
                  {new Date(`${e.event_date}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display text-2xl md:text-[1.75rem] text-bone leading-snug">
                  {e.title}
                </h3>
                <p className="mt-2 text-sm text-bone/60 max-w-xl leading-relaxed">
                  {e.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-bone/45">
                  <span>{fmtTime(e.start_time)} – {fmtTime(e.end_time)}</span>
                  {e.location && <span>{e.location}</span>}
                  {e.skills_needed && <span className="text-copper/80">{e.skills_needed}</span>}
                </div>
                {e.signup_deadline && !isFull && (
                  <p className="mt-2 font-mono text-[10px] tracking-[0.16em] uppercase text-bone/35">
                    Signups close {fmtShortDate(e.signup_deadline)}
                  </p>
                )}
              </div>

              <div className="flex md:flex-col items-center md:items-end gap-4 md:gap-3 md:text-right">
                <span
                  className={cn(
                    "font-mono text-[10px] tracking-[0.18em] uppercase",
                    isFull ? "text-amber-500" : "text-emerald-400"
                  )}
                >
                  {isFull
                    ? "Full — waitlist open"
                    : `${e.spots_left} spot${e.spots_left === 1 ? "" : "s"} left`}
                </span>
                <button
                  type="button"
                  onClick={() => choose(e.id)}
                  className={cn(
                    "h-11 px-6 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors border",
                    isSelected
                      ? "bg-copper border-copper text-bone"
                      : "border-bone/25 text-bone/80 hover:border-copper hover:text-copper"
                  )}
                >
                  {isFull ? "Join Waitlist" : "Reserve Spots"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Signup form */}
      <div ref={formRef} className="scroll-mt-32 md:scroll-mt-44 pt-16 md:pt-20">
        {done ? (
          <div className="max-w-2xl">
            <span className="eyebrow-copper">
              — {done === "waitlist" ? "You're on the waitlist" : "You're on the crew"}
            </span>
            <h3 className="mt-4 font-display text-3xl md:text-4xl leading-snug text-bone">
              {done === "waitlist"
                ? "That day is full — we've added you to the waitlist."
                : "See you on site."}
            </h3>
            <p className="mt-6 text-bone/70 leading-relaxed">
              {done === "waitlist"
                ? "If a spot opens, you'll hear from us at least 72 hours before the build. A confirmation is in your inbox."
                : "A confirmation with build-day details is in your inbox. We'll follow up with site specifics one week out and a reminder 48 hours before the build."}
            </p>
            <button
              type="button"
              onClick={() => setDone(null)}
              className="mt-8 font-mono text-[10px] tracking-[0.2em] uppercase text-copper hover:text-copper-glow transition-colors"
            >
              Sign up another volunteer →
            </button>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <span className="eyebrow-copper">— Reserve your spot</span>
              <h3 className="mt-3 font-display text-3xl md:text-4xl text-bone">
                {selected ? (
                  <>
                    {selected.title.replace(/ — .*$/, "")} ·{" "}
                    <span className="italic text-copper">{fmtDate(selected.event_date)}</span>
                  </>
                ) : (
                  "Pick a build day above"
                )}
              </h3>
              {selected && selected.spots_left <= 0 && (
                <p className="mt-3 font-mono text-[11px] tracking-[0.18em] uppercase text-amber-500">
                  This day is at capacity — you'll be added to the waitlist.
                </p>
              )}
            </div>

            <form action={handleSubmit} className="flex flex-col gap-7 max-w-2xl">
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="absolute -left-[9999px] w-px h-px"
                aria-hidden="true"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="First Name" name="first_name" required dark autoComplete="given-name" error={errors.first_name} />
                <Input label="Last Name" name="last_name" required dark autoComplete="family-name" error={errors.last_name} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Email" name="email" type="email" required dark autoComplete="email" error={errors.email} />
                <Input label="Phone (optional)" name="phone" type="tel" dark autoComplete="tel" error={errors.phone} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Group Size"
                  name="group_size"
                  type="number"
                  min={1}
                  max={10}
                  defaultValue={1}
                  required
                  dark
                  error={errors.group_size}
                />
                <Select
                  label="Experience Level"
                  name="experience_level"
                  dark
                  options={EXPERIENCE}
                  error={errors.experience_level}
                />
              </div>

              <Textarea
                label="Notes (optional)"
                name="notes"
                dark
                rows={3}
                placeholder="Accessibility needs, questions, or who's coming with you"
                error={errors.notes}
              />

              {serverError && (
                <p className="text-sm font-mono tracking-wide text-copper-100">{serverError}</p>
              )}

              <div className="flex flex-col md:flex-row md:items-center gap-6 pt-2">
                <Button type="submit" disabled={pending || !selected} variant="copper" size="lg">
                  {pending
                    ? "Reserving…"
                    : selected && selected.spots_left <= 0
                    ? "Join the Waitlist"
                    : "Reserve My Spot"}
                </Button>
                <p className="text-xs font-mono tracking-wide text-bone/40">
                  Confirmation lands in your inbox immediately.
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
