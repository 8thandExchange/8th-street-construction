"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PORTAL_LOGIN_LINKS } from "@/lib/portal-links";

const NAV = [
  { href: "/projects", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "Studio" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const onDarkHero = dark && !scrolled && !open;
  const headerOnImage = dark && !open;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-editorial pt-[env(safe-area-inset-top)]",
          scrolled || open
            ? dark
              ? "bg-navy/95 backdrop-blur-md border-b border-bone/10 shadow-[0_1px_0_rgba(245,241,234,0.06)]"
              : "bg-bone/95 backdrop-blur-md border-b border-ink/10"
            : headerOnImage
              ? "bg-navy/88 backdrop-blur-md border-b border-bone/10 shadow-[0_8px_32px_rgba(11,22,32,0.35)]"
              : "bg-transparent"
        )}
      >
        <div className="mx-auto max-w-8xl px-5 sm:px-6 md:px-10 lg:px-14">
          <div className="flex h-[4.5rem] md:h-24 items-center justify-between">
            <Link href="/" className="group flex flex-col leading-none min-w-0" aria-label="8th Street Construction home">
            <span
              className={cn(
                "font-display text-[1.35rem] sm:text-2xl md:text-[26px] tracking-tight transition-colors truncate",
                onDarkHero || headerOnImage ? "text-bone" : "text-ink"
              )}
            >
                8<span className="italic">th</span> Street
              </span>
              <span
                className={cn(
                  "eyebrow mt-0.5 transition-colors",
                  onDarkHero || headerOnImage ? "text-bone/60" : "text-stone-300"
                )}
              >
                Construction
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 lg:gap-10">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "editorial-link text-sm tracking-wide transition-colors",
                    onDarkHero || headerOnImage ? "text-bone hover:text-copper-100" : "text-ink hover:text-copper",
                    pathname === item.href &&
                      (onDarkHero || headerOnImage ? "text-copper-100" : "text-copper")
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/book"
                className={cn(
                  "ml-1 inline-flex h-11 items-center px-5 lg:px-6 font-mono text-[11px] tracking-[0.2em] uppercase transition-all duration-500 ease-editorial",
                  onDarkHero || headerOnImage
                    ? "bg-copper text-bone hover:bg-copper-400"
                    : "bg-ink text-bone hover:bg-copper"
                )}
              >
                Book Consultation
              </Link>
            </nav>

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className={cn(
                "md:hidden flex items-center justify-center w-11 h-11 -mr-1 rounded-full transition-colors",
                onDarkHero || headerOnImage ? "text-bone hover:bg-bone/10" : "text-ink hover:bg-ink/5"
              )}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              <span className="relative block w-6 h-3.5">
                <span
                  className={cn(
                    "absolute left-0 top-0 block h-px w-6 bg-current transition-transform duration-300 origin-center",
                    open && "translate-y-[6.5px] rotate-45"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-[6.5px] block h-px w-6 bg-current transition-opacity duration-300",
                    open && "opacity-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 bottom-0 block h-px w-6 bg-current transition-transform duration-300 origin-center",
                    open && "-translate-y-[6.5px] -rotate-45"
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu — full-screen overlay */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-40 transition-all duration-500 ease-editorial",
          open ? "visible" : "invisible pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            "absolute inset-0 bg-navy/40 backdrop-blur-sm transition-opacity duration-500",
            open ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 top-[calc(4.5rem+env(safe-area-inset-top))] bg-navy text-bone transition-transform duration-500 ease-editorial overflow-y-auto",
            open ? "translate-y-0" : "-translate-y-4 opacity-0"
          )}
        >
          <div className="px-5 sm:px-6 py-10 pb-[calc(2rem+env(safe-area-inset-bottom))] flex flex-col min-h-full">
            <div className="eyebrow-copper mb-8">Navigation</div>
            <nav className="flex flex-col gap-1">
              {NAV.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "font-display text-[clamp(2rem,8vw,2.75rem)] leading-tight py-3 border-b border-bone/10 transition-colors",
                    pathname === item.href ? "text-copper-100" : "text-bone hover:text-copper-100"
                  )}
                  style={{
                    opacity: open ? 1 : 0,
                    transform: open ? "translateY(0)" : "translateY(12px)",
                    transition: `opacity 0.45s ease-out ${i * 50 + 80}ms, transform 0.45s ease-out ${i * 50 + 80}ms, color 0.3s`,
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-10 flex flex-col gap-3">
              <Link
                href="/book"
                onClick={() => setOpen(false)}
                className="inline-flex h-14 items-center justify-center bg-copper text-bone hover:bg-copper-400 font-mono text-xs tracking-[0.2em] uppercase transition-colors"
              >
                Book Consultation
              </Link>
              {PORTAL_LOGIN_LINKS.map((link) => (
                <Link
                  key={link.kind}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="inline-flex h-12 items-center justify-center border border-bone/20 text-bone/70 hover:text-bone font-mono text-[11px] tracking-[0.18em] uppercase transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
