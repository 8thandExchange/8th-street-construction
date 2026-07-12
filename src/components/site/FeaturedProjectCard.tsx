import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type FeaturedProject = {
  title: string;
  location: string;
  year: string;
  image: string;
  href?: string;
};

type FeaturedProjectCardProps = {
  project: FeaturedProject;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function FeaturedProjectCard({
  project,
  className,
  imageClassName,
  priority,
}: FeaturedProjectCardProps) {
  const href = project.href ?? "/projects";

  return (
    <Link href={href} className={cn("group block", className)}>
      <div className={cn("relative overflow-hidden bg-navy-deep", imageClassName)}>
        <Image
          src={project.image}
          alt={project.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-[1.04]"
          priority={priority}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/70 via-navy-deep/10 to-transparent" />
        <span className="absolute top-4 right-4 md:top-6 md:right-6 font-mono text-[10px] tracking-[0.22em] uppercase text-bone/0 group-hover:text-bone transition-colors duration-500">
          View Project →
        </span>
      </div>
      <div className="pt-6 md:pt-8">
        <h3 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] leading-tight text-bone copper-rule-hover inline-block">
          {project.title}
        </h3>
        <p className="mt-2 font-mono text-[11px] tracking-[0.2em] uppercase text-copper">
          {project.location} · {project.year}
        </p>
      </div>
    </Link>
  );
}
