import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");

function requireFile(relativePath) {
  const path = join(dist, relativePath);
  if (!existsSync(path) || statSync(path).size === 0) {
    throw new Error(`Missing or empty production asset: dist/${relativePath}`);
  }
  return path;
}

const requiredFiles = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "CNAME",
  "favicon.svg",
  "apple-touch-icon.png",
  "og.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "rusty/rusty-00.webp",
  "rusty/rusty-02.webp",
  "rusty/rusty-04.webp",
  "rusty/rusty-06.webp",
  "rusty/rusty-08.webp",
  "rusty/rusty-10.webp",
];

for (const relativePath of requiredFiles) {
  requireFile(relativePath);
}

const cname = readFileSync(join(dist, "CNAME"), "utf8");
if (cname !== "rusty.ninja\n" && cname !== "rusty.ninja") {
  throw new Error("dist/CNAME must contain exactly rusty.ninja");
}

const manifest = JSON.parse(
  readFileSync(join(dist, "manifest.webmanifest"), "utf8"),
);

if (
  manifest.name !== "rusty.ninja" ||
  manifest.short_name !== "Rusty Ninja" ||
  manifest.start_url !== "/#/" ||
  manifest.scope !== "/" ||
  manifest.display !== "standalone"
) {
  throw new Error("The production web app manifest has unexpected core metadata");
}

const purposes = new Set(
  (manifest.icons ?? []).flatMap((icon) =>
    String(icon.purpose ?? "any").split(/\s+/),
  ),
);
if (!purposes.has("any") || !purposes.has("maskable")) {
  throw new Error("The manifest must provide both regular and maskable icons");
}

const html = readFileSync(join(dist, "index.html"), "utf8");
for (const expected of [
  "https://rusty.ninja/",
  "https://rusty.ninja/og.png",
  "manifest.webmanifest",
]) {
  if (!html.includes(expected)) {
    throw new Error(`Production index.html is missing ${expected}`);
  }
}

const workboxFiles = readdirSync(dist).filter((name) =>
  /^workbox-[\w-]+\.js$/.test(name),
);
if (workboxFiles.length === 0) {
  throw new Error("The Workbox runtime was not emitted");
}

const serviceWorker = readFileSync(join(dist, "sw.js"), "utf8");
for (const cachedAsset of [
  "index.html",
  "rusty/rusty-00.webp",
  "rusty/rusty-10.webp",
]) {
  if (!serviceWorker.includes(cachedAsset)) {
    throw new Error(`Service worker precache is missing ${cachedAsset}`);
  }
}

console.log("PWA production artifact verified");
