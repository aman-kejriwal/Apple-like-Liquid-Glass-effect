/**
 * glass-kit — a small React kit for Apple-style "liquid glass" UI that
 * refracts the real content behind it. Importing this module also pulls in the
 * kit's stylesheet.
 */
import "./kit.css";

export { Glass } from "./Glass";
export type { GlassProps } from "./Glass";

export { GlassPanel } from "./GlassPanel";
export { GlassButton } from "./GlassButton";
export { GlassSlider } from "./GlassSlider";
export { GlassSwitch } from "./GlassSwitch";
export { GlassSegmented } from "./GlassSegmented";
export { GlassMenu } from "./GlassMenu";
export type { MenuItem } from "./GlassMenu";

export { Draggable, useDraggable } from "./Draggable";
export type { Point } from "./Draggable";
export { useMorphActive } from "./useMorphActive";

export {
  generateDisplacementMap,
  getDisplacementMap,
  generateHighlightOverlay,
  getHighlightOverlay,
  resolveMapSize,
  erf,
  computeDomeConstants,
  domeGradient,
  mapScaleMatrix,
} from "./displacement";
export type { DisplacementMapOptions } from "./displacement";

export { supportsBackdropDisplacement } from "./support";
