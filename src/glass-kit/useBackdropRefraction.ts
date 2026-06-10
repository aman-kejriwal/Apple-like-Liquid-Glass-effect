/**
 * WebKit / Firefox real-refraction path.
 *
 * Those engines parse `backdrop-filter: url(#svg)` but never run the SVG filter
 * against the backdrop, so the lens can't refract the live page that way. They
 * *do*, however, run an SVG filter applied as a plain `filter:` on a normal
 * element. (Proven on eoghancollins.com/tools.)
 *
 * So instead of refracting the real backdrop in place, we reproduce the slice of
 * backdrop sitting behind the lens — a live DOM **clone** of a backdrop element
 * the consumer points us at — inside the lens, line it up pixel-for-pixel with
 * the real content behind the glass, and apply the displacement filter to *that*
 * via `filter: url()`. WebKit runs it, so you get genuine displacement
 * refraction of the real content, not a frosted blur.
 *
 * Cost control:
 *   - The clone is built once (and rebuilt only if the source subtree changes,
 *     coalesced through a MutationObserver). Per-frame work is a single
 *     `transform` write — no layout reads beyond two `getBoundingClientRect`s,
 *     no reflow.
 *   - An IntersectionObserver pauses the rAF loop whenever the lens scrolls out
 *     of view.
 *   - The clone is `aria-hidden` and `pointer-events:none`; it never receives
 *     input and is invisible to assistive tech.
 */
import { useEffect, useRef, type RefObject } from "react";

export type BackdropRefractionConfig = {
  /** The lens root element (the clipped, filtered slice lives inside it). */
  hostRef: RefObject<HTMLElement | null>;
  /** CSS selector for the element to reproduce behind the lens (the backdrop). */
  selector: string | undefined;
  /** SVG filter id to apply to the clone (the displacement chain). */
  filterId: string;
  /** When false the path is inert (Chromium uses real backdrop-filter instead). */
  active: boolean;
  /** Honour reduced-motion: redraw only when geometry actually changes. */
  reduceMotion: boolean;
};

/**
 * Find the backdrop source element, preferring one that actually sits behind the
 * host (covers the common case of multiple matches, e.g. a per-section grid).
 */
function resolveSource(selector: string, host: HTMLElement): HTMLElement | null {
  let found: HTMLElement[];
  try {
    found = Array.from(document.querySelectorAll<HTMLElement>(selector));
  } catch {
    // Invalid selector (it's a public prop) — fail closed to no clone.
    return null;
  }
  const matches = found.filter(
    (el) => el !== host && !host.contains(el) && !el.contains(host),
  );
  if (matches.length <= 1) return matches[0] ?? null;
  const hostRect = host.getBoundingClientRect();
  const cx = hostRect.left + hostRect.width / 2;
  const cy = hostRect.top + hostRect.height / 2;
  // Prefer a source whose box contains the lens centre; else the nearest one.
  let best: HTMLElement | null = null;
  let bestDist = Infinity;
  for (const el of matches) {
    const r = el.getBoundingClientRect();
    const inside = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    const dx = cx - (r.left + r.width / 2);
    const dy = cy - (r.top + r.height / 2);
    const dist = (inside ? 0 : 1e9) + Math.hypot(dx, dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }
  return best;
}

export function useBackdropRefraction(config: BackdropRefractionConfig) {
  const { hostRef, selector, filterId, active, reduceMotion } = config;

  // Kept in a ref so the rAF loop reads the latest without re-subscribing.
  const latest = useRef({ selector, filterId, active, reduceMotion });
  latest.current = { selector, filterId, active, reduceMotion };

  // The clone layer, held so the cheap filter-id effect can restyle it without
  // tearing the whole clone down.
  const layerRef = useRef<HTMLDivElement | null>(null);

  // Cheap: a fresh bake gives a fresh filter id (Safari caches by id). Just
  // re-point the existing layer at it — no clone rebuild, so dragging a slider
  // that re-bakes every step stays smooth.
  useEffect(() => {
    if (layerRef.current && filterId) {
      layerRef.current.style.filter = `url(#${filterId})`;
    }
  }, [filterId]);

  // Expensive setup: build the clone + run the rAF alignment loop. Re-runs only
  // when the host, the on/off state, or the selector changes — NOT on every
  // bake.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined") return;
    if (!active || !selector) return;

    let layer: HTMLDivElement | null = null;
    let inner: HTMLDivElement | null = null;
    let source: HTMLElement | null = null;
    let rafId = 0;
    let onScreen = true;
    let lastKey = "";
    let mo: MutationObserver | null = null;

    // Clone whatever `source` currently points at into the lens. Callers set
    // `source` first (via resolveSource) so this only rasterises, never resolves.
    const buildClone = () => {
      if (!source || !inner) return;
      inner.replaceChildren();
      const clone = source.cloneNode(true) as HTMLElement;
      // The clone is decoration only.
      clone.removeAttribute("id");
      clone.setAttribute("aria-hidden", "true");
      clone
        .querySelectorAll("[id]")
        .forEach((el) => el.removeAttribute("id"));
      // Strip interactivity from the clone.
      clone.style.pointerEvents = "none";
      inner.appendChild(clone);
    };

    // Build the host-local layers once.
    layer = document.createElement("div");
    layer.className = "gk-glass__refraction";
    layer.setAttribute("aria-hidden", "true");
    layer.style.filter = `url(#${latest.current.filterId})`;
    layerRef.current = layer;
    inner = document.createElement("div");
    inner.className = "gk-glass__refraction-inner";
    layer.appendChild(inner);
    // Sits above the tint background, below the sheen/content (z-index in CSS).
    host.prepend(layer);

    source = resolveSource(selector, host);
    buildClone();

    // Rebuild the clone when the source subtree mutates (e.g. images swap,
    // content changes). Coalesced to the next frame so a burst of mutations
    // triggers a single rebuild.
    let rebuildQueued = false;
    const queueRebuild = () => {
      if (rebuildQueued) return;
      rebuildQueued = true;
      requestAnimationFrame(() => {
        rebuildQueued = false;
        buildClone();
        lastKey = ""; // force a reposition after rebuild
      });
    };

    const observeSource = () => {
      mo?.disconnect();
      if (!source) return;
      mo = new MutationObserver(queueRebuild);
      mo.observe(source, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true,
      });
    };
    observeSource();

    // If the page has more than one element matching the selector (e.g. a
    // per-section backdrop), a lens dragged from one section to another should
    // re-bind to whichever now sits behind it. Re-resolve when the host has
    // moved a meaningful distance, and only when there's more than one candidate
    // (the single-backdrop common case never pays for this).
    let multiSource = false;
    try {
      multiSource =
        document.querySelectorAll(latest.current.selector!).length > 1;
    } catch {
      multiSource = false;
    }
    let lastResolveX = 0;
    let lastResolveY = 0;

    const maybeRebind = (hostRect: DOMRect) => {
      if (!multiSource) return;
      const moved =
        Math.abs(hostRect.left - lastResolveX) +
        Math.abs(hostRect.top - lastResolveY);
      if (moved < 24) return;
      lastResolveX = hostRect.left;
      lastResolveY = hostRect.top;
      const next = resolveSource(latest.current.selector!, host);
      if (next && next !== source) {
        source = next;
        buildClone();
        observeSource();
        lastKey = "";
      }
    };

    const position = () => {
      if (!source || !inner || !layer) return;
      const hostRect = host.getBoundingClientRect();
      maybeRebind(hostRect);
      if (!source) return;
      const srcRect = source.getBoundingClientRect();
      // Offset the clone so the slice of backdrop directly behind the lens lands
      // exactly where it sits on the real page. Both move together on scroll, so
      // this is a transform-only update — no layout thrash.
      const dx = srcRect.left - hostRect.left;
      const dy = srcRect.top - hostRect.top;
      const key = `${Math.round(dx)}:${Math.round(dy)}:${Math.round(srcRect.width)}:${Math.round(srcRect.height)}`;
      if (latest.current.reduceMotion && key === lastKey) return false;
      lastKey = key;
      inner.style.width = `${srcRect.width}px`;
      inner.style.height = `${srcRect.height}px`;
      inner.style.transform = `translate(${dx}px, ${dy}px)`;
      return true;
    };

    const tick = () => {
      if (onScreen) position();
      rafId = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
      },
      { rootMargin: "20% 0px" },
    );
    io.observe(host);

    // First lay-out synchronously so there's no unfiltered flash.
    position();
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      io.disconnect();
      mo?.disconnect();
      layer?.remove();
      if (layerRef.current === layer) layerRef.current = null;
    };
    // Re-runs only when the path toggles on/off or the selector changes. The
    // filter id is applied separately (cheap restyle) so a re-baking slider drag
    // doesn't rebuild the clone. filterId/reduceMotion are read live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostRef, active, selector]);
}
