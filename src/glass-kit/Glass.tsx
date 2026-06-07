import {
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import {
  generateDisplacementMap,
  mapScaleMatrix,
  type DisplacementMapOptions,
} from "./displacement";

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

/**
 * The core lens. Applies an SVG displacement filter via `backdrop-filter` so it
 * refracts the real, live page content painted behind it.
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
  } = props;

  const lensHalfWidth = props.lensW ?? width / 2;
  const lensHalfHeight = props.lensH ?? height / 2;
  const borderRadius =
    props.borderRadius ?? Math.min(lensHalfWidth, lensHalfHeight) * 0.42;
  const mapSize = props.mapSize ?? DEFAULTS.mapSize;
  const depth = props.depth ?? DEFAULTS.depth;
  const scaleX = props.scaleX ?? DEFAULTS.scaleX;
  const scaleY = props.scaleY ?? DEFAULTS.scaleY;
  const chromaAmount = props.chromaAmount ?? DEFAULTS.chromaAmount;
  const blurAmount = props.blurAmount ?? DEFAULTS.blurAmount;
  const specularStrength = props.specularStrength ?? DEFAULTS.specularStrength;
  const tintColor = props.tintColor ?? DEFAULTS.tintColor;
  const tintOpacity = props.tintOpacity ?? DEFAULTS.tintOpacity;
  const shadowOpacity = props.shadowOpacity ?? DEFAULTS.shadowOpacity;

  const filterUid = useId().replace(/:/g, "");
  const filterId = `gk-glass-${filterUid}`;
  const [mapUrl, setMapUrl] = useState("");

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

  useEffect(() => {
    setMapUrl(generateDisplacementMap(mapOptions));
  }, [mapOptions]);

  const displacementScale = Math.max(scaleX, scaleY);
  const matrixScaleX = displacementScale > 0 ? scaleX / displacementScale : 0;
  const matrixScaleY = displacementScale > 0 ? scaleY / displacementScale : 0;
  const colorMatrix = mapScaleMatrix(matrixScaleX, matrixScaleY);
  const backdropFilter = mapUrl
    ? `url(#${filterId})${blurAmount > 0 ? ` blur(${blurAmount}px)` : ""}`
    : blurAmount > 0
      ? `blur(${blurAmount}px)`
      : "none";
  const sampleFilter = mapUrl ? `url(#${filterId})` : "none";

  return (
    <div
      className={`gk-glass ${className ?? ""}`}
      style={{
        width,
        height,
        borderRadius,
        background: `rgba(${tintColor} / ${tintOpacity})`,
        boxShadow: `0 24px 80px rgba(8, 15, 35, ${shadowOpacity}), inset 0 0 0 1px rgba(255,255,255,.55), inset 0 -16px 34px rgba(255,255,255,.18)`,
        backdropFilter,
        WebkitBackdropFilter: backdropFilter,
        ...style,
      }}
    >
      <svg aria-hidden="true" className="gk-glass__defs" focusable="false" width="0" height="0">
        <defs>
          <filter
            id={filterId}
            filterUnits="objectBoundingBox"
            primitiveUnits="objectBoundingBox"
            colorInterpolationFilters="sRGB"
            x="0" y="0" width="1" height="1"
          >
            {mapUrl && (
              <>
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
              </>
            )}
          </filter>
        </defs>
      </svg>
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
