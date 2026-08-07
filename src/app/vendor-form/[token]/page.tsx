import Image from "next/image";
import { notFound } from "next/navigation";
import { BRAND } from "@/lib/brand/assets";
import { VendorOnboardingForm } from "@/components/vendors/VendorOnboardingForm";
import { resolveInvite } from "@/lib/vendors/onboarding";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Setup — 8th Street Construction",
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bone">
      <header className="bg-navy">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-4 px-6 py-6 md:px-8">
          <Image
            src="/img/logo-horizontal-navy.svg"
            alt={BRAND.name}
            width={220}
            height={52}
            className="h-10 w-auto"
            priority
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-parchment/50">
            {BRAND.tagline}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10 md:px-8 md:py-14">{children}</main>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <div className="app-card p-8 text-center">
        <h1 className="font-display text-2xl tracking-tight text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">{body}</p>
        <p className="mt-6 text-sm text-ink/60">
          Questions? Call us at{" "}
          <a href={`tel:${BRAND.phone.replace(/\D/g, "")}`} className="text-copper hover:underline">
            {BRAND.phone}
          </a>
          .
        </p>
      </div>
    </Shell>
  );
}

export default async function VendorFormPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const invite = await resolveInvite(token);

  if (invite.state === "invalid") notFound();

  if (invite.state === "expired") {
    return (
      <Notice
        title="This link has expired"
        body="For security, vendor setup links stop working after two weeks. Let us know and we'll send you a fresh one — it only takes a moment."
      />
    );
  }

  if (invite.state === "completed") {
    return (
      <Notice
        title="You're all set"
        body={`We've already received ${invite.vendorName}'s details, and this link has been closed. If something needs correcting, get in touch and we'll send a new form.`}
      />
    );
  }

  return (
    <Shell>
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-copper">Vendor setup</p>
        <h1 className="mt-2 font-display text-3xl tracking-tight text-ink md:text-4xl">
          {invite.vendor.name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">
          Fill this in once and we can pay you by bank transfer instead of mailing checks. Takes
          about three minutes. This page is private to you and closes after you submit.
        </p>
      </div>
      <VendorOnboardingForm token={token} vendor={invite.vendor} />
    </Shell>
  );
}
