import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // I preventivi sono stati spostati dentro "Percorsi e corsi": i vecchi link (es. nelle email già inviate) restano validi.
  async redirects() {
    return [
      { source: "/docente/preventivi", destination: "/docente/corsi/preventivi", permanent: true },
      { source: "/docente/preventivi/:path*", destination: "/docente/corsi/preventivi/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
