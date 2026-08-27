import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement as h, type ReactNode } from "react";
import {
  Document,
  Image,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * The e-sign rendition of a contract: the agreement text as flowing pages,
 * then ONE fixed-layout execution page, then the exhibits. The execution
 * page is laid out with absolute coordinates so the BoldSign signature and
 * date fields can be positioned deterministically — the whole reason this
 * renderer exists instead of the print page. EXECUTION_FIELDS below and
 * the boxes drawn on that page are the same numbers by construction.
 *
 * The agreement body already carries an inline "IN WITNESS WHEREOF"
 * section for the print/paper path; for e-sign we lift that section out
 * (signatures happen on the execution page) and keep everything else
 * verbatim. Built with createElement rather than JSX so the module stays
 * importable everywhere the server needs it (including vitest, which
 * doesn't compile Next's preserved JSX).
 */

const INK = "#1a1a18";
const MUTED = "#6b645a";
const NAVY = "#101c2a";
const COPPER = "#b5451b";
const PARCHMENT = "#f0ead9";
const GRID = "#e0ddd6";
const TINT = "#f7f5f0";

/** The brand icon, parchment-recolored for the navy masthead. Best-effort:
 * a missing file just renders the masthead without the mark. */
function loadBrandIcon(): string | null {
  try {
    const png = readFileSync(
      join(process.cwd(), "public", "brand", "esign-icon-parchment.png")
    );
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

// Letter, points, origin top-left — the space BoldSign bounds use too.
const PAGE = { width: 612, height: 792 } as const;
const MARGIN = 48;

export const EXECUTION_FIELDS = {
  contractorSignature: { x: 48, y: 250, width: 230, height: 44 },
  contractorDate: { x: 48, y: 336, width: 150, height: 22 },
  ownerSignature: { x: 334, y: 250, width: 230, height: 44 },
  ownerDate: { x: 334, y: 336, width: 150, height: 22 },
} as const;

const styles = {
  page: {
    paddingTop: 76,
    paddingBottom: 64,
    paddingHorizontal: MARGIN,
    fontFamily: "Times-Roman",
    fontSize: 10.5,
    lineHeight: 1.35,
    color: INK,
  },
  title: { fontFamily: "Helvetica-Bold", fontSize: 17, marginBottom: 2, lineHeight: 1.2 },
  subtitle: { fontFamily: "Helvetica", fontSize: 10, color: MUTED, marginBottom: 10 },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11.5,
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 1.2,
  },
  body: { marginBottom: 6 },
  rule: { borderBottomWidth: 0.7, borderBottomColor: INK, marginVertical: 8 },
  bold: { fontFamily: "Times-Bold" },
  footer: {
    position: "absolute" as const,
    left: MARGIN,
    right: MARGIN,
    bottom: 30,
    fontSize: 7.5,
    fontFamily: "Helvetica",
    color: MUTED,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
};

/** **bold** spans become Times-Bold runs; everything else passes through. */
function inline(text: string, keyBase: string): ReactNode[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((piece, i) =>
      i % 2 === 1
        ? h(Text, { key: `${keyBase}-${i}`, style: styles.bold }, piece)
        : piece
    );
}

function flowingBlocks(blocks: string[]): ReactNode[] {
  let firstRuleSeen = false;
  return blocks.map((block, i) => {
    if (block === "---") {
      firstRuleSeen = true;
      return h(View, { key: i, style: styles.rule });
    }
    if (block.startsWith("# ")) {
      return h(Text, { key: i, style: styles.title }, block.slice(2));
    }
    if (block.startsWith("## ")) {
      return h(Text, { key: i, style: styles.h2 }, ...inline(block.slice(3), `h${i}`));
    }
    if (!firstRuleSeen && !block.startsWith("**") && block.length < 90) {
      return h(Text, { key: i, style: styles.subtitle }, block);
    }
    return h(Text, { key: i, style: styles.body }, ...inline(block, `b${i}`));
  });
}

// Page numbers are stamped after the merge (react-pdf would restart the
// count in each part), so the react-pdf footer carries only the label.
function footer(label: string): ReactNode {
  return h(View, { style: styles.footer, fixed: true }, h(Text, null, label));
}

/** The small brand line that runs across the top of every page, exactly as
 * the executed 608 Macon agreement carries it. */
function runningHeader(): ReactNode {
  return h(
    View,
    {
      fixed: true,
      style: {
        position: "absolute",
        top: 26,
        left: MARGIN,
        right: MARGIN,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        borderBottomWidth: 0.8,
        borderBottomColor: GRID,
        paddingBottom: 6,
      },
    },
    h(
      Text,
      {
        style: {
          fontFamily: "Helvetica-Bold",
          fontSize: 7.5,
          letterSpacing: 1.5,
          color: NAVY,
        },
      },
      "8TH STREET CONSTRUCTION"
    ),
    h(
      Text,
      { style: { fontFamily: "Helvetica", fontSize: 7.5, color: MUTED } },
      "Residential Construction Agreement"
    )
  );
}

type HeaderRow = { label: string; value: string };

/** Pull the title, subtitle, and **Key** value rows out of the blocks that
 * precede the first horizontal rule; everything else keeps flowing. */
export function parseContractHeader(blocks: string[]): {
  title: string | null;
  subtitle: string | null;
  rows: HeaderRow[];
  rest: string[];
} {
  const firstRule = blocks.indexOf("---");
  if (firstRule < 0) return { title: null, subtitle: null, rows: [], rest: blocks };

  let title: string | null = null;
  let subtitle: string | null = null;
  const rows: HeaderRow[] = [];
  const leftovers: string[] = [];

  for (const block of blocks.slice(0, firstRule)) {
    const kv = block.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
    if (block.startsWith("# ")) title = block.slice(2);
    else if (kv) rows.push({ label: kv[1], value: kv[2].trim() });
    else if (!subtitle && block.length < 90) subtitle = block;
    else leftovers.push(block);
  }

  return { title, subtitle, rows, rest: [...leftovers, ...blocks.slice(firstRule + 1)] };
}

/** The navy masthead + tinted info table from the executed Macon layout. */
function brandedFrontMatter(header: ReturnType<typeof parseContractHeader>): ReactNode[] {
  const icon = loadBrandIcon();
  const out: ReactNode[] = [
    h(
      View,
      {
        style: {
          backgroundColor: NAVY,
          borderRadius: 3,
          paddingVertical: 18,
          paddingHorizontal: 22,
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 18,
        },
      },
      icon
        ? h(Image, {
            src: icon,
            style: { width: 42, height: 54, marginRight: 18 },
          })
        : null,
      h(
        View,
        { style: { flexGrow: 1 } },
        h(
          Text,
          { style: { fontFamily: "Times-Bold", fontSize: 24, color: PARCHMENT } },
          "8th Street"
        ),
        h(
          Text,
          {
            style: {
              fontFamily: "Helvetica",
              fontSize: 8.5,
              letterSpacing: 4,
              color: "#8fa0b5",
              marginTop: 2,
            },
          },
          "CONSTRUCTION"
        ),
        h(View, {
          style: {
            borderBottomWidth: 1.2,
            borderBottomColor: COPPER,
            width: 200,
            marginTop: 8,
            marginBottom: 6,
          },
        }),
        h(
          Text,
          { style: { fontFamily: "Times-Italic", fontSize: 9, color: "#8fa0b5" } },
          "Augusta, Georgia"
        )
      )
    ),
  ];

  if (header.title) {
    out.push(
      h(
        Text,
        {
          style: {
            fontFamily: "Helvetica-Bold",
            fontSize: 20,
            color: NAVY,
            marginBottom: 2,
            lineHeight: 1.2,
          },
        },
        header.title
      )
    );
  }
  if (header.subtitle) {
    out.push(
      h(
        Text,
        { style: { fontFamily: "Helvetica", fontSize: 10, color: MUTED, marginBottom: 12 } },
        header.subtitle
      )
    );
  }

  if (header.rows.length > 0) {
    out.push(
      h(
        View,
        { style: { borderWidth: 0.8, borderColor: GRID, marginBottom: 16 } },
        ...header.rows.map((row, i) =>
          h(
            View,
            {
              key: i,
              style: {
                flexDirection: "row",
                borderTopWidth: i === 0 ? 0 : 0.8,
                borderTopColor: GRID,
              },
            },
            h(
              Text,
              {
                style: {
                  width: 110,
                  backgroundColor: TINT,
                  fontFamily: "Helvetica-Bold",
                  fontSize: 9,
                  color: NAVY,
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                },
              },
              row.label
            ),
            h(
              Text,
              {
                style: {
                  flexGrow: 1,
                  flexShrink: 1,
                  fontFamily: "Helvetica",
                  fontSize: 9.5,
                  color: INK,
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                },
              },
              row.value
            )
          )
        )
      )
    );
  }

  return out;
}

type PartyBlock = { heading: string; signatory: string };
type Bounds = { x: number; y: number; width: number; height: number };

function signatureBox(
  party: PartyBlock,
  sig: Bounds,
  date: { x: number; y: number; width: number }
): ReactNode[] {
  return [
    h(
      Text,
      {
        key: "heading",
        style: {
          position: "absolute",
          left: sig.x,
          top: sig.y - 46,
          width: 250,
          fontFamily: "Helvetica-Bold",
          fontSize: 10,
        },
      },
      party.heading
    ),
    // The signature line sits at the bottom edge of the BoldSign field box.
    h(View, {
      key: "sig-line",
      style: {
        position: "absolute",
        left: sig.x,
        top: sig.y + sig.height,
        width: sig.width,
        borderBottomWidth: 0.8,
        borderBottomColor: INK,
      },
    }),
    h(
      Text,
      {
        key: "by",
        style: {
          position: "absolute",
          left: sig.x,
          top: sig.y + sig.height + 6,
          width: 260,
          fontSize: 10,
        },
      },
      `By: ${party.signatory}`
    ),
    h(View, {
      key: "date-line",
      style: {
        position: "absolute",
        left: date.x + 32,
        top: date.y + 22,
        width: date.width,
        borderBottomWidth: 0.8,
        borderBottomColor: INK,
      },
    }),
    h(
      Text,
      {
        key: "date-label",
        style: { position: "absolute", left: date.x, top: date.y + 8, fontSize: 10 },
      },
      "Date:"
    ),
  ];
}

function executionPage(props: {
  label: string;
  witnessText: string;
  contractor: PartyBlock;
  owner: PartyBlock;
}): ReactNode {
  return h(
    Document,
    null,
    h(
      Page,
      { size: "LETTER", style: styles.page },
      runningHeader(),
      h(Text, { style: styles.h2 }, "Execution"),
      h(
        Text,
        {
          style: {
            position: "absolute",
            left: MARGIN,
            top: 100,
            width: PAGE.width - MARGIN * 2,
          },
        },
        props.witnessText
      ),
      ...signatureBox(
        props.contractor,
        EXECUTION_FIELDS.contractorSignature,
        EXECUTION_FIELDS.contractorDate
      ),
      ...signatureBox(
        props.owner,
        EXECUTION_FIELDS.ownerSignature,
        EXECUTION_FIELDS.ownerDate
      ),
      footer(props.label)
    )
  );
}

export type ContractEsignRender = {
  pdf: Buffer;
  /** 1-based page the signature/date fields live on. */
  executionPageNumber: number;
};

const WITNESS_DEFAULT =
  "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date by electronic signature under the Georgia Uniform Electronic Transactions Act, O.C.G.A. § 10-12-1 et seq.";

/**
 * Split the body at its inline signature section (the "IN WITNESS WHEREOF"
 * block through the next horizontal rule). Returns the flowing halves and
 * whatever party headings/signatories the inline section carried, so the
 * execution page prints the same names the paper version would have.
 */
export function splitBodyForEsign(bodyMd: string): {
  before: string[];
  after: string[];
  witnessText: string;
  contractor: PartyBlock;
  owner: PartyBlock;
} {
  const blocks = bodyMd
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const start = blocks.findIndex((b) => b.startsWith("IN WITNESS WHEREOF"));
  let end = start < 0 ? -1 : blocks.findIndex((b, i) => i > start && b === "---");
  if (start >= 0 && end < 0) end = blocks.length;

  const stripped = start >= 0 ? blocks.slice(start, end) : [];
  const headings = stripped.filter((b) => b.startsWith("**"));
  const signatories = stripped
    .filter((b) => b.startsWith("By:"))
    .map((b) => b.slice(3).trim());

  const clean = (heading: string | undefined, fallback: string) =>
    heading ? heading.replace(/\*\*/g, "") : fallback;

  return {
    before: start >= 0 ? blocks.slice(0, start) : blocks,
    after: start >= 0 ? blocks.slice(end + 1) : [],
    witnessText: stripped[0] ?? WITNESS_DEFAULT,
    contractor: {
      heading: clean(headings[0], "CONTRACTOR — 8th Street Construction LLC"),
      signatory: signatories[0] ?? "Troy W. Akers, Managing Principal",
    },
    owner: {
      heading: clean(headings[1], "OWNER"),
      signatory: signatories[1] ?? "Authorized signatory",
    },
  };
}

export async function renderContractEsignPdf(input: {
  bodyMd: string;
  footerLabel: string;
}): Promise<ContractEsignRender> {
  const { before, after, witnessText, contractor, owner } = splitBodyForEsign(
    input.bodyMd
  );

  const renderFlow = (blocks: string[], frontMatter: ReactNode[] = []) =>
    renderToBuffer(
      h(
        Document,
        null,
        h(
          Page,
          { size: "LETTER", style: styles.page },
          runningHeader(),
          ...frontMatter,
          ...flowingBlocks(blocks),
          footer(input.footerLabel)
        )
      ) as Parameters<typeof renderToBuffer>[0]
    );

  const header = parseContractHeader(before);
  const [bodyPdf, executionPdf, exhibitsPdf] = await Promise.all([
    renderFlow(header.rest, brandedFrontMatter(header)),
    renderToBuffer(
      executionPage({
        label: input.footerLabel,
        witnessText,
        contractor,
        owner,
      }) as Parameters<typeof renderToBuffer>[0]
    ),
    after.length > 0 ? renderFlow(after) : Promise.resolve(null),
  ]);

  const merged = await PDFDocument.create();
  const parts = [bodyPdf, executionPdf, exhibitsPdf].filter((p): p is Buffer => p !== null);
  let executionPageNumber = 0;
  for (const [index, part] of parts.entries()) {
    const doc = await PDFDocument.load(part);
    if (index === 1) executionPageNumber = merged.getPageCount() + 1;
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }

  const helvetica = await merged.embedFont(StandardFonts.Helvetica);
  const gray = rgb(0.42, 0.39, 0.35);
  const total = merged.getPageCount();
  for (const [index, page] of merged.getPages().entries()) {
    const text = `Page ${index + 1} of ${total}`;
    page.drawText(text, {
      x: PAGE.width - MARGIN - helvetica.widthOfTextAtSize(text, 7.5),
      y: 30,
      size: 7.5,
      font: helvetica,
      color: gray,
    });
  }

  return {
    pdf: Buffer.from(await merged.save()),
    executionPageNumber,
  };
}
