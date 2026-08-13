import { getSiteUrl } from "@/lib/brand/assets";
import { EMAIL_BRAND } from "../brand";
import { emailLayout, escapeHtml } from "../layout";
import { minutesMarkdownToHtml } from "@/lib/meetings/minutes-format";

const { ink, pencil, rust, paper, border } = EMAIL_BRAND;

type ProposalRow = {
  number: number;
  title: string;
  scope_md: string;
  terms_md: string | null;
  amount: number | string;
};

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * The proposal, in the client's inbox, in full — same narrow markdown
 * renderer the minutes email uses, so scope text formats consistently.
 */
export function proposalEmail(payload: {
  firstName: string;
  projectTitle: string;
  proposal: ProposalRow;
}) {
  const { firstName, projectTitle, proposal } = payload;
  const amount = usd(Number(proposal.amount));
  const site = getSiteUrl();

  const body = `
    <p style="font-size:16px;line-height:1.6;color:${ink};margin:0 0 20px;">
      ${escapeHtml(firstName)}, here is our proposal for ${escapeHtml(projectTitle)}.
    </p>
    <div style="padding:16px 20px;background:${paper};border-left:3px solid ${rust};margin:0 0 28px;">
      <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${pencil};">Proposal #${proposal.number}</div>
      <div style="font-size:20px;color:${ink};margin-top:6px;">${escapeHtml(proposal.title)}</div>
      <div style="font-size:24px;color:${ink};margin-top:10px;font-weight:500;">${amount}</div>
    </div>
    <h2 style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${pencil};margin:0 0 10px;">Scope of work</h2>
    ${minutesMarkdownToHtml(proposal.scope_md, { ink, pencil, rust, border })}
    ${
      proposal.terms_md
        ? `<h2 style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${pencil};margin:28px 0 10px;">Terms</h2>
           ${minutesMarkdownToHtml(proposal.terms_md, { ink, pencil, rust, border })}`
        : ""
    }
    <p style="font-size:14px;line-height:1.6;color:${ink};margin:28px 0 0;">
      Reply to this email to accept or with any questions — we'll confirm in writing either way.
    </p>
  `;

  return {
    subject: `Proposal #${proposal.number} — ${projectTitle} — ${amount}`,
    html: emailLayout({
      title: `Proposal — ${projectTitle}`,
      preheader: `${proposal.title} — ${amount}`,
      body,
    }),
    text: `Proposal #${proposal.number} — ${proposal.title}\n${projectTitle}\nPrice: ${amount}\n\nSCOPE OF WORK\n${proposal.scope_md}\n${proposal.terms_md ? `\nTERMS\n${proposal.terms_md}\n` : ""}\nReply to this email to accept or with any questions.\n${site}`,
  };
}
