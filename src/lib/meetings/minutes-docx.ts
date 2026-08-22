import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { renderMinutesMarkdown, type MinutesBundle } from "./minutes-format";

/**
 * Minutes as a Word document. Built from the same canonical markdown as the
 * on-screen record and the emailed copy, so the .docx someone downloads (or
 * prints, or edits into a board packet) is the same text the system holds.
 *
 * The parser is deliberately narrow, mirroring minutesMarkdownToHtml: it
 * handles exactly what renderMinutesMarkdown emits — headings, bullets,
 * numbered lists, bold, italics, and the closing rule.
 */

const INK = "1A1A18";
const NAVY = "101C2A";
const PENCIL = "6B645A";
const BORDER = "D9CDB8";

const NUMBERING_REF = "minutes-decisions";

/** Split a line into runs, honoring **bold** and _italic_ spans. */
function inlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
    } else {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs;
}

function markdownToParagraphs(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          children: inlineRuns(line.slice(4)),
          heading: "Heading3",
          spacing: { before: 240, after: 80 },
        })
      );
      continue;
    }
    if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line.slice(3).toUpperCase() })],
          heading: "Heading2",
          spacing: { before: 360, after: 120 },
        })
      );
      continue;
    }
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          children: inlineRuns(line.slice(2)),
          heading: "Heading1",
          spacing: { after: 80 },
        })
      );
      continue;
    }
    if (line.trim() === "---") {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 240, after: 240 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: BORDER },
          },
        })
      );
      continue;
    }

    const bullet = line.match(/^\s*- (.*)$/);
    if (bullet) {
      paragraphs.push(
        new Paragraph({
          children: inlineRuns(bullet[1]),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numbered) {
      paragraphs.push(
        new Paragraph({
          children: inlineRuns(numbered[1]),
          numbering: { reference: NUMBERING_REF, level: 0 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // Continuation lines (rationale under a decision, detail under an action
    // item) arrive indented in the markdown; keep them visually nested.
    const indented = /^\s{2,}/.test(raw);
    paragraphs.push(
      new Paragraph({
        children: inlineRuns(line.trim()),
        spacing: { after: 100 },
        indent: indented ? { left: 360 } : undefined,
      })
    );
  }

  return paragraphs;
}

export async function renderMinutesDocx(bundle: MinutesBundle): Promise<Buffer> {
  const markdown = bundle.meeting.approved_snapshot || renderMinutesMarkdown(bundle);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: INK },
          paragraph: { spacing: { line: 300 } },
        },
        heading1: {
          run: { font: "Georgia", size: 44, color: NAVY, bold: false },
          paragraph: { spacing: { after: 80 } },
        },
        heading2: {
          run: { font: "Calibri", size: 20, color: PENCIL, bold: true },
          paragraph: {
            spacing: { before: 360, after: 120 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
            },
          },
        },
        heading3: {
          run: { font: "Calibri", size: 24, color: NAVY, bold: true },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: NUMBERING_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 360, hanging: 260 } } },
            },
          ],
        },
      ],
    },
    sections: [{ children: markdownToParagraphs(markdown) }],
  });

  return Packer.toBuffer(doc);
}

/** e.g. "Minutes - Monthly Coordination - 2026-08-12.docx" */
export function minutesDocxFilename(meeting: MinutesBundle["meeting"]): string {
  const title = meeting.title.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim();
  return `Minutes - ${title || "Meeting"} - ${meeting.meeting_date}.docx`;
}
