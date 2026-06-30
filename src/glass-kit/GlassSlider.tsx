import { useCallback, useEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { Glass, type GlassProps } from "./Glass";
import { useMorphActive } from "./useMorphActive";

const TRACK_W = 264;
const THUMB = 24;
const HIT_H = 30;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Slider with a real grabbable thumb. The track stays put; the THUMB is what
 * morphs — a solid disc at rest that grows and turns into a clear glass lens
 * while dragged, stretching along travel by velocity. The fill bar is a true
 * value bar that is genuinely zero-length at the minimum.
 */
export function GlassSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
  blurAmount = 0,
  depth = 7,
  chromaAmount = 0.8,
  specularStrength = 1.5,
  tintOpacity = 0.05,
  backdropSelector,
  ...glassProps
}: {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: string;
  scaleX?: number;
  scaleY?: number;
} & Omit<GlassProps, "width" | "height" | "borderRadius" | "children">) {
  const hitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const { active, engage, release } = useMorphActive();

  const progress = max > min ? (value - min) / (max - min) : 0;
  const prog = useMotionValue(progress);
  useEffect(() => {
    if (!dragging.current) prog.set(progress);
  }, [progress, prog]);

  const press = useMotionValue(0);
  useEffect(() => {
    const controls = animate(press, active ? 1 : 0, {
      type: "spring",
      stiffness: 600,
      damping: 28,
    });
    return controls.stop;
  }, [active, press]);

  const velocity = useVelocity(prog);
  const velMag = useSpring(useTransform(velocity, (v) => Math.abs(v)), {
    stiffness: 500,
    damping: 22,
    mass: 0.4,
  });

  const thumbX = useTransform(prog, (p) =>
    clamp(p * TRACK_W, THUMB / 2, TRACK_W - THUMB / 2) - THUMB / 2,
  );
  const fillWidth = useTransform(prog, (p) => p * TRACK_W);
  const grow = useTransform(press, (p) => 1 + 0.45 * p);
  const stretch = useTransform(velMag, (m) => clamp(m * 0.05, 0, 0.18));
  const scaleX = useTransform([grow, stretch] as const, ([g, s]: number[]) => g * (1 + s));
  const scaleY = useTransform([grow, stretch] as const, ([g, s]: number[]) => g * (1 - s * 0.4));
  const skinOpacity = useTransform(press, (p) => 1 - p);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = hitRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      prog.set(ratio);
      const raw = min + ratio * (max - min);
      const stepped = step > 0 ? Math.round(raw / step) * step : raw;
      onChange(clamp(stepped, min, max));
    },
    [max, min, onChange, prog, step],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragging.current = true;
      engage();
      setFromClientX(event.clientX);
      const move = (e: PointerEvent) => setFromClientX(e.clientX);
      const up = () => {
        dragging.current = false;
        release();
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [engage, release, setFromClientX],
  );

  return (
    <div className="gk-slider" data-no-drag>
      {label !== undefined && (
        <div className="gk-slider__head">
          <span>{label}</span>
          <span className="gk-slider__val">{display ?? value}</span>
        </div>
      )}
      <div
        ref={hitRef}
        className="gk-slider__hit"
        style={{ width: TRACK_W, height: HIT_H }}
        onPointerDown={onPointerDown}
      >
        <div className="gk-slider__rail" />
        <motion.div className="gk-slider__fill" style={{ width: fillWidth }} />
        <motion.div
          className="gk-slider__thumb"
          style={{ width: THUMB, height: THUMB, x: thumbX, scaleX, scaleY }}
        >
          <Glass
            width={THUMB}
            height={THUMB}
            borderRadius={THUMB / 2}
            blurAmount={blurAmount}
            depth={depth}
            chromaAmount={chromaAmount}
            specularStrength={specularStrength}
            tintOpacity={tintOpacity}
            backdropSelector={backdropSelector}
            forceClone={true}
            {...glassProps}
          />
          <motion.div className="gk-slider__thumbskin" style={{ opacity: skinOpacity }} />
        </motion.div>
      </div>
    </div>
  );
}
