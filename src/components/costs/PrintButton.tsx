"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="app-btn app-btn-accent">
      <Printer className="w-4 h-4" />
      Print
    </button>
  );
}
