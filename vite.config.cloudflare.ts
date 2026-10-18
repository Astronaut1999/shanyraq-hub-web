// Cloudflare-specific build. The original vite.config.ts is left unchanged
// for local development. Never combine the Lovable Nitro adapter with this plugin.
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({ server: { entry: "server" } }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: { enabled: false },
      filename: "sw.js",
      manifest: {
        name: "Шаңырақ Хаб — мәдениет орталықтарының платформасы",
        short_name: "Шаңырақ Хаб",
        description: "Павлодар облысының мәдениет ұйымдарына арналған платформа",
        lang: "kk",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0b1a33",
        theme_color: "#0b1a33",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "shanyraq-pages",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 30, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              Boolean(sameOrigin) && /\/(assets|_build)\//.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "shanyraq-assets",
              expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
            },
          },
        ],
      },
    }),
  ],
});
