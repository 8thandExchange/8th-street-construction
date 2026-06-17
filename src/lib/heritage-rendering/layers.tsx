import { HR_TOKENS } from "./tokens";

type LayerProps = {
  density?: "full" | "moderate" | "simplified" | "light";
};

/** Warm parchment field */
export function ParchmentBackground() {
  return (
    <rect
      x="0"
      y="0"
      width="480"
      height="360"
      fill={HR_TOKENS.colors.parchment}
    />
  );
}

/** Topographic contour lines */
export function ContourField({ density = "full" }: LayerProps) {
  const normalized = density === "simplified" ? "light" : density;
  const opacity =
    normalized === "light"
      ? HR_TOKENS.opacity.contour * 0.6
      : normalized === "moderate"
        ? HR_TOKENS.opacity.contour * 0.8
        : HR_TOKENS.opacity.contour;

  const ellipses =
    normalized === "light"
      ? [
          { cx: 240, cy: 200, rx: 280, ry: 120 },
          { cx: 120, cy: 160, rx: 160, ry: 70 },
          { cx: 360, cy: 240, rx: 180, ry: 80 },
        ]
      : [
          { cx: 200, cy: 180, rx: 320, ry: 140 },
          { cx: 280, cy: 200, rx: 260, ry: 110 },
          { cx: 120, cy: 220, rx: 200, ry: 90 },
          { cx: 400, cy: 160, rx: 180, ry: 75 },
          { cx: 60, cy: 140, rx: 140, ry: 60 },
          { cx: 340, cy: 260, rx: 220, ry: 95 },
        ];

  return (
    <g opacity={opacity} stroke={HR_TOKENS.colors.graphite} fill="none">
      {ellipses.map((e, i) => (
        <ellipse key={i} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} strokeWidth="0.75" />
      ))}
      {(normalized === "full" || normalized === "moderate") &&
        [40, 80, 120].map((y) => (
          <path
            key={y}
            d={`M0 ${y + 120} Q200 ${y + 100} 400 ${y + 130} T480 ${y + 115}`}
            strokeWidth="0.5"
          />
        ))}
    </g>
  );
}

/** Soft graphite shading beneath architecture */
export function GraphiteShading({ variant }: { variant: "full" | "simplified" }) {
  const fill = HR_TOKENS.colors.graphite;
  const o = HR_TOKENS.opacity.graphiteShade;
  const oDeep = HR_TOKENS.opacity.graphiteShadeDeep;

  if (variant === "simplified") {
    return (
      <g>
        <ellipse cx="240" cy="290" rx="200" ry="24" fill={fill} opacity={o} />
        <path d="M140 270 L240 250 L340 270 L340 300 L140 300 Z" fill={fill} opacity={oDeep * 0.8} />
      </g>
    );
  }

  return (
    <g>
      <path d="M60 270 L420 270 L420 310 L60 310 Z" fill={fill} opacity={o} />
      <path d="M120 250 L360 250 L380 270 L100 270 Z" fill={fill} opacity={oDeep} />
      <ellipse cx="100" cy="285" rx="55" ry="18" fill={fill} opacity={o} />
      <ellipse cx="380" cy="285" rx="55" ry="18" fill={fill} opacity={o} />
    </g>
  );
}

/** Mature Southern trees — live oak silhouette linework */
export function MatureTrees({ density = "full" }: LayerProps) {
  const trees =
    density === "simplified"
      ? [
          { x: 55, scale: 0.9 },
          { x: 425, scale: 0.85 },
        ]
      : density === "moderate"
        ? [
            { x: 45, scale: 1 },
            { x: 150, scale: 0.7 },
            { x: 400, scale: 0.95 },
            { x: 435, scale: 0.8 },
          ]
        : [
            { x: 35, scale: 1.1 },
            { x: 120, scale: 0.75 },
            { x: 360, scale: 0.9 },
            { x: 430, scale: 1 },
          ];

  const ink = HR_TOKENS.colors.ink;

  return (
    <g opacity={HR_TOKENS.opacity.landscape} stroke={ink} fill="none">
      {trees.map((t, i) => (
        <g key={i} transform={`translate(${t.x}, 268) scale(${t.scale})`}>
          <line x1="0" y1="0" x2="0" y2="-32" strokeWidth="1.2" />
          <path
            d="M0 -32 C-28 -50 -32 -68 0 -78 C32 -68 28 -50 0 -32"
            strokeWidth="0.8"
          />
          <path
            d="M0 -48 C-18 -58 -20 -70 0 -74 C20 -70 18 -58 0 -48"
            strokeWidth="0.5"
            opacity="0.6"
          />
          {/* Spanish moss suggestion */}
          <path
            d="M-8 -55 Q-12 -62 -6 -68 M8 -55 Q12 -62 6 -68"
            strokeWidth="0.4"
            opacity="0.4"
          />
        </g>
      ))}
    </g>
  );
}

/** Southern landscape ground plane */
export function SouthernLandscape({ density = "full" }: LayerProps) {
  const ink = HR_TOKENS.colors.ink;
  return (
    <g opacity={HR_TOKENS.opacity.landscape}>
      <line x1="20" y1="300" x2="460" y2="300" stroke={ink} strokeWidth="0.6" opacity="0.35" />
      {density === "full" && (
        <>
          <path
            d="M20 305 Q120 298 200 305 T380 302 T460 306"
            stroke={ink}
            strokeWidth="0.4"
            fill="none"
            opacity="0.25"
          />
          <path
            d="M60 312 Q180 308 280 314 T420 310"
            stroke={HR_TOKENS.colors.graphite}
            strokeWidth="0.35"
            fill="none"
            opacity="0.3"
          />
        </>
      )}
      <MatureTrees density={density === "full" ? "full" : density === "moderate" ? "moderate" : "simplified"} />
    </g>
  );
}

/** Survey references — north arrow, scale bar, benchmark. No lot or parcel data. */
export function SurveyReferences() {
  const ink = HR_TOKENS.colors.ink;
  const gold = HR_TOKENS.colors.gold;
  const o = HR_TOKENS.opacity.survey;

  return (
    <g opacity={o} stroke={ink} fill="none">
      {/* North arrow */}
      <g transform="translate(52, 52)">
        <circle cx="0" cy="0" r="14" strokeWidth="0.6" />
        <path d="M0 -9 L0 9 M0 -9 L-4 -2 M0 -9 L4 -2" strokeWidth="0.7" />
        <text
          x="0"
          y="22"
          textAnchor="middle"
          fontSize="6"
          fill={ink}
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.15em"
        >
          N
        </text>
      </g>

      {/* Graphic scale bar — no numeric lot reference */}
      <g transform="translate(52, 310)">
        <line x1="0" y1="0" x2="60" y2="0" strokeWidth="0.8" />
        <line x1="0" y1="-3" x2="0" y2="3" strokeWidth="0.6" />
        <line x1="30" y1="-3" x2="30" y2="3" strokeWidth="0.6" />
        <line x1="60" y1="-3" x2="60" y2="3" strokeWidth="0.6" />
        <text
          x="30"
          y="12"
          textAnchor="middle"
          fontSize="5.5"
          fill={ink}
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.1em"
        >
          SCALE
        </text>
      </g>

      {/* Benchmark symbol */}
      <g transform="translate(428, 52)" stroke={gold}>
        <path d="M0 0 L-6 10 L6 10 Z" strokeWidth="0.6" fill={gold} fillOpacity="0.15" />
        <line x1="0" y1="10" x2="0" y2="18" strokeWidth="0.5" />
        <text
          x="0"
          y="28"
          textAnchor="middle"
          fontSize="5"
          fill={ink}
          fontFamily="ui-monospace, monospace"
          letterSpacing="0.08em"
        >
          BM
        </text>
      </g>
    </g>
  );
}

/** Elevation annotations — datum line and ticks. No project numbers. */
export function ElevationAnnotations() {
  const ink = HR_TOKENS.colors.ink;
  const gold = HR_TOKENS.colors.gold;
  const o = HR_TOKENS.opacity.annotation;

  return (
    <g opacity={o} stroke={ink}>
      <line
        x1="430"
        y1="70"
        x2="430"
        y2="300"
        stroke={gold}
        strokeWidth="0.4"
        strokeDasharray="3 5"
      />
      <line x1="424" y1="70" x2="436" y2="70" stroke={gold} strokeWidth="0.5" />
      <line x1="424" y1="300" x2="436" y2="300" stroke={gold} strokeWidth="0.5" />
      {[120, 170, 220, 270].map((y) => (
        <g key={y}>
          <line x1="426" y1={y} x2="434" y2={y} strokeWidth="0.4" />
        </g>
      ))}
      <text
        x="438"
        y="190"
        fontSize="7"
        fill={ink}
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.12em"
      >
        ELEV
      </text>
      <text
        x="438"
        y="200"
        fontSize="5.5"
        fill={HR_TOKENS.colors.graphite}
        fontFamily="ui-monospace, monospace"
      >
        ±0′-0″
      </text>
    </g>
  );
}

type BorderStyle = "full" | "compact" | "formal" | "minimal";

/** Architectural border with registration corners */
export function ArchitecturalBorder({ style = "full" }: { style?: BorderStyle }) {
  const ink = HR_TOKENS.colors.ink;
  const rust = HR_TOKENS.colors.rust;
  const pad = style === "compact" ? 12 : style === "minimal" ? 8 : 16;
  const innerPad = pad + (style === "formal" ? 10 : 6);

  return (
    <g>
      <rect
        x={pad}
        y={pad}
        width={480 - pad * 2}
        height={360 - pad * 2}
        stroke={ink}
        strokeWidth={style === "minimal" ? 0.6 : 0.8}
        fill="none"
        opacity={HR_TOKENS.opacity.borderOuter}
      />
      {style !== "minimal" && (
        <rect
          x={innerPad}
          y={innerPad}
          width={480 - innerPad * 2}
          height={360 - innerPad * 2}
          stroke={ink}
          strokeWidth="0.5"
          fill="none"
          opacity={HR_TOKENS.opacity.borderInner}
        />
      )}
      {style === "formal" && (
        <rect
          x={innerPad + 4}
          y={innerPad + 4}
          width={480 - (innerPad + 4) * 2}
          height={360 - (innerPad + 4) * 2}
          stroke={ink}
          strokeWidth="0.35"
          fill="none"
          opacity={0.06}
        />
      )}
      {/* Registration corners — rust */}
      {[
        [pad, pad, "tl"],
        [480 - pad, pad, "tr"],
        [pad, 360 - pad, "bl"],
        [480 - pad, 360 - pad, "br"],
      ].map(([x, y, corner]) => {
        const size = style === "compact" ? 8 : 10;
        const sx = corner === "tr" || corner === "br" ? -1 : 1;
        const sy = corner === "bl" || corner === "br" ? -1 : 1;
        return (
          <g key={corner as string} transform={`translate(${x}, ${y})`}>
            <line x1="0" y1="0" x2={size * sx} y2="0" stroke={rust} strokeWidth="0.8" opacity="0.7" />
            <line x1="0" y1="0" x2="0" y2={size * sy} stroke={rust} strokeWidth="0.8" opacity="0.7" />
          </g>
        );
      })}
    </g>
  );
}

type SealProps = {
  position: "bottom-right" | "bottom-left" | "top-right" | "center-bottom";
  size: "sm" | "md" | "lg";
};

/** Embossed 8th Street seal — elevation mark with ring */
export function EmbossedSeal({ position, size }: SealProps) {
  const scale = size === "sm" ? 0.35 : size === "md" ? 0.5 : 0.65;
  const positions: Record<SealProps["position"], [number, number]> = {
    "bottom-right": [400, 300],
    "bottom-left": [80, 300],
    "top-right": [400, 60],
    "center-bottom": [240, 318],
  };
  const [cx, cy] = positions[position];
  const ink = HR_TOKENS.colors.ink;
  const rust = HR_TOKENS.colors.rust;

  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`} opacity={HR_TOKENS.opacity.sealEmboss}>
      {/* Emboss shadow */}
      <circle cx="1" cy="1" r="22" fill={HR_TOKENS.colors.graphite} opacity="0.12" />
      <circle cx="0" cy="0" r="22" fill={HR_TOKENS.colors.warmWhite} stroke={ink} strokeWidth="0.6" opacity="0.9" />
      <ellipse cx="0" cy="-5" rx="7" ry="7.5" stroke={ink} strokeWidth="1" fill="none" />
      <ellipse cx="0" cy="6" rx="8.5" ry="9" stroke={ink} strokeWidth="1" fill="none" />
      <line x1="-13" y1="17" x2="13" y2="17" stroke={ink} strokeWidth="0.5" />
      <polygon points="0,17 -2,20 2,20" fill={rust} />
      <text
        x="0"
        y="32"
        textAnchor="middle"
        fontSize="4"
        fill={ink}
        fontFamily="ui-sans-serif, sans-serif"
        letterSpacing="0.2em"
        opacity="0.7"
      >
        8TH ST
      </text>
    </g>
  );
}

/** In-SVG typography block for print templates */
export function TypographyBlock({
  showWordmark = true,
  showPrimary = true,
  showSecondary = true,
  title,
  align = "center",
}: {
  showWordmark?: boolean;
  showPrimary?: boolean;
  showSecondary?: boolean;
  title?: string;
  align?: "center" | "left";
}) {
  const ink = HR_TOKENS.colors.ink;
  const rust = HR_TOKENS.colors.rust;
  const anchor = align === "center" ? "middle" : "start";
  const x = align === "center" ? 240 : 48;

  const titleY = 36;
  const wordmarkY = title ? titleY + 28 : 36;
  const primaryY = wordmarkY + (showWordmark ? 16 : 0);
  const secondaryY = primaryY + (showPrimary ? 12 : 0);

  return (
    <g>
      {title && (
        <>
          <text
            x={x}
            y={titleY}
            textAnchor={anchor}
            fontSize="14"
            fill={ink}
            fontFamily="Georgia, serif"
          >
            {title}
          </text>
          <line
            x1={align === "center" ? 180 : x}
            y1={titleY + 8}
            x2={align === "center" ? 300 : x + 120}
            y2={titleY + 8}
            stroke={rust}
            strokeWidth="0.5"
            opacity="0.6"
          />
        </>
      )}
      {showWordmark && (
        <text
          x={x}
          y={wordmarkY}
          textAnchor={anchor}
          fontSize="7"
          fill={ink}
          fontFamily="ui-sans-serif, sans-serif"
          letterSpacing="0.28em"
          opacity="0.75"
        >
          8TH STREET CONSTRUCTION
        </text>
      )}
      {showPrimary && (
        <text
          x={x}
          y={primaryY}
          textAnchor={anchor}
          fontSize="11"
          fill={ink}
          fontFamily="Georgia, serif"
          fontStyle="italic"
        >
          Building What Endures.
        </text>
      )}
      {showSecondary && (
        <text
          x={x}
          y={secondaryY}
          textAnchor={anchor}
          fontSize="5.5"
          fill={HR_TOKENS.colors.graphite}
          fontFamily="ui-sans-serif, sans-serif"
          letterSpacing="0.2em"
        >
          Crafted for Generations.
        </text>
      )}
    </g>
  );
}

/** Field journal label — bottom margin */
export function FieldJournalLabel() {
  return (
    <text
      x="48"
      y="348"
      fontSize="6"
      fill={HR_TOKENS.colors.graphite}
      fontFamily="ui-sans-serif, sans-serif"
      letterSpacing="0.22em"
      opacity="0.5"
    >
      Heritage Rendering · Field Journal
    </text>
  );
}
