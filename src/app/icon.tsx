import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1620",
          color: "#F5F1EA",
          fontSize: 20,
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
        }}
      >
        8
      </div>
    ),
    { ...size }
  );
}
