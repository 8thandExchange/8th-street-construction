import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <svg viewBox="-36 -44 72 92" width="110" height="128" fill="none">
          <ellipse cx="0" cy="-14" rx="16" ry="17" stroke="#f2ece0" strokeWidth="2.5" />
          <ellipse cx="0" cy="16" rx="19" ry="20" stroke="#f2ece0" strokeWidth="2.5" />
          <line x1="-30" y1="38" x2="30" y2="38" stroke="#f2ece0" strokeWidth="1" />
          <polygon points="0,38 -4,45 4,45" fill="#b5451b" />
          <line x1="0" y1="-35" x2="0" y2="-39" stroke="#b5451b" strokeWidth="0.6" />
          <line x1="-3" y1="-39" x2="3" y2="-39" stroke="#b5451b" strokeWidth="0.6" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
