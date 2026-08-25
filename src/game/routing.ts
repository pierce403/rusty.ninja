export type AppRoute =
  | { readonly kind: "home" }
  | { readonly kind: "challenge"; readonly seed: string }
  | { readonly kind: "stats" }
  | { readonly kind: "settings" }
  | { readonly kind: "not-found"; readonly path: string };

const SHARE_SEED_PATTERN = /^[A-Za-z0-9._~-]{1,128}$/;

export function isValidShareSeed(seed: string): boolean {
  return SHARE_SEED_PATTERN.test(seed);
}
function decodedPath(hash: string): string | null {
  const marker = hash.indexOf("#");
  const fragment = marker >= 0 ? hash.slice(marker + 1) : hash;
  if (fragment === "" || fragment === "/") return "/";

  try {
    return decodeURIComponent(fragment.startsWith("/") ? fragment : `/${fragment}`);
  } catch {
    return null;
  }
}

export function parseHashRoute(hash: string): AppRoute {
  const path = decodedPath(hash);
  if (path === null) return { kind: "not-found", path: hash };

  const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (normalized === "/") return { kind: "home" };
  if (normalized === "/stats") return { kind: "stats" };
  if (normalized === "/settings") return { kind: "settings" };

  const match = /^\/c\/([^/]+)$/.exec(normalized);
  if (match) {
    const seed = match[1] as string;
    if (isValidShareSeed(seed)) {
      return { kind: "challenge", seed };
    }
  }

  return { kind: "not-found", path: normalized };
}

export function buildChallengeHash(seed: string): string {
  if (!isValidShareSeed(seed)) {
    throw new TypeError(
      "A share seed must be 1–128 URL-safe letters, numbers, dots, underscores, tildes, or hyphens",
    );
  }
  return `#/c/${encodeURIComponent(seed)}`;
}

export function buildShareUrl(
  seed: string,
  productionUrl = "https://rusty.ninja/",
): string {
  const url = new URL(productionUrl);
  url.hash = buildChallengeHash(seed).slice(1);
  return url.toString();
}
