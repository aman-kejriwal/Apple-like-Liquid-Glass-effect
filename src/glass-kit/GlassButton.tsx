import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Glass, type GlassProps } from "./Glass";
import { useMorphActive } from "./useMorphActive";

/**
 * Solid frosted pill at rest; morphs into clear glass while pressed. Picks up
 * the shared `blurAmount` so it stays in step with the rest of the scene (only
 * visible once it morphs to glass on press).
 */
export function GlassButton({
  children,
  onClick,
  width = 128,
  height = 50,
  blurAmount = 0,
  depth = 7,
  chromaAmount = 0.8,
  specularStrength = 1.5,
  tintOpacity = 0.05,
  scaleX = 0.25,
  scaleY = 0.25,
  backdropSelector,
  className,
  ...glassProps
}: {
  children: ReactNode;
  onClick?: () => void;
  width?: number;
  height?: number;
  className?: string;
} & Omit<GlassProps, "width" | "height" | "borderRadius" | "children">) {
  const { active, engage, release } = useMorphActive();
  const radius = height / 2;

  return (
    <motion.div
      className={`gk-button ${className ?? ""}`}
      style={{ width, height, borderRadius: radius }}
      animate={{ scale: active ? 0.965 : 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 24 }}
    >
      <Glass
        width={width}
        height={height}
        borderRadius={radius}
        blurAmount={blurAmount}
        depth={depth}
        chromaAmount={chromaAmount}
        specularStrength={specularStrength}
        tintOpacity={tintOpacity}
        scaleX={scaleX}
        scaleY={scaleY}
        backdropSelector={backdropSelector}
        {...glassProps}
      />
      <motion.div
        className="gk-button__skin"
        style={{ borderRadius: radius }}
        animate={{ opacity: active ? 0 : 1 }}
        transition={{ duration: 0.18 }}
      />
      <button
        type="button"
        data-no-drag
        className="gk-button__hit"
        onPointerDown={engage}
        onPointerUp={release}
        onPointerLeave={release}
        onClick={onClick}
      >
        {children}
      </button>
    </motion.div>
  );
}
