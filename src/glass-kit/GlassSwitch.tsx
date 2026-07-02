import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Glass, type GlassProps } from "./Glass";
import { useMorphActive } from "./useMorphActive";

const W = 64;
const H = 36;
const PAD = 4;
const KNOB = H - PAD * 2;
const TRAVEL = W - PAD * 2 - KNOB;

/**
 * Switch whose knob is a solid disc at rest and morphs into a clear glass lens
 * while you press/flip it. The knob squashes along travel as it springs across.
 */
export function GlassSwitch({
  checked,
  onChange,
  blurAmount = 0,
  depth = 5,
  chromaAmount = 0.9,
  specularStrength = 1.7,
  tintOpacity = 0.04,
  scaleX = 0.75,
  scaleY = 0.75,
  backdropSelector,
  ...glassProps
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
} & Omit<GlassProps, "width" | "height" | "borderRadius" | "children">) {
  const { active, engage, release } = useMorphActive(320);

  const x = useMotionValue(checked ? TRAVEL : 0);
  useEffect(() => {
    animate(x, checked ? TRAVEL : 0, {
      type: "spring",
      stiffness: 600,
      damping: 22,
      mass: 0.5,
    });
  }, [checked, x]);

  const sampleX = useTransform(x, (val) => -val);

  return (
    <button
      type="button"
      data-no-drag
      role="switch"
      aria-checked={checked}
      className={`gk-switch ${checked ? "is-on" : ""}`}
      style={{ width: W, height: H, borderRadius: H / 2 }}
      onPointerDown={engage}
      onPointerUp={release}
      onPointerLeave={release}
      onClick={() => onChange(!checked)}
    >
      <span className="gk-switch__track" />
      <motion.span
        className="gk-switch__knob"
        style={{ width: KNOB, height: KNOB, borderRadius: KNOB / 2, x }}
        animate={{
          scaleX: active ? 1.18 : 1,
          scaleY: active ? 0.9 : 1,
        }}
        transition={{ type: "spring", stiffness: 600, damping: 22, mass: 0.5 }}
      >
        <Glass
          {...glassProps}
          width={KNOB}
          height={KNOB}
          borderRadius={KNOB / 2}
          blurAmount={blurAmount}
          depth={depth}
          chromaAmount={chromaAmount}
          specularStrength={specularStrength}
          tintOpacity={tintOpacity}
          scaleX={scaleX}
          scaleY={scaleY}
          backdropSelector={backdropSelector}
          sample={
            <motion.div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: W,
                height: KNOB,
                x: sampleX,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: -PAD,
                  width: W,
                  height: H,
                  borderRadius: H / 2,
                  background: checked ? "rgba(var(--gk-accent) / 0.85)" : "rgba(120, 130, 150, 0.4)",
                  transition: "background 0.25s ease",
                }}
              />
            </motion.div>
          }
          sampleWidth={W}
          sampleHeight={KNOB}
        />
        <motion.span
          className="gk-switch__skin"
          style={{ borderRadius: "inherit" }}
          animate={{ opacity: active ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        />
      </motion.span>
    </button>
  );
}
