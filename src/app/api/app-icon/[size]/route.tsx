import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";

const SIZES = new Set([192, 512]);

/** PWA manifest icons rendered from the brand mark (same art as icon.tsx). */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await ctx.params;
  const size = SIZES.has(Number(sizeParam)) ? Number(sizeParam) : 192;
  const { searchParams } = new URL(request.url);
  // Maskable icons need ~20% safe-zone padding around the mark.
  const maskable = searchParams.get("maskable") === "1";
  const scale = maskable ? 0.62 : 0.78;
  const glyph = Math.round(size * scale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#101c2a",
        }}
      >
        <svg
          viewBox="-36 -44 72 92"
          width={Math.round(glyph * 0.79)}
          height={glyph}
          fill="none"
        >
          <ellipse cx="0" cy="-14" rx="16" ry="17" stroke="#f2ece0" strokeWidth="2.5" />
          <ellipse cx="0" cy="16" rx="19" ry="20" stroke="#f2ece0" strokeWidth="2.5" />
          <line x1="-30" y1="38" x2="30" y2="38" stroke="#f2ece0" strokeWidth="1" />
          <polygon points="0,38 -4,45 4,45" fill="#b5451b" />
          <line x1="0" y1="-35" x2="0" y2="-39" stroke="#b5451b" strokeWidth="0.6" />
          <line x1="-3" y1="-39" x2="3" y2="-39" stroke="#b5451b" strokeWidth="0.6" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
