"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/projects", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "Studio" },
  { href: "/volunteer", label: "Volunteer" },
  { href: "/contact", label: "Contact" },
];

/** Props retained for call-site compatibility; masthead is always parchment. */
export function SiteHeader(_props?: { dark?: boolean; overlayHero?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 header-parchment-bg transition-shadow duration-500 ease-editorial",
          scrolled && "header-parchment-scrolled"
        )}
      >
        <div className="relative">
          <Link
            href="/"
            className="flex h-28 md:h-44 w-full items-center justify-center px-6 md:px-10"
            aria-label="8th Street Construction home"
          >
            <Image
              src="/img/brand/logo-parchment.svg"
              alt=""
              width={420}
              height={128}
              className="h-24 w-auto md:h-36"
              priority
            />
          </Link>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="absolute right-5 md:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 p-2 lg:hidden text-navy"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <span
              className={cn(
                "block h-px w-6 bg-current transition-all duration-500 ease-editorial",
                open && "rotate-45 translate-y-[7px]"
              )}
            />
            <span
              className={cn(
                "block h-px w-6 bg-current transition-all duration-500 ease-editorial",
                open && "opacity-0 scale-x-0"
              )}
            />
            <span
              className={cn(
                "block h-px w-6 bg-current transition-all duration-500 ease-editorial",
                open && "-rotate-45 -translate-y-[5px]"
              )}
            />
          </button>
        </div>

        <div className="header-parchment-bg border-b border-navy/15">
          <div className="mx-auto max-w-8xl px-6 md:px-10 lg:px-14 min-h-[52px] py-3 hidden lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-6">
            <div aria-hidden className="hidden lg:block" />
            <nav className="flex items-center justify-center flex-wrap gap-x-0" aria-label="Primary">
              {NAV.map((item, i) => (
                <span key={`${item.href}-${item.label}`} className="inline-flex items-center">
                  <Link
                    href={item.href}
                    className="font-mono text-[11px] tracking-[0.2em] uppercase text-navy/55 hover:text-navy transition-colors duration-300 whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                  {i < NAV.length - 1 && (
                    <span className="text-navy/25 mx-3 select-none" aria-hidden>
                      ·
                    </span>
                  )}
                </span>
              ))}
            </nav>
            <div className="flex justify-end">
              <Link href="/book" className="header-nav-cta whitespace-nowrap">
                Book Consultation
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "lg:hidden fixed inset-0 z-[60] header-parchment-bg transition-[opacity,visibility] duration-700 ease-editorial",
          open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        )}
      >
        <nav
          className="flex flex-col items-center justify-center gap-2 min-h-full px-8 pt-32 pb-16"
          aria-label="Mobile"
        >
          {NAV.map((item, i) => (
            <Link
              key={`${item.href}-${item.label}-mobile`}
              href={item.href}
              onClick={() => setOpen(false)}
              className="font-display text-[clamp(2.25rem,7vw,3.5rem)] text-navy hover:text-copper transition-colors duration-500 py-1"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${90 + i * 65}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${90 + i * 65}ms`,
              }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/book"
            onClick={() => setOpen(false)}
            className="mt-10 header-nav-cta"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(16px)",
              transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${90 + NAV.length * 65}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${90 + NAV.length * 65}ms`,
            }}
          >
            Book Consultation
          </Link>
        </nav>
      </div>
    </>
  );
}
