// PLACE THIS FILE AT: app/privacy/page.tsx
//
// CONFIRM BEFORE PUBLISHING (search for [CONFIRM]):
//   - LEGAL_ENTITY must match your A2P brand registration EXACTLY.
//   - MAILING_ADDRESS must be your real registered/mailing address.
//   - SUPPORT_PHONE is optional. Remove the line if you do not want a public number.
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
  title: "Privacy Policy",
  description:
    "How 8th Street Construction collects, uses, and protects your information, including our SMS and text messaging privacy practices.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 text-[#1a1a18]">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#6b645a]">
        8th Street Construction
      </p>
      <h1 className="mb-2 font-serif text-4xl text-[#101c2a]">Privacy Policy</h1>
      <p className="mb-10 text-sm text-[#6b645a]">Last updated {LAST_UPDATED}</p>

      <Section title="Who we are">
        <p>
          {LEGAL_ENTITY} (&quot;8th Street Construction,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;) is a residential and commercial
          builder based in Augusta, Georgia, operating as a division of 8th and
          Exchange Capital. This policy explains what information we collect
          through our website at 8thstreetconstruction.com, how we use it, and
          the choices you have. It includes a specific section on how we handle
          mobile phone numbers and text messaging.
        </p>
      </Section>

      <Section title="Information we collect">
        <p>We collect only what we need to respond to you and do our work.</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong>Information you give us.</strong> When you submit a contact
            form, request a consultation, or use the chat widget, we collect your
            name, phone number, email address, and the details of your message or
            project inquiry.
          </li>
          <li>
            <strong>Information collected automatically.</strong> Like most
            websites, we collect basic technical and usage data such as IP
            address, browser type, pages viewed, and referring source, through
            cookies and similar technologies.
          </li>
        </ul>
      </Section>

      <Section title="How we use your information">
        <p>We use the information you provide to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Respond to your inquiry and schedule consultations.</li>
          <li>
            Send informational and transactional messages related to your
            inquiry or project, including by text message if you have provided
            your number and consented.
          </li>
          <li>Operate, maintain, and improve our website.</li>
          <li>Meet legal, tax, and recordkeeping obligations.</li>
        </ul>
      </Section>

      <Section title="SMS and text messaging">
        <p>
          If you provide your mobile number and agree to the consent language in
          our chat widget, you authorize {LEGAL_ENTITY} to send
          you text messages related to your inquiry and project. These are
          informational and transactional messages, such as replies to your
          question, scheduling, and project updates. We do not send marketing
          text messages unless you have separately opted in to receive them.
        </p>
        <p className="mt-4 rounded-md border border-[#101c2a]/15 bg-[#f2ece0] p-4">
          <strong>
            No mobile information will be shared with or sold to third parties or
            affiliates for marketing or promotional purposes.
          </strong>{" "}
          We share mobile information only with the vendors that help us deliver
          the messaging service itself (for example, our messaging platform and
          telecommunications providers), and only so those messages can be sent.
          Text messaging originator opt-in data and consent are never shared with
          any third party for their own purposes.
        </p>
        <p className="mt-4">
          Message frequency varies. Message and data rates may apply. Reply STOP
          to any message to opt out at any time. Reply HELP for help, or contact
          us at {SUPPORT_EMAIL}. Consent to receive text messages is not a
          condition of any purchase.
        </p>
      </Section>

      <Section title="How we share information">
        <p>
          We do not sell your personal information. We share it only in these
          limited situations:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong>Service providers.</strong> Vendors who help us run our
            business and communicate with you, such as our customer relationship
            and messaging platform, email host, and analytics provider. They may
            use your information only to perform services for us.
          </li>
          <li>
            <strong>Legal and safety.</strong> When required by law, or to
            protect our rights, property, or safety, or that of others.
          </li>
          <li>
            <strong>Business transfers.</strong> In connection with a merger,
            acquisition, or sale of assets, subject to this policy.
          </li>
        </ul>
        <p className="mt-4">
          As stated above, mobile opt-in information is excluded from sharing for
          any third-party marketing purpose.
        </p>
      </Section>

      <Section title="Cookies and analytics">
        <p>
          We use cookies and similar technologies to keep the site working, to
          remember your preferences, and to understand how the site is used. You
          can control cookies through your browser settings. Disabling some
          cookies may affect how parts of the site function.
        </p>
      </Section>

      <Section title="Data security">
        <p>
          We use reasonable administrative, technical, and physical safeguards to
          protect the information we collect. No method of transmission or storage
          is completely secure, so we cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="Your choices">
        <ul className="mt-1 list-disc space-y-2 pl-5">
          <li>Opt out of text messages at any time by replying STOP.</li>
          <li>
            Ask us to access, correct, or delete the personal information we hold
            about you by emailing {SUPPORT_EMAIL}.
          </li>
          <li>Control cookies through your browser.</li>
        </ul>
      </Section>

      <Section title="Children's privacy">
        <p>
          Our website is not directed to children, and we do not knowingly
          collect personal information from anyone under 18. If you believe a
          child has provided us information, contact us and we will delete it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          We may update this policy from time to time. When we do, we will revise
          the &quot;Last updated&quot; date above. Material changes will be posted
          on this page.
        </p>
      </Section>

      <Section title="Contact us">
        <p>Questions about this policy or your information can be sent to:</p>
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
