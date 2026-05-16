"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/projects", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "Studio" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-editorial",
        scrolled
          ? dark
            ? "bg-navy/95 backdrop-blur-sm border-b border-bone/10"
            : "bg-bone/95 backdrop-blur-sm border-b border-ink/10"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14">
        <div className="flex h-20 md:h-24 items-center justify-between">
          {/* Wordmark */}
          <Link href="/" className="group flex flex-col leading-none" aria-label="8th Street Construction home">
            <span
              className={cn(
                "font-display text-2xl md:text-[26px] tracking-tight transition-colors",
                dark ? "text-bone" : "text-ink"
              )}
            >
              8<span className="italic">th</span> Street
            </span>
            <span
              className={cn(
                "eyebrow mt-0.5 transition-colors",
                dark ? "text-bone/50" : "text-stone-300"
              )}
            >
              Construction
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-10">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "editorial-link text-sm tracking-wide transition-colors",
                  dark ? "text-bone hover:text-copper-100" : "text-ink hover:text-copper"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/book"
              className={cn(
                "ml-2 inline-flex h-11 items-center px-6 font-mono text-[11px] tracking-[0.2em] uppercase transition-all duration-500 ease-editorial",
                dark
                  ? "bg-copper text-bone hover:bg-copper-400"
                  : "bg-ink text-bone hover:bg-copper"
              )}
            >
              Book Consultation
            </Link>
          </nav>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "md:hidden flex flex-col gap-1.5 p-2 -mr-2",
              dark ? "text-bone" : "text-ink"
            )}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <span
              className={cn(
                "block h-px w-6 bg-current transition-transform duration-300",
                open && "rotate-45 translate-y-[7px]"
              )}
            />
            <span
              className={cn(
                "block h-px w-6 bg-current transition-opacity duration-300",
                open && "opacity-0"
              )}
            />
            <span
              className={cn(
                "block h-px w-6 bg-current transition-transform duration-300",
                open && "-rotate-45 -translate-y-[5px]"
              )}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "md:hidden fixed inset-x-0 top-20 bottom-0 bg-bone transition-all duration-500 ease-editorial",
          open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )}
      >
        <div className="px-6 py-12 flex flex-col gap-8 h-full">
          {NAV.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="font-display text-4xl text-ink hover:text-copper transition-colors"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.5s ease-out ${i * 60 + 100}ms, transform 0.5s ease-out ${i * 60 + 100}ms`,
              }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/book"
            onClick={() => setOpen(false)}
            className="mt-auto inline-flex h-14 items-center justify-center bg-ink text-bone font-mono text-xs tracking-[0.2em] uppercase"
          >
            Book Consultation
          </Link>
        </div>
      </div>
    </header>
  );
}
