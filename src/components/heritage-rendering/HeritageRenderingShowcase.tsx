import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import {
  HR_SYSTEM_NAME,
  HR_TOKENS,
  HR_COPY,
  HR_PROHIBITED,
  HR_REQUIRED_LAYERS,
} from "@/lib/heritage-rendering/tokens";
import { HR_TEMPLATE_SPECS, HR_ALL_TEMPLATE_IDS } from "@/lib/heritage-rendering/specs";
import {
  WebsiteHeroTemplate,
  CollectionCardTemplate,
  ProjectBookCoverTemplate,
  HomeownerPresentationTemplate,
  SocialMediaPostTemplate,
  JobsiteSignTemplate,
} from "./templates";

const TEMPLATE_COMPONENTS = {
  "website-hero": WebsiteHeroTemplate,
  "collection-card": CollectionCardTemplate,
  "project-book-cover": ProjectBookCoverTemplate,
  "homeowner-presentation": HomeownerPresentationTemplate,
  "social-media-post": SocialMediaPostTemplate,
  "jobsite-sign": JobsiteSignTemplate,
} as const;

const DEMO_TITLES: Record<string, string> = {
  "website-hero": "",
  "collection-card": "The Augusta",
  "project-book-cover": "The Augusta",
  "homeowner-presentation": "The Augusta",
  "social-media-post": "",
  "jobsite-sign": "The Augusta",
};

export function HeritageRenderingShowcase() {
  return (
    <div className="bg-warm-white text-ink">
      {/* System header */}
      <section className="bg-navy text-parchment section-pad">
        <Container size="wide">
          <Reveal>
            <p className="font-sans text-[11px] tracking-[0.28em] uppercase text-gold">
              Design System
            </p>
            <h1 className="mt-4 font-display text-display-xl leading-[1.02]">{HR_SYSTEM_NAME}</h1>
            <p className="mt-6 text-lg text-parchment/75 max-w-2xl leading-relaxed">
              A unified visual language for architectural portraits across every 8th Street touchpoint —
              field journal linework, Southern landscape, and permanent craft documentation.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* Tokens */}
      <section className="section-pad border-b border-ink/10">
        <Container size="wide">
          <h2 className="font-display text-display-md text-ink mb-8">Design Tokens</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {Object.entries(HR_TOKENS.colors).map(([name, hex]) => (
              <div key={name} className="flex flex-col gap-2">
                <div
                  className="aspect-square rounded-sm border border-ink/10"
                  style={{ backgroundColor: hex }}
                />
                <div>
                  <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-pencil">{name}</p>
                  <p className="font-mono text-xs text-ink/60">{hex}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h3 className="font-sans text-[11px] tracking-[0.22em] uppercase text-rust mb-4">
                Typography
              </h3>
              <div className="space-y-3 border-l-2 border-rust/30 pl-6">
                <p className="font-sans text-[11px] tracking-[0.28em] uppercase">{HR_COPY.wordmark}</p>
                <p className="font-display text-xl italic">{HR_COPY.taglinePrimary}</p>
                <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-pencil">
                  {HR_COPY.taglineSecondary}
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-sans text-[11px] tracking-[0.22em] uppercase text-rust mb-4">
                Prohibited Elements
              </h3>
              <ul className="space-y-2">
                {HR_PROHIBITED.map((item) => (
                  <li key={item} className="text-sm text-ink/65 flex gap-2">
                    <span className="text-rust">—</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Required layers */}
      <section className="bg-parchment section-pad border-b border-ink/10">
        <Container size="wide">
          <h2 className="font-display text-display-md text-ink mb-8">Required Layers</h2>
          <p className="text-ink/65 max-w-2xl mb-8 leading-relaxed">
            Every Heritage Rendering must include all ten layers, composed in this order.
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {HR_REQUIRED_LAYERS.map((layer, i) => (
              <li
                key={layer}
                className="bg-warm-white border border-ink/8 p-4 font-sans text-[11px] tracking-[0.08em] uppercase text-ink/70"
              >
                <span className="font-mono text-gold text-xs mr-2">{String(i + 1).padStart(2, "0")}</span>
                {layer.replace(/-/g, " ")}
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Template gallery */}
      <section className="section-pad">
        <Container size="wide">
          <h2 className="font-display text-display-md text-ink mb-4">Template Specifications</h2>
          <p className="text-ink/65 max-w-2xl mb-12 leading-relaxed">
            Six production templates — each inherits all required layers with template-specific density,
            typography, and layout rules.
          </p>

          <div className="space-y-20">
            {HR_ALL_TEMPLATE_IDS.map((id) => {
              const spec = HR_TEMPLATE_SPECS[id];
              const Template = TEMPLATE_COMPONENTS[id];
              const title = DEMO_TITLES[id] || undefined;

              return (
                <article key={id} className="border-t border-ink/12 pt-12">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
                    <div className="lg:col-span-5">
                      <span className="font-mono text-xs text-gold">{spec.id}</span>
                      <h3 className="mt-2 font-display text-2xl sm:text-3xl text-ink">{spec.name}</h3>
                      <p className="mt-4 text-sm text-ink/65 leading-relaxed">{spec.description}</p>

                      <dl className="mt-8 space-y-3 text-sm">
                        <div className="flex justify-between border-b border-ink/8 pb-2">
                          <dt className="text-pencil uppercase tracking-wider text-[10px]">Aspect Ratio</dt>
                          <dd className="font-mono">{spec.aspectRatio}</dd>
                        </div>
                        <div className="flex justify-between border-b border-ink/8 pb-2">
                          <dt className="text-pencil uppercase tracking-wider text-[10px]">Canvas</dt>
                          <dd className="font-mono">
                            {spec.width} × {spec.height}
                          </dd>
                        </div>
                        <div className="flex justify-between border-b border-ink/8 pb-2">
                          <dt className="text-pencil uppercase tracking-wider text-[10px]">Safe Margin</dt>
                          <dd className="font-mono">{spec.safeMargin}</dd>
                        </div>
                        <div className="flex justify-between border-b border-ink/8 pb-2">
                          <dt className="text-pencil uppercase tracking-wider text-[10px]">Border</dt>
                          <dd className="capitalize">{spec.border}</dd>
                        </div>
                        <div className="flex justify-between border-b border-ink/8 pb-2">
                          <dt className="text-pencil uppercase tracking-wider text-[10px]">Seal</dt>
                          <dd className="capitalize">
                            {spec.seal.size} · {spec.seal.position}
                          </dd>
                        </div>
                      </dl>

                      <ul className="mt-6 space-y-2">
                        {spec.notes.map((note) => (
                          <li key={note} className="text-xs text-ink/55 leading-relaxed flex gap-2">
                            <span className="text-rust shrink-0">·</span>
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="lg:col-span-7">
                      <div
                        className={
                          id === "social-media-post"
                            ? "max-w-md mx-auto"
                            : id === "project-book-cover"
                              ? "max-w-sm mx-auto"
                              : ""
                        }
                      >
                        <Template variant="augusta" title={title} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Container>
      </section>
    </div>
  );
}
