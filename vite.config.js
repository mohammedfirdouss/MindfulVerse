import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
// Offline-first PWA. Quran data lives in /public/data and is fetched at runtime,
// then cached by the service worker so the app works fully offline after first load.
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.svg"],
            manifest: {
                name: "MindfulVerse",
                short_name: "MindfulVerse",
                description: "Quranic contemplation — tadabbur, daily check-in, journaling.",
                theme_color: "#2a3a8c",
                background_color: "#f5efe2",
                display: "standalone",
                start_url: "/",
                icons: [
                    { src: "icon-192.png", sizes: "192x192", type: "image/png" },
                    { src: "icon-512.png", sizes: "512x512", type: "image/png" },
                ],
            },
            // Custom SW (src/sw.ts) handles precache + /data runtime caching (parity
            // with the previous generateSW config) plus push/notificationclick.
            strategies: "injectManifest",
            srcDir: "src",
            filename: "sw.ts",
            injectManifest: {
                globPatterns: ["**/*.{js,css,html,svg,woff2}"],
                maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
            },
        }),
    ],
});
