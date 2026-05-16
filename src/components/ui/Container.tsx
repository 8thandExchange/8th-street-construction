import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
  as?: "div" | "section" | "article" | "main" | "header" | "footer";
}

export function Container({ children, className, size = "default", as: Tag = "div" }: ContainerProps) {
  const sizes = {
    narrow: "max-w-4xl",
    default: "max-w-7xl",
    wide: "max-w-8xl",
  };
  return (
    <Tag className={cn("mx-auto px-6 md:px-10 lg:px-14", sizes[size], className)}>
      {children}
    </Tag>
  );
}
