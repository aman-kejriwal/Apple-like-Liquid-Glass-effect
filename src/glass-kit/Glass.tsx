import {
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getDisplacementMap,
  getHighlightOverlay,
  mapScaleMatrix,
  resolveMapSize,
  type DisplacementMapOptions,
} from "./displacement";
import { supportsBackdropDisplacement } from "./support";
import { useBackdropRefraction } from "./useBackdropRefraction";

export type GlassProps = PropsWithChildren<{
  /** rendered box size in px */
  width: number;
  height: number;
  /** lens half-extents (default: half of width/height) */
  lensW?: number;
  lensH?: number;
  borderRadius?: number;
  className?: string;
  style?: CSSProperties;
  /** displacement-map resolution (px). higher = crisper, slower to bake. */
  mapSize?: number;
  /** bevel thickness — how far in from the edge the refraction ramps */
  depth?: number;
  /** displacement strength per axis */
  scaleX?: number;
  scaleY?: number;
  /** chromatic aberration (0 = off) */
  chromaAmount?: number;
  /** frosted blur in px (0 reads best for most cases) */
  blurAmount?: number;
  sdfBoundary?: boolean;
  edgeFalloff?: boolean;
  domeDepth?: number;
  splayAmount?: number;
  specularStrength?: number;
  specularRotation?: number;
  glowStrength?: number;
  glowSpread?: number;
  glowExponent?: number;
  edgeStrength?: number;
  edgeWidth?: number;
  edgeExponent?: number;
  /** white wash over the lens, "r g b" */
  tintColor?: string;
  tintOpacity?: number;
  shadowOpacity?: number;
  /**
   * Optional live DOM fallback for browsers that ignore url() in
   * backdrop-filter; filtered with the same chain and aligned via the offsets.
   */
  sample?: ReactNode;
  sampleWidth?: number;
  sampleHeight?: number;
  sampleOffsetX?: number;
  sampleOffsetY?: number;
  /**
   * CSS selector for the page's backdrop element (e.g. a photo grid or hero
   * image). On engines that can't refract through `backdrop-filter` (WebKit,
   * Firefox) the kit clones that element into the lens and runs the displacement
   * filter on the clone via a plain `filter:` — which those engines DO execute —
   * giving real refraction of the real content instead of a frosted blur. The
   * clone tracks scroll/drag on a transform-only rAF loop and pauses off-screen.
   * Chromium ignores this and uses its native backdrop-filter path.
   */
  backdropSelector?: string;
}>;

const DEFAULTS = {
  mapSize: 512,
  depth: 5,
  scaleX: 0.11,
  scaleY: 0.11,
  chromaAmount: 0.65,
  blurAmount: 0,
  sdfBoundary: true,
  edgeFalloff: true,
  domeDepth: 18,
  splayAmount: 0.55,
  specularStrength: 1.25,
  specularRotation: 45,
  glowStrength: 0.35,
  glowSpread: 0.55,
  glowExponent: 1.5,
  edgeStrength: 0.2,
  edgeWidth: 2.5,
  edgeExponent: 1.35,
  tintColor: "255 255 255",
  tintOpacity: 0.16,
  shadowOpacity: 0.22,
} satisfies Partial<GlassProps>;

// Module-scoped counter for unique, render-stable filter ids without useId
// quirks. Each bake gets a fresh suffix (Safari caches SVG filters by id and
// will otherwise freeze on a stale map — see the bake effect below).
let filterSeq = 0;

/**
 * The core lens. On Chromium it applies an SVG displacement filter via
 * `backdrop-filter` so it refracts the real, live page content painted behind
 * it. On Safari/Firefox — which parse `backdrop-filter: url()` but never run the
 * filter against the backdrop — it degrades to a frosted blur with a baked
 * specular rim so it still reads as glass rather than a flat tint.
 *
 * NB: a CSS `filter` on ANY ancestor flattens the subtree and stops
 * backdrop-filter from sampling — never wrap Glass in a `filter`. `transform`
 * is safe.
 */
export function Glass(props: GlassProps) {
  const {
    width,
    height,
    className,
    style,
    children,
    sample,
    sampleWidth,
    sampleHeight,
    sampleOffsetX = 0,
    sampleOffsetY = 0,
    backdropSelector,
  } = props;

  const lensHalfWidth = props.lensW ?? width / 2;
  const lensHalfHeight = props.lensH ?? height / 2;
  const borderRadius =
    props.borderRadius ?? Math.min(lensHalfWidth, lensHalfHeight) * 0.42;
  const requestedMapSize = props.mapSize ?? DEFAULTS.mapSize;
  const depth = props.depth ?? DEFAULTS.depth;
  const scaleX = props.scaleX ?? DEFAULTS.scaleX;
  const scaleY = props.scaleY ?? DEFAULTS.scaleY;
  const chromaAmount = props.chromaAmount ?? DEFAULTS.chromaAmount;
  const blurAmount = props.blurAmount ?? DEFAULTS.blurAmount;
  const specularStrength = props.specularStrength ?? DEFAULTS.specularStrength;
  const tintColor = props.tintColor ?? DEFAULTS.tintColor;
  const tintOpacity = props.tintOpacity ?? DEFAULTS.tintOpacity;
  const shadowOpacity = props.shadowOpacity ?? DEFAULTS.shadowOpacity;

  // Cap the bake to what the on-screen size can actually show. A 24px thumb
  // gains nothing from a 512² map.
  const mapSize = resolveMapSize(
    requestedMapSize,
    lensHalfWidth,
    lensHalfHeight,
  );

  // Capability is detected on the client. SSR / first paint assumes the safe
  // fallback (false), then we confirm on mount so Chromium upgrades to true
  // refraction without a hydration mismatch on the filter url.
  const [canRefract, setCanRefract] = useState(false);
  // `mounted` flips true after the first client effect; before that we never
  // pick the WebKit clone path (it needs the real DOM + selector), so SSR/first
  // paint stays the safe fallback.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setCanRefract(supportsBackdropDisplacement());
    setMounted(true);
  }, []);

  // WebKit/Firefox can't refract through backdrop-filter, but they DO run an SVG
  // filter applied via plain `filter:`. When the consumer points us at the page
  // backdrop, we clone that slice into the lens and filter the clone — real
  // refraction of real content. Only on the non-Chromium path, only when we have
  // a backdrop to sample, and only after mount (needs the live DOM).
  const useCloneRefraction = mounted && !canRefract && !!backdropSelector;

  const reduceMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fresh filter id every time the map changes. Stable ids freeze the lens in
  // Safari (it caches filter output by id); a new id forces a re-render.
  const [filterId, setFilterId] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [overlayUrl, setOverlayUrl] = useState("");

  const mapOptions = useMemo<DisplacementMapOptions>(
    () => ({
      canvasSize: mapSize,
      lensHalfWidth,
      lensHalfHeight,
      borderRadius,
      depth,
      sdfBoundary: props.sdfBoundary ?? DEFAULTS.sdfBoundary,
      edgeFalloff: props.edgeFalloff ?? DEFAULTS.edgeFalloff,
      specularRotation: props.specularRotation ?? DEFAULTS.specularRotation,
      glowStrength: props.glowStrength ?? DEFAULTS.glowStrength,
      glowSpread: props.glowSpread ?? DEFAULTS.glowSpread,
      glowExponent: props.glowExponent ?? DEFAULTS.glowExponent,
      edgeStrength: props.edgeStrength ?? DEFAULTS.edgeStrength,
      edgeWidth: props.edgeWidth ?? DEFAULTS.edgeWidth,
      edgeExponent: props.edgeExponent ?? DEFAULTS.edgeExponent,
      domeDepth: props.domeDepth ?? DEFAULTS.domeDepth,
      splayAmount: props.splayAmount ?? DEFAULTS.splayAmount,
    }),
    [
      borderRadius, depth, lensHalfHeight, lensHalfWidth, mapSize,
      props.domeDepth, props.edgeExponent, props.edgeFalloff, props.edgeStrength,
      props.edgeWidth, props.glowExponent, props.glowSpread, props.glowStrength,
      props.sdfBoundary, props.specularRotation, props.splayAmount,
    ],
  );

  // Either refraction path (Chromium backdrop-filter, or the WebKit/Firefox
  // clone-and-`filter:` path) needs the baked displacement map and a fresh
  // filter id. Only the plain frosted fallback (no backdrop selector) needs the
  // highlight overlay instead. The bake is the only expensive bit and runs
  // solely when params change — never per frame, never on scroll.
  const willRefract = canRefract || useCloneRefraction;
  useEffect(() => {
    if (willRefract) {
      const url = getDisplacementMap(mapOptions);
      setMapUrl(url);
      filterSeq += 1;
      // Fresh id per bake: Safari caches SVG filter output by id and would
      // otherwise freeze on a stale map.
      setFilterId(`gk-glass-${filterSeq}`);
    } else {
      setOverlayUrl(getHighlightOverlay(mapOptions));
    }
  }, [mapOptions, willRefract]);

  // Pause the (GPU-expensive) backdrop pass while the lens is scrolled out of
  // view. backdrop-filter re-runs every frame the backdrop changes even when
  // the element is off-screen, so dropping it back to `none` recovers real work
  // on long pages.
  const rootRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setOnScreen(entries[0]?.isIntersecting ?? true),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const displacementScale = Math.max(scaleX, scaleY);
  const matrixScaleX = displacementScale > 0 ? scaleX / displacementScale : 0;
  const matrixScaleY = displacementScale > 0 ? scaleY / displacementScale : 0;
  const colorMatrix = mapScaleMatrix(matrixScaleX, matrixScaleY);

  // The SVG <filter> is live (and usable as url(#id)) whenever either refraction
  // path is active and the map has baked.
  const filterDefined = willRefract && !!mapUrl && !!filterId;
  // Chromium refracts the live backdrop directly through backdrop-filter.
  const backdropDisplace = canRefract && filterDefined;

  // backdrop-filter value. Off-screen → none (skip the pass entirely).
  let backdropFilter: string;
  if (!onScreen) {
    backdropFilter = "none";
  } else if (backdropDisplace) {
    backdropFilter = `url(#${filterId})${blurAmount > 0 ? ` blur(${blurAmount}px)` : ""}`;
  } else if (useCloneRefraction) {
    // The clone layer carries the displacement filter; the host stays clear so
    // the refracted clone reads as the glass. A touch of saturate lifts it.
    backdropFilter =
      blurAmount > 0 ? `blur(${blurAmount}px) saturate(1.15)` : "saturate(1.15)";
  } else if (!canRefract) {
    // Last-ditch fallback (no backdrop selector given): a real frosted blur with
    // the baked rim highlight overlay so it still reads as lit glass.
    backdropFilter = `blur(${Math.max(blurAmount, 8)}px) saturate(1.4)`;
  } else if (blurAmount > 0) {
    backdropFilter = `blur(${blurAmount}px)`;
  } else {
    backdropFilter = "none";
  }
  const sampleFilter = filterDefined ? `url(#${filterId})` : "none";

  // Whether we show the plain frosted fallback (rim overlay + heavy blur).
  const frostedFallback = !canRefract && !useCloneRefraction;

  // Wire the WebKit/Firefox clone-refraction path. Inert on Chromium and when no
  // backdrop selector is supplied. The hook pauses its own rAF loop off-screen
  // via an internal IntersectionObserver, so `active` deliberately does NOT
  // include `onScreen` — that would tear down and rebuild the clone on every
  // scroll in/out. It only needs the map to have baked (filterDefined).
  useBackdropRefraction({
    hostRef: rootRef,
    selector: backdropSelector,
    filterId,
    active: useCloneRefraction && filterDefined,
    reduceMotion,
  });

  return (
    <div
      ref={rootRef}
      className={`gk-glass ${frostedFallback ? "gk-glass--fallback" : ""} ${useCloneRefraction ? "gk-glass--clone" : ""} ${className ?? ""}`}
      style={{
        width,
        height,
        borderRadius,
        background: `rgba(${tintColor} / ${frostedFallback ? tintOpacity + 0.06 : tintOpacity})`,
        boxShadow: `0 24px 80px rgba(8, 15, 35, ${shadowOpacity}), inset 0 0 0 1px rgba(255,255,255,.55), inset 0 -16px 34px rgba(255,255,255,.18)`,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
        ...style,
      }}
    >
      {filterDefined && (
        <svg aria-hidden="true" className="gk-glass__defs" focusable="false" width="0" height="0">
          <defs>
            <filter
              id={filterId}
              filterUnits="objectBoundingBox"
              primitiveUnits="objectBoundingBox"
              colorInterpolationFilters="sRGB"
              x="0" y="0" width="1" height="1"
            >
              <feFlood floodColor="rgb(128,128,128)" floodOpacity="1" result="mapBg" />
              <feImage href={mapUrl} preserveAspectRatio="none" result="rawMap" />
              <feComposite in="rawMap" in2="mapBg" operator="over" result="map" />
              <feColorMatrix in="map" type="matrix" values={colorMatrix} result="scaledMap" />
              {blurAmount > 0 && (
                <feGaussianBlur in="SourceGraphic" stdDeviation={`${blurAmount / width} ${blurAmount / height}`} result="blurred" />
              )}
              {chromaAmount > 0 ? (
                <>
                  <feDisplacementMap in={blurAmount > 0 ? "blurred" : "SourceGraphic"} in2="scaledMap" scale={displacementScale * (1 + 0.2 * chromaAmount)} xChannelSelector="R" yChannelSelector="G" />
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispR" />
                  <feDisplacementMap in={blurAmount > 0 ? "blurred" : "SourceGraphic"} in2="scaledMap" scale={displacementScale * (1 + 0.1 * chromaAmount)} xChannelSelector="R" yChannelSelector="G" />
                  <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="dispG" />
                  <feDisplacementMap in={blurAmount > 0 ? "blurred" : "SourceGraphic"} in2="scaledMap" scale={displacementScale} xChannelSelector="R" yChannelSelector="G" />
                  <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="dispB" />
                  <feComposite in="dispR" in2="dispG" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
                  <feComposite in2="dispB" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="lensResult" />
                </>
              ) : (
                <feDisplacementMap in={blurAmount > 0 ? "blurred" : "SourceGraphic"} in2="scaledMap" scale={displacementScale} xChannelSelector="R" yChannelSelector="G" result="lensResult" />
              )}
              <feColorMatrix in="map" type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 1 0 ${-128 / 255}`} result="specMask" />
              <feComposite in="specMask" in2="lensResult" operator="arithmetic" k1="0" k2={specularStrength} k3="1" k4="0" result="lensResult" />
              <feFlood floodColor="black" floodOpacity="1" result="lensMask" />
              <feComposite in="SourceGraphic" in2="lensMask" operator="out" result="holedSource" />
              <feComposite in="lensResult" in2="holedSource" operator="over" />
            </filter>
          </defs>
        </svg>
      )}
      {/* Frosted fallback rim/specular: the baked highlight that gives the
          frosted box a lit, bevelled glass edge. Only used when we have neither
          refraction path (no backdrop selector on a non-Chromium engine). */}
      {frostedFallback && overlayUrl && (
        <div
          className="gk-glass__rim"
          style={{
            backgroundImage: `url(${overlayUrl})`,
            opacity: Math.min(1, 0.5 * specularStrength),
          }}
        />
      )}
      {sample && (
        <div className="gk-glass__sample" style={{ filter: sampleFilter }}>
          <div
            className="gk-glass__sample-inner"
            style={{
              width: sampleWidth,
              height: sampleHeight,
              transform: `translate(${-sampleOffsetX}px, ${-sampleOffsetY}px)`,
            }}
          >
            {sample}
          </div>
        </div>
      )}
      <div className="gk-glass__sheen" />
      <div className="gk-glass__content">{children}</div>
    </div>
  );
}
