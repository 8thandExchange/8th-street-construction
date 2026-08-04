"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip } from "lucide-react";
import {
  createVendor,
  updateVendorLogo,
  recordVendorBill,
} from "@/lib/actions/vendors";

async function stageFile(file: File): Promise<{ path?: string; error?: string }> {
  const form = new FormData();
  form.set("file", file);
  const res = await fetch("/api/assistant/upload", { method: "POST", body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.storage_path) return { error: json?.error ?? "Upload failed" };
  return { path: String(json.storage_path) };
}

export function AddVendorForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const logo = logoRef.current?.files?.[0];
      if (logo) {
        const staged = await stageFile(logo);
        if (staged.error) {
          setError(staged.error);
          return;
        }
        fd.set("logo_staged_path", staged.path!);
      }
      const result = await createVendor(fd);
      if (result && "error" in result && result.error) {
        setError(String(result.error));
        return;
      }
      formRef.current?.reset();
      setLogoName(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="field-label">Vendor name *</label>
        <input name="name" required placeholder="Monte Cristo Consulting" className="field-input w-full" />
      </div>
      <div>
        <label className="field-label">Email</label>
        <input name="contact_email" type="email" placeholder="billing@vendor.com" className="field-input w-full" />
      </div>
      <div>
        <label className="field-label">Phone</label>
        <input name="phone" placeholder="(706) 555-0100" className="field-input w-full" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Notes</label>
        <input name="notes" placeholder="What they do for you" className="field-input w-full" />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <input
          ref={logoRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.gif"
          className="hidden"
          onChange={(e) => setLogoName(e.target.files?.[0]?.name ?? null)}
        />
        <button
          type="button"
          onClick={() => logoRef.current?.click()}
          className="app-btn app-btn-secondary !h-9"
        >
          <Paperclip size={14} strokeWidth={1.75} />
          <span className="ml-1.5">{logoName ?? "Attach logo (optional)"}</span>
        </button>
        <button type="submit" disabled={busy} className="app-btn app-btn-primary !h-9 ml-auto">
          {busy && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          Save vendor
        </button>
      </div>
      {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function VendorLogoUpload({ vendorId, hasLogo }: { vendorId: string; hasLogo: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const staged = await stageFile(file);
      if (staged.error) {
        setError(staged.error);
        return;
      }
      const fd = new FormData();
      fd.set("vendor_id", vendorId);
      fd.set("logo_staged_path", staged.path!);
      const result = await updateVendorLogo(fd);
      if (result && "error" in result && result.error) setError(String(result.error));
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.gif"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="text-[12px] font-medium text-copper hover:underline disabled:opacity-50"
      >
        {busy ? "Uploading…" : hasLogo ? "Replace logo" : "Upload logo"}
      </button>
      {error && <span className="ml-2 text-[12px] text-red-600">{error}</span>}
    </span>
  );
}

export function RecordBillForm({
  vendorId,
  projects,
}: {
  vendorId: string;
  projects: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("vendor_id", vendorId);
      const file = fileRef.current?.files?.[0];
      if (file) {
        const staged = await stageFile(file);
        if (staged.error) {
          setError(staged.error);
          return;
        }
        fd.set("file_staged_path", staged.path!);
      }
      const result = await recordVendorBill(fd);
      if (result && "error" in result && result.error) {
        setError(String(result.error));
        return;
      }
      formRef.current?.reset();
      setFileName(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label">Description *</label>
        <input name="title" required placeholder="Consulting — July" className="field-input w-full" />
      </div>
      <div>
        <label className="field-label">Amount ($) *</label>
        <input name="amount" required type="number" step="0.01" min="0.01" placeholder="2500" className="field-input w-full" />
      </div>
      <div>
        <label className="field-label">Their invoice #</label>
        <input name="bill_number" placeholder="MC-1042" className="field-input w-full" />
      </div>
      <div>
        <label className="field-label">Job (optional)</label>
        <select name="project_id" className="field-input w-full" defaultValue="">
          <option value="">— Company overhead —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Invoice date</label>
        <input name="issued_date" type="date" className="field-input w-full" />
      </div>
      <div>
        <label className="field-label">Due date</label>
        <input name="due_date" type="date" className="field-input w-full" />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="app-btn app-btn-secondary !h-9"
        >
          <Paperclip size={14} strokeWidth={1.75} />
          <span className="ml-1.5">{fileName ?? "Attach their invoice (PDF)"}</span>
        </button>
        <button type="submit" disabled={busy} className="app-btn app-btn-primary !h-9 ml-auto">
          {busy && <Loader2 size={14} className="mr-1.5 animate-spin" />}
          Record bill
        </button>
      </div>
      {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
