import Link from "next/link";

type QuickLink = {
  label: string;
  href: string;
  description?: string;
};

type QuickLinkGridProps = {
  links: QuickLink[];
  title?: string;
};

export function QuickLinkGrid({ links, title = "Jump to" }: QuickLinkGridProps) {
  return (
    <section>
      <h3 className="eyebrow mb-4">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="dash-quick-link group"
          >
            <span className="font-medium text-sm text-ink group-hover:text-copper transition-colors">
              {link.label}
            </span>
            {link.description && (
              <span className="text-[10px] text-ink/45 mt-1 block">{link.description}</span>
            )}
            <span className="text-[10px] font-mono uppercase text-copper mt-3 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
