import { type ReactNode } from "react";
import { Glass, type GlassProps } from "./Glass";

/**
 * A glass card: the base lens with comfortable content padding. Use it as a
 * container for your own UI; pass any Glass prop through to tune the lens.
 */
export function GlassPanel({
  children,
  padding = 20,
  ...glass
}: Omit<GlassProps, "children"> & { children?: ReactNode; padding?: number }) {
  return (
    <Glass {...glass} className={`gk-panel ${glass.className ?? ""}`}>
      <div className="gk-panel__body" style={{ padding }}>
        {children}
      </div>
    </Glass>
  );
}
