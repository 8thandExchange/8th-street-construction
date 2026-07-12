import Image from "next/image";
import Link from "next/link";

const SITE_INDEX = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "Studio" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/book", label: "Book Consultation" },
  { href: "/contact", label: "Contact" },
];

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
      { href: "/services#commercial-construction", label: "Commercial Construction" },
      { href: "/services#residential-renovations", label: "Renovations" },
      { href: "/services#design-build", label: "Design-Build" },
    ],
  },
  {
    heading: "Community",
    links: [
      { href: "/volunteer", label: "Volunteer Build Days" },
      { href: "/volunteer", label: "Habitat for Humanity" },
      { href: "/contact", label: "Service Area: CSRA" },
      { href: "/contact", label: "Augusta · North Augusta" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy text-bone relative overflow-hidden">
      <div className="grain-overlay">
        <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14 py-20 md:py-24">
          <div>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10 pb-14 border-b border-bone/12">
              <Link href="/" className="inline-block" aria-label="8th Street Construction home">
                <Image
                  src="/img/brand/logo-parchment.svg"
                  alt=""
                  width={240}
                  height={80}
                  className="h-16 md:h-20 w-auto"
                />
              </Link>
              <p className="font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-tight max-w-md text-bone/90">
                Building <span className="italic text-copper">what</span> endures.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-12 py-14">
              <div>
                <p className="eyebrow text-bone/40 mb-5">Site Index</p>
                <ul className="space-y-2.5">
                  {SITE_INDEX.map((l) => (
                    <li key={l.href + l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-bone/75 hover:text-copper-glow transition-colors duration-300"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {COLUMNS.map((col) => (
                <div key={col.heading}>
                  <p className="eyebrow text-bone/40 mb-5">{col.heading}</p>
                  <ul className="space-y-2.5">
                    {col.links.map((l) => (
                      <li key={l.label + l.href}>
                        <Link
                          href={l.href}
                          className="text-sm text-bone/75 hover:text-copper-glow transition-colors duration-300"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div>
                <p className="eyebrow text-bone/40 mb-5">Contact</p>
                <ul className="space-y-2.5 text-sm text-bone/75">
                  <li>
                    <a
                      href="mailto:hello@8thstreetconstruction.com"
                      className="hover:text-copper-glow transition-colors duration-300 break-all"
                    >
                      hello@8thstreetconstruction.com
                    </a>
                  </li>
                  <li>Augusta, GA</li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-bone/12 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-bone/40">
                © {new Date().getFullYear()} 8th Street Construction · A division of 8th &amp; Exchange Capital
              </p>
              <div className="flex gap-6 font-mono text-[11px] tracking-[0.18em] uppercase">
                <Link href="/login" className="text-bone/40 hover:text-copper-glow transition-colors">
                  Client Portal
                </Link>
                <Link href="/login" className="text-bone/40 hover:text-copper-glow transition-colors">
                  Subcontractors
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
