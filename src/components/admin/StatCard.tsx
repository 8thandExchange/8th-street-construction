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
      className={`app-card app-card-hover flex h-full min-h-[112px] flex-col justify-between p-5 ${
        accent ? "!border-copper/30 !bg-copper/[0.04]" : ""
      }`}
    >
      <div className="app-label">{label}</div>
      <div>
        <div className={`app-num text-[26px] font-medium leading-none ${accent ? "text-copper" : "text-navy"}`}>
          {value}
        </div>
        {hint && <div className="app-muted mt-2 text-xs">{hint}</div>}
      </div>
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
