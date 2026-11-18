import type { MetadataRoute } from "next";

/**
 * Web app manifest: lets supported browsers install Katsodi as an app that
 * opens this same website in its own window. Colours are the default
 * Obsidian canvas (src/app/signal.css).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Katsodi",
    short_name: "Katsodi",
    description:
      "Watch, listen, and spend time together. Смотрите и слушайте вместе.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#0c0e11",
    theme_color: "#0c0e11",
    lang: "ru",
    categories: ["entertainment", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
