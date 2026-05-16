import Link from "next/link";

interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  accent?: boolean;
}

export function StatCard({ label, value, hint, href, accent }: StatCardProps) {
  const inner = (
    <div
      className={`p-8 border ${
        accent ? "border-copper/40 bg-copper/5" : "border-ink/15 bg-paper"
      } h-full flex flex-col justify-between min-h-[140px] transition-colors hover:border-ink/40`}
    >
      <div className="eyebrow">{label}</div>
      <div className="font-display text-display-md leading-none mt-4">{value}</div>
      {hint && <div className="text-xs text-stone-300 font-mono tracking-wider mt-3">{hint}</div>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
