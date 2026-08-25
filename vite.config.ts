import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

const fiveMegabytes = 5 * 1024 * 1024;

export default defineConfig({
  base: "/",
  build: {
    target: "es2022",
    sourcemap: false,
  },
  plugins: [
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifestFilename: "manifest.webmanifest",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "icons/*.png",
        "rusty/**/*.{webp,avif}",
      ],
      manifest: {
        id: "/",
        name: "rusty.ninja",
        short_name: "Rusty Ninja",
        description:
          "An endless, adaptive Rust security code-review game for sharpening real auditing instincts.",
        lang: "en-US",
        dir: "ltr",
        start_url: "/#/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#0b0d10",
        theme_color: "#0b0d10",
        categories: ["education", "games", "developer"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cacheId: "rusty-ninja",
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webp,avif,woff,woff2,json}",
        ],
        globIgnores: ["og.png"],
        maximumFileSizeToCacheInBytes: fiveMegabytes,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/(?:assets|icons|rusty)\//,
          /\/[^/?]+\.[^/]+$/,
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
