import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Glass, type GlassProps } from "./Glass";

const WIDTH = 216;
const TRIGGER_H = 54;
const ROW_H = 46;

export type MenuItem = { label: string; onSelect?: () => void };

/**
 * Apple-style liquid morph: the glass trigger doesn't just reveal a menu, it
 * springs *open* into one. A single glass surface grows from the trigger height
 * to the full panel with an over-damped spring (the liquid overshoot), the
 * corner radius relaxes, and the options stagger up into place.
 */
export function GlassMenu({
  label,
  items,
  blurAmount = 0,
  depth = 9,
  chromaAmount = 0.85,
  specularStrength = 1.4,
  tintOpacity = 0.06,
  scaleX = 0.15,
  scaleY = 0.15,
  backdropSelector,
  ...glassProps
}: {
  label: string;
  items: (MenuItem | string)[];
} & Omit<GlassProps, "width" | "height" | "borderRadius" | "children">) {
  const [open, setOpen] = useState(false);
  const norm = items.map((it) => (typeof it === "string" ? { label: it } : it));
  const openH = TRIGGER_H + norm.length * ROW_H + 8;

  return (
    <div className="gk-menu-root" data-no-drag>
      {open && <div className="gk-menu-scrim" onClick={() => setOpen(false)} />}
      <motion.div
        className="gk-menu"
        style={{ width: WIDTH }}
        animate={{ height: open ? openH : TRIGGER_H, borderRadius: open ? 24 : TRIGGER_H / 2 }}
        transition={{ type: "spring", stiffness: 320, damping: 19, mass: 0.9 }}
      >
        <Glass
          width={WIDTH}
          height={openH}
          borderRadius={24}
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
        <button
          type="button"
          className="gk-menu__trigger"
          style={{ height: TRIGGER_H }}
          onClick={() => setOpen((o) => !o)}
        >
          <span>{label}</span>
          <motion.span
            className="gk-menu__chev"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            ▾
          </motion.span>
        </button>
        <AnimatePresence>
          {open && (
            <div className="gk-menu__list">
              {norm.map((item, i) => (
                <motion.button
                  key={item.label}
                  type="button"
                  className="gk-menu__item"
                  style={{ height: ROW_H }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ delay: open ? 0.06 + i * 0.05 : 0, type: "spring", stiffness: 420, damping: 26 }}
                  onClick={() => {
                    item.onSelect?.();
                    setOpen(false);
                  }}
                >
                  {item.label}
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
