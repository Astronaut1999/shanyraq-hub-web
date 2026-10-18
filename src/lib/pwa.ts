/**
 * Service worker registration wrapper.
 * The worker must never run in dev or inside the Lovable preview iframe, where a
 * cached shell would serve stale HTML. In every refused context we also unregister
 * any worker that was registered earlier.
 */
const SW_URL = "/sw.js";

function blockedHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterExisting() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((registration) => (registration.active?.scriptURL ?? "").endsWith(SW_URL))
      .map((registration) => registration.unregister()),
  );
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    blockedHost(window.location.hostname) ||
    new URLSearchParams(window.location.search).has("sw") ;

  if (refused) {
    await unregisterExisting();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch {
    // Registration failures must never break the app.
  }
}
