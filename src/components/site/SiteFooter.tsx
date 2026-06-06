import Link from "next/link";
import { PORTAL_LOGIN_LINKS } from "@/lib/portal-links";

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
        <div className="mx-auto max-w-8xl px-5 sm:px-6 md:px-10 lg:px-14 py-16 md:py-32 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          <div className="border-b border-bone/15 pb-12 md:pb-20 mb-12 md:mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-10 lg:gap-12 items-end">
              <div>
                <div className="eyebrow-copper mb-4 md:mb-6">Augusta, Georgia · est. 8 &amp; Exchange</div>
                <h2 className="font-display text-display-lg leading-[0.95]">
                  Building <span className="italic-display">what</span>
                  <br />
                  endures.
                </h2>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-md lg:max-w-none lg:ml-auto">
                <Link
                  href="/book"
                  className="inline-flex h-14 items-center justify-center bg-copper text-bone hover:bg-copper-400 font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-500"
                >
                  Book a Consultation
                </Link>
                <Link
                  href="mailto:hello@8thstreetconstruction.com"
                  className="inline-flex h-14 items-center justify-center border border-bone/25 hover:border-bone hover:bg-bone hover:text-ink font-mono text-xs tracking-[0.2em] uppercase transition-all duration-500"
                >
                  Email the Studio
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <div className="eyebrow text-bone/40 mb-4">{col.heading}</div>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label + l.href}>
                      <Link
                        href={l.href}
                        className="text-[15px] text-bone/75 hover:text-copper-100 transition-colors duration-300 inline-block py-0.5"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <div className="eyebrow text-bone/40 mb-4">Contact</div>
              <ul className="space-y-2.5 text-[15px] text-bone/75">
                <li>
                  <a
                    href="mailto:hello@8thstreetconstruction.com"
                    className="hover:text-copper-100 transition-colors duration-300"
                  >
                    hello@8thstreetconstruction.com
                  </a>
                </li>
                <li>Augusta, GA · CSRA</li>
              </ul>
            </div>
          </div>

          <div className="mt-14 md:mt-20 pt-8 border-t border-bone/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="font-mono text-[10px] sm:text-[11px] tracking-[0.16em] uppercase text-bone/40 leading-relaxed max-w-xl">
              © {new Date().getFullYear()} 8th Street Construction · A division of 8th &amp; Exchange Capital
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] sm:text-[11px] tracking-[0.16em] uppercase text-bone/40">
              {PORTAL_LOGIN_LINKS.map((link) => (
                <Link
                  key={link.kind}
                  href={link.href}
                  className="hover:text-copper-100 transition-colors py-1"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
