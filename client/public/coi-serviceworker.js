/*! coi-serviceworker - Guido Zuidhof and contributors, licensed under MIT */
/*
 * This service worker intercepts all HTTP responses and adds cross-origin
 * isolation headers, enabling SharedArrayBuffer which is required for
 * FFmpeg WASM video conversion. Uses "credentialless" embedder policy
 * to avoid breaking cross-origin resources like Google Fonts and GTM.
 */
if (typeof window === "undefined") {
  // Service Worker context
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

  self.addEventListener("fetch", function (e) {
    if (
      e.request.cache === "only-if-cached" &&
      e.request.mode !== "same-origin"
    ) {
      return;
    }

    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set(
            "Cross-Origin-Embedder-Policy",
            "credentialless"
          );
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  // Window context — register the service worker
  (async function () {
    // Already cross-origin isolated, nothing to do
    if (window.crossOriginIsolated !== false) return;

    if (!window.isSecureContext) {
      console.log(
        "coi-serviceworker: cross-origin isolation requires HTTPS"
      );
      return;
    }

    const registration = await navigator.serviceWorker
      .register(window.document.currentScript.src)
      .catch((e) => {
        console.error("coi-serviceworker: registration failed:", e);
      });

    if (registration) {
      // Service worker installed but not yet controlling the page — reload
      if (registration.active && !navigator.serviceWorker.controller) {
        window.location.reload();
      }
    }
  })();
}
