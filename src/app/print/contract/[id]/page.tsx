import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { minutesMarkdownToHtml } from "@/lib/meetings/minutes-format";
import { EMAIL_BRAND } from "@/lib/email/brand";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Print-ready agreement — print to PDF from the browser, then upload it
 * to the e-sign service (BoldSign) or sign on paper. The countersigned
 * copy comes back to the Contracts page as a signed file.
 */
export default async function ContractPrintPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/admin`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/admin");

  const { data: contract } = await supabase
    .from("project_contracts")
    .select("*, projects(title, street_address)")
    .eq("id", id)
    .single();
  if (!contract) notFound();

  const { ink, pencil, rust, border } = EMAIL_BRAND;
  const bodyHtml = minutesMarkdownToHtml(contract.body_md, {
    ink,
    pencil,
    rust,
    border,
  });

  return (
    <div className="mx-auto max-w-2xl bg-white p-10 print:p-0 text-ink">
      <div className="mb-6 flex items-baseline justify-between border-b-2 border-ink/80 pb-4">
        <div>
          <div className="font-display text-2xl">8th Street Construction</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-ink/50">
            Agreement #{contract.number}
            {contract.status === "draft" ? " · draft" : ""}
          </div>
        </div>
        <div className="text-right text-sm text-ink/60">
          {new Date(contract.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>

      <div className="prose-sm" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      <p className="mt-10 text-center text-[10px] text-ink/40 print:hidden">
        Use your browser&apos;s print dialog to save this as a PDF.
      </p>
    </div>
  );
}
