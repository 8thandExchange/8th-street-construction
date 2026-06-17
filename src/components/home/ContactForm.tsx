"use client";

import { Suspense } from "react";
import { LeadForm } from "@/components/forms/LeadForm";

export function ContactForm() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse bg-navy-100/30 rounded-sm" aria-hidden />}>
      <LeadForm dark />
    </Suspense>
  );
}
