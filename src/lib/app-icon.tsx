import { ImageResponse } from "next/og";

/** Icona dell'app: monogramma "LN" su prugna (design system LN Studio). */
export function renderAppIcon(size: number, { maskable = false } = {}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          background: "#542033",
          // Le icone "maskable" vengono ritagliate dal sistema: il segno resta nella zona sicura centrale
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <div style={{ display: "flex", color: "#ffffff", fontSize: size * (maskable ? 0.36 : 0.46), fontWeight: 300, letterSpacing: -size * 0.02 }}>LN</div>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: size * 0.05, background: "#af9570", display: maskable ? "none" : "flex" }} />
      </div>
    ),
    { width: size, height: size },
  );
}
