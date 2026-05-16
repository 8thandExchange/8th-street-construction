import Link from "next/link";

const COLUMNS = [
  {
    heading: "Studio",
    links: [
      { href: "/about", label: "About" },
      { href: "/services", label: "Services" },
      { href: "/projects", label: "Selected Work" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Services",
    links: [
      { href: "/services#custom-homes", label: "Custom Homes" },
      { href: "/services#commercial", label: "Commercial Construction" },
      { href: "/services#renovations", label: "Renovations" },
      { href: "/services#design-build", label: "Design-Build" },
    ],
  },
  {
    heading: "Service Area",
    links: [
      { href: "/contact", label: "Augusta" },
      { href: "/contact", label: "Evans · Martinez" },
      { href: "/contact", label: "Grovetown" },
      { href: "/contact", label: "North Augusta · Aiken" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy text-bone relative overflow-hidden">
      <div className="grain-overlay">
        <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14 py-24 md:py-32">
          {/* Top: monumental wordmark */}
          <div className="border-b border-bone/15 pb-16 md:pb-20 mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-12 items-end">
              <div>
                <div className="eyebrow-copper mb-6">Augusta, Georgia · est. 8 &amp; Exchange</div>
                <h2 className="font-display text-display-lg leading-[0.95]">
                  Building <span className="italic-display">what</span><br/>endures.
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/book"
                  className="inline-flex h-14 items-center justify-center bg-copper text-bone hover:bg-copper-400 font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-500"
                >
                  Book a Consultation
                </Link>
                <Link
                  href="mailto:construction@8thandexchange.com"
                  className="inline-flex h-14 items-center justify-center border border-bone/25 hover:border-bone hover:bg-bone hover:text-ink font-mono text-xs tracking-[0.2em] uppercase transition-all duration-500"
                >
                  Email the Studio
                </Link>
              </div>
            </div>
          </div>

          {/* Middle: columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-16">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <div className="eyebrow text-bone/40 mb-5">{col.heading}</div>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label + l.href}>
                      <Link
                        href={l.href}
                        className="text-sm text-bone/75 hover:text-copper-100 transition-colors duration-300"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <div className="eyebrow text-bone/40 mb-5">Contact</div>
              <ul className="space-y-3 text-sm text-bone/75">
                <li>
                  <a
                    href="mailto:construction@8thandexchange.com"
                    className="hover:text-copper-100 transition-colors duration-300 break-all"
                  >
                    construction@<br/>8thandexchange.com
                  </a>
                </li>
                <li>Augusta, GA</li>
              </ul>
            </div>
          </div>

          {/* Bottom rule */}
          <div className="mt-20 pt-8 border-t border-bone/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-bone/40">
              © {new Date().getFullYear()} 8th Street Construction · A division of 8th &amp; Exchange Capital
            </div>
            <div className="flex gap-6 font-mono text-[11px] tracking-[0.18em] uppercase text-bone/40">
              <Link href="/login" className="hover:text-copper-100 transition-colors">
                Client Portal
              </Link>
              <Link href="/login" className="hover:text-copper-100 transition-colors">
                Subcontractors
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
