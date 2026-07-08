"use client";

import { Printer } from "lucide-react";

/** Opens the browser print dialog — "Save as PDF" produces the submission file. */
export function PrintPacketButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-2 rounded-lg bg-navy px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-90 print:hidden"
    >
      <Printer size={15} strokeWidth={1.75} />
      Print / Save as PDF
    </button>
  );
}
