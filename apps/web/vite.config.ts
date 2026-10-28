import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Offline-first PWA. Quran data lives in /public/data and is fetched at runtime,
// then cached by the service worker so the app works fully offline after first load.
export default defineConfig({
  // .env / .env.local stay at the repo root (shared with the InsForge CLI setup).
  envDir: "../..", // resolved against this app root
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        background_color: "#f4f5f8",
        description:
          "Quranic contemplation: tadabbur, daily check-in, journaling.",
        display: "standalone",
        icons: [
          {
            purpose: "any",
            sizes: "192x192",
            src: "mark-v2-192.png",
            type: "image/png",
          },
          {
            purpose: "any",
            sizes: "512x512",
            src: "mark-v2-512.png",
            type: "image/png",
          },
          {
            purpose: "maskable",
            sizes: "512x512",
            src: "mark-v2-512.png",
            type: "image/png",
          },
        ],
        name: "MindfulVerse",
        short_name: "MindfulVerse",
        start_url: "/",
        theme_color: "#2a3a8c",
      },
      // Custom SW (src/sw.ts) handles precache + /data runtime caching (parity
      // with the previous generateSW config) plus push/notificationclick.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        // The journal PDF builder (pdf-lib + fontkit, ~500KB gzipped) loads on
        // demand only — don't make every install download it up front.
        globIgnores: ["**/journalPdf-*.js"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
});
