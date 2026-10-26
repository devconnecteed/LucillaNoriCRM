import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Intestazioni di sicurezza. La CSP vale solo in produzione (in sviluppo Next usa eval per il refresh).
 * 'unsafe-inline' per script/stili è richiesto dagli script inline di Next senza nonce.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // I token di inviti e preventivi stanno nell'URL: non devono mai uscire verso altri siti tramite il Referer
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isProd
    ? [
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self'",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "base-uri 'self'",
            "object-src 'none'",
          ].join("; "),
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Cartella di build configurabile: permette una build di produzione di collaudo accanto al server di sviluppo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // I preventivi sono stati spostati dentro "Percorsi e corsi": i vecchi link (es. nelle email già inviate) restano validi.
  async redirects() {
    return [
      { source: "/docente/preventivi", destination: "/docente/corsi/preventivi", permanent: true },
      { source: "/docente/preventivi/:path*", destination: "/docente/corsi/preventivi/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
