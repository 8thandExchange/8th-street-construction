"use client";

export function DeleteLeadButton({ leadName }: { leadName: string }) {
  return (
    <button
      type="submit"
      className="text-xs font-mono tracking-[0.18em] uppercase text-red-600/80 hover:text-red-700"
      onClick={(e) => {
        if (!confirm(`Delete lead for ${leadName}? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      Delete
    </button>
  );
}
