import type { MetadataRoute } from "next";

/** Web app manifest: la piattaforma si installa sulla schermata Home e si apre come un'app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LN Studio · Stile e Portamento",
    short_name: "LN Studio",
    description: "Il tuo percorso di portamento: lezioni, questionari, feedback e attestati.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f6f3",
    theme_color: "#542033",
    lang: "it",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "La mia area", url: "/allieva" },
      { name: "Panoramica docente", url: "/docente" },
    ],
  };
}
