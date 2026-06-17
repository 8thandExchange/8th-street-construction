import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CollectionPageTemplate } from "@/components/collection/CollectionPageTemplate";
import {
  getCollectionPage,
  getAllCollectionSlugs,
} from "@/lib/collection-pages";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 86400;

export function generateStaticParams() {
  return getAllCollectionSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const home = getCollectionPage(slug);
  if (!home) return { title: "Collection" };

  return {
    title: home.name,
    description: home.statement,
    openGraph: {
      title: `${home.name} | 8th Street Construction`,
      description: home.statement,
    },
  };
}

export default async function CollectionPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const home = getCollectionPage(slug);
  if (!home) notFound();

  return (
    <>
      <SiteHeader dark />
      <main className="bg-warm-white text-ink">
        <CollectionPageTemplate home={home} />
      </main>
      <SiteFooter />
    </>
  );
}
