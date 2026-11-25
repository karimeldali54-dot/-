const KEY = "kart-game-origin";

export function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

export function bakedGameOrigin(): string {
  return normalizeOrigin(import.meta.env.VITE_GAME_ORIGIN ?? "");
}

export function readGameOrigin(): string {
  const baked = bakedGameOrigin();
  if (baked) return baked;
  if (typeof window === "undefined") return "";
  try {
    return normalizeOrigin(localStorage.getItem(KEY) ?? "");
  } catch {
    return "";
  }
}

export function writeGameOrigin(value: string) {
  const clean = normalizeOrigin(value);
  try {
    if (clean) localStorage.setItem(KEY, clean);
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
  return clean;
}
