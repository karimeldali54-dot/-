export function insideAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  return /; wv\)/i.test(window.navigator.userAgent);
}

export function appDeepLink(room?: string): string {
  const origin = window.location.origin;
  const route = room ? `r/${encodeURIComponent(room)}` : "open";
  return `kartelfer3on://${route}?origin=${encodeURIComponent(origin)}`;
}
