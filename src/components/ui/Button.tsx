import Link from "next/link";
import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "copper";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink text-bone hover:bg-navy border border-ink hover:border-navy",
  secondary:
    "bg-transparent text-ink border border-ink/30 hover:border-ink hover:bg-ink hover:text-bone",
  ghost:
    "bg-transparent text-ink border border-transparent hover:bg-ink/5",
  copper:
    "bg-copper text-bone hover:bg-copper-400 border border-copper hover:border-copper-400",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-12 px-7 text-sm",
  lg: "h-14 px-9 text-[15px]",
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

interface ButtonProps extends BaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size" | "children"> {
  href?: never;
}

interface LinkProps extends BaseProps {
  href: string;
  target?: string;
  rel?: string;
}

type Props = ButtonProps | LinkProps;

const baseClasses =
  "inline-flex items-center justify-center font-mono uppercase tracking-[0.18em] transition-all duration-500 ease-editorial focus:outline-none focus-visible:ring-2 focus-visible:ring-copper focus-visible:ring-offset-2 focus-visible:ring-offset-bone disabled:opacity-50 disabled:cursor-not-allowed";

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className, children, ...rest },
  ref
) {
  const classes = cn(baseClasses, VARIANTS[variant], SIZES[size], className);

  if ("href" in rest && rest.href) {
    const { href, target, rel } = rest;
    const external = href.startsWith("http");
    return (
      <Link
        href={href}
        target={target || (external ? "_blank" : undefined)}
        rel={rel || (external ? "noopener noreferrer" : undefined)}
        className={classes}
      >
        {children}
      </Link>
    );
  }

  return (
    <button ref={ref} className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
});
