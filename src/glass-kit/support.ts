/**
 * Runtime capability detection for the glass effect.
 *
 * The whole lens hangs on one thing: does the browser apply an SVG filter
 * (`feDisplacementMap`) through `backdrop-filter: url(#id)`? Chromium does.
 * WebKit (Safari) and Firefox parse the value — `getComputedStyle` even reports
 * it back — but never run the filter against the backdrop, so the glass renders
 * as a flat tinted box with no refraction.
 *
 * Both engines *accept* the value — `getComputedStyle` reports `url("#id")` on
 * either — so there is no purely declarative signal. The only behavioural split
 * is the engine itself: Blink (Chromium) refracts; WebKit and Gecko don't. We
 * detect Blink, being careful to catch Headless Chrome / Brave / Arc / Edge and
 * to exclude Safari and Firefox. A consumer that needs certainty can override
 * the result by passing the `sample` prop, which works everywhere.
 */

let cached: boolean | null = null;

function detect(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  // 1. The property must exist at all. (Rules out very old engines.)
  const probe = document.createElement("div");
  const hasBackdrop =
    "backdropFilter" in probe.style || "webkitBackdropFilter" in probe.style;
  if (!hasBackdrop) return false;

  // 2. Engine split. Every Chromium UA contains "Chrome" — including
  //    "HeadlessChrome", "CriOS" (iOS Chrome, which is really WebKit-backed and
  //    is therefore deliberately treated as non-Chromium below), "Edg", "OPR",
  //    "Brave". Safari contains "Safari" but never "Chrome". Firefox is "Gecko".
  const ua = navigator.userAgent;

  // iOS browsers (CriOS/FxiOS/EdgiOS + any iPhone/iPad UA) are WebKit under the
  // hood regardless of brand, so they never refract.
  const isIOS = /iPhone|iPad|iPod|CriOS|FxiOS|EdgiOS/i.test(ua);
  if (isIOS) return false;

  const isFirefox = /Firefox/i.test(ua);
  if (isFirefox) return false;

  // Desktop Safari: "Safari" present, "Chrome"/"Chromium" absent.
  const isChromium = /Chrome|Chromium|Edg|OPR|Brave/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !isChromium;
  if (isSafari) return false;

  return isChromium;
}

/**
 * True when `backdrop-filter: url(#svg)` actually refracts the backdrop
 * (Chromium). False in WebKit/Firefox, where it is silently ignored.
 *
 * On the server (no DOM) this returns false, so SSR markup is the safe fallback
 * variant and the client re-checks on mount.
 */
export function supportsBackdropDisplacement(): boolean {
  if (cached !== null) return cached;
  cached = detect();
  return cached;
}

/** Test-only: clear the memoised result. */
export function __resetSupportCache() {
  cached = null;
}
