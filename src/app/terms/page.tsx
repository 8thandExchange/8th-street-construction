// PLACE THIS FILE AT: app/terms/page.tsx
//
// CONFIRM BEFORE PUBLISHING (search for [CONFIRM]):
//   - LEGAL_ENTITY must match your A2P brand registration EXACTLY.
//   - MAILING_ADDRESS must be your real registered/mailing address.
//   - LAST_UPDATED is set to today. Change when you revise.
//
// NOTE: This is a strong, carrier-aligned template, not legal advice.
// Have a Georgia attorney review before relying on it.

import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { BRAND } from "@/lib/brand/assets";

const LEGAL_ENTITY = "8th Street Construction, LLC"; // [CONFIRM] match A2P registration
const MAILING_ADDRESS = "32 8th Street, Suite 201, Augusta, GA 30901";
const SUPPORT_EMAIL = "hello@8thstreetconstruction.com";
const SUPPORT_PHONE = BRAND.phone;
const LAST_UPDATED = "June 19, 2026";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms governing use of the 8th Street Construction website, including our SMS and text messaging program terms.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 text-[#1a1a18]">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#6b645a]">
        8th Street Construction
      </p>
      <h1 className="mb-2 font-serif text-4xl text-[#101c2a]">
        Terms &amp; Conditions
      </h1>
      <p className="mb-10 text-sm text-[#6b645a]">Last updated {LAST_UPDATED}</p>

      <Section title="Agreement to these terms">
        <p>
          These Terms and Conditions govern your use of the website at
          8thstreetconstruction.com, operated by {LEGAL_ENTITY} (&quot;8th Street
          Construction,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
          By using the site, submitting an inquiry, or opting in to our text
          messages, you agree to these terms. If you do not agree, please do not
          use the site.
        </p>
      </Section>

      <Section title="The website is informational">
        <p>
          The content on this site, including renderings, plan concepts, design
          descriptions, and specification ranges, is provided for general
          information and to help you explore working with us. It is not an offer,
          a quote, or a binding commitment, and it does not create a contract for
          construction. Any project we take on is governed by a separate written
          construction agreement signed by both parties, which controls in the
          event of any conflict with the site.
        </p>
        <p>
          Architectural renderings and plan concepts shown on the site are
          illustrative. Final design, dimensions, materials, and pricing are
          determined during design development for your specific site and are
          confirmed in your construction agreement.
        </p>
      </Section>

      <Section title="Intellectual property">
        <p>
          The site and its content, including text, logos, the Heritage Rendering
          mark, photographs, and design, are owned by 8th Street Construction or
          its licensors and are protected by law. Plan and drawing concepts may be
          owned by their respective designers. You may not copy, reproduce, or
          distribute any content without our written permission.
        </p>
      </Section>

      <Section title="SMS and text messaging terms">
        <p>
          By providing your mobile number and agreeing to the consent language on
          our chat widget, you agree to receive text messages
          from {LEGAL_ENTITY} related to your inquiry and project. The following
          terms apply to our messaging program.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong>Program.</strong> We send informational and transactional
            messages, such as replies to your question, scheduling, and project
            updates. We do not send marketing messages unless you separately opt
            in.
          </li>
          <li>
            <strong>Frequency.</strong> Message frequency varies based on your
            conversation with us.
          </li>
          <li>
            <strong>Cost.</strong> Message and data rates may apply, depending on
            your mobile carrier and plan.
          </li>
          <li>
            <strong>Opt out.</strong> Reply STOP to any message to stop receiving
            texts. You will receive one confirmation, and no further messages
            unless you opt in again.
          </li>
          <li>
            <strong>Help.</strong> Reply HELP for help, or email {SUPPORT_EMAIL}.
          </li>
          <li>
            <strong>Carriers.</strong> Mobile carriers are not liable for delayed
            or undelivered messages.
          </li>
          <li>
            <strong>Consent.</strong> Consent to receive text messages is not a
            condition of any purchase.
          </li>
        </ul>
      </Section>

      <Section title="No warranties">
        <p>
          The site is provided &quot;as is&quot; and &quot;as available,&quot;
          without warranties of any kind, express or implied, to the fullest
          extent permitted by law. We do not warrant that the site will be
          uninterrupted, error free, or free of harmful components.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, {LEGAL_ENTITY} will not be
          liable for any indirect, incidental, special, or consequential damages
          arising from your use of the site. This section does not affect the
          terms of any signed construction agreement, which governs the work we
          perform for you.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of the State of Georgia, without
          regard to its conflict of laws rules. Any dispute relating to the site
          or these terms will be brought in the state or federal courts located
          in Richmond County, Georgia.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms from time to time. When we do, we will revise
          the &quot;Last updated&quot; date above. Your continued use of the site
          after changes are posted means you accept the updated terms.
        </p>
      </Section>

      <Section title="Contact us">
        <p>Questions about these terms can be sent to:</p>
        <p className="mt-3">
          {LEGAL_ENTITY}
          <br />
          {MAILING_ADDRESS}
          <br />
          {SUPPORT_EMAIL}
          <br />
          {SUPPORT_PHONE}
        </p>
      </Section>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-serif text-2xl text-[#101c2a]">{title}</h2>
      <div className="space-y-4 leading-relaxed text-[#1a1a18]/90">{children}</div>
    </section>
  );
}
