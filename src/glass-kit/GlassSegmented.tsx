import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { Glass, type GlassProps } from "./Glass";

const TAB_W = 96;
const TAB_H = 44;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const SPRING = { type: "spring", stiffness: 480, damping: 30, mass: 0.7 } as const;

/**
 * Segmented control. The selection is the same refracting Glass used elsewhere
 * (the container is transparent — a coloured track would make the lens refract
 * flat colour instead of the real backdrop). The selector springs between tabs
 * (never teleports) and can be grabbed and dragged across them like a slider,
 * snapping to the nearest on release.
 */
export function GlassSegmented({
  tabs,
  value,
  onChange,
  blurAmount = 0,
  depth = 10,
  chromaAmount = 0.85,
  specularStrength = 1.5,
  tintOpacity = 0.2,
  backdropSelector,
  ...glassProps
}: {
  tabs: string[];
  value?: number;
  onChange?: (index: number) => void;
} & Omit<GlassProps, "width" | "height" | "borderRadius" | "children">) {
  const [internal, setInternal] = useState(0);
  const active = value ?? internal;
  const barRef = useRef<HTMLDivElement>(null);
  const maxX = (tabs.length - 1) * TAB_W;

  const x = useMotionValue(active * TAB_W);
  useEffect(() => {
    animate(x, active * TAB_W, SPRING);
  }, [active, x]);

  const velocity = useVelocity(x);
  const stretch = useSpring(
    useTransform(velocity, (v) => clamp(Math.abs(v) / 1500, 0, 0.4)),
    { stiffness: 480, damping: 22, mass: 0.4 },
  );
  const scaleX = useTransform(stretch, (s) => 1 + s);
  const scaleY = useTransform(stretch, (s) => 1 - s * 0.4);

  const commit = useCallback(
    (i: number) => {
      if (value === undefined) setInternal(i);
      onChange?.(i);
    },
    [onChange, value],
  );

  const onSelectorDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const move = (e: PointerEvent) => {
        const rect = barRef.current?.getBoundingClientRect();
        if (!rect) return;
        x.set(clamp(e.clientX - rect.left - TAB_W / 2, 0, maxX));
      };
      const up = () => {
        const i = clamp(Math.round(x.get() / TAB_W), 0, tabs.length - 1);
        animate(x, i * TAB_W, SPRING);
        commit(i);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [commit, maxX, tabs.length, x],
  );

  return (
    <div ref={barRef} className="gk-seg" style={{ width: TAB_W * tabs.length, height: TAB_H }}>
      <motion.div
        className="gk-seg__sel"
        data-no-drag
        style={{ x, width: TAB_W, height: TAB_H, scaleX, scaleY }}
        onPointerDown={onSelectorDown}
      >
        <Glass
          width={TAB_W}
          height={TAB_H}
          borderRadius={TAB_H / 2}
          blurAmount={blurAmount}
          depth={depth}
          chromaAmount={chromaAmount}
          specularStrength={specularStrength}
          tintOpacity={tintOpacity}
          backdropSelector={backdropSelector}
          forceClone={true}
          {...glassProps}
        />
      </motion.div>
      {tabs.map((tab, i) => (
        <button
          key={tab}
          type="button"
          className={`gk-seg__tab ${i === active ? "is-active" : ""}`}
          style={{ width: TAB_W, height: TAB_H }}
          onClick={() => commit(i)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
