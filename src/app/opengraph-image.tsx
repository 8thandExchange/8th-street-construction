import { ImageResponse } from "next/og";

export const alt = "8th Street Construction — Custom Homes & Commercial Building | Augusta, GA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 36,
          }}
        >
          <svg viewBox="-36 -44 72 92" width="120" height="140" fill="none">
            <ellipse cx="0" cy="-14" rx="16" ry="17" stroke="#f2ece0" strokeWidth="2.5" />
            <ellipse cx="0" cy="16" rx="19" ry="20" stroke="#f2ece0" strokeWidth="2.5" />
            <line x1="-30" y1="38" x2="30" y2="38" stroke="#f2ece0" strokeWidth="1" />
            <polygon points="0,38 -4,45 4,45" fill="#b5451b" />
            <line x1="0" y1="-35" x2="0" y2="-39" stroke="#b5451b" strokeWidth="0.6" />
            <line x1="-3" y1="-39" x2="3" y2="-39" stroke="#b5451b" strokeWidth="0.6" />
          </svg>
          <div
            style={{
              display: "flex",
              width: 2,
              height: 120,
              background: "rgba(242,236,224,0.15)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 72,
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "#f2ece0",
                textTransform: "uppercase",
              }}
            >
              8TH STREET
            </div>
            <div
              style={{
                fontFamily: "Helvetica, Arial, sans-serif",
                fontSize: 28,
                fontWeight: 400,
                letterSpacing: "0.35em",
                color: "#5a6672",
                textTransform: "uppercase",
                marginTop: 8,
              }}
            >
              CONSTRUCTION
            </div>
            <div
              style={{
                width: 420,
                height: 2,
                background: "#b5451b",
                marginTop: 16,
              }}
            />
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 26,
                fontStyle: "italic",
                letterSpacing: "0.08em",
                color: "#5a6672",
                marginTop: 14,
              }}
            >
              Augusta, Georgia
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
