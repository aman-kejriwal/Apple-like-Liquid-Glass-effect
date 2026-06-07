import { useCallback, useRef, useState, type ReactNode } from "react";

export type Point = { x: number; y: number };

/**
 * Pointer-drag hook. Returns the live position, a drag flag, and an
 * `onPointerDown` to spread on the handle. It does NOT preventDefault on
 * pointer-down (that would swallow clicks on child buttons/sliders) — it only
 * starts moving past a small threshold, so taps still register as clicks.
 * Mark child controls with `data-no-drag` to exclude them from the handle.
 */
export function useDraggable(initial: Point) {
  const [pos, setPos] = useState<Point>(initial);
  const [dragging, setDragging] = useState(false);
  const origin = useRef<Point>({ x: 0, y: 0 });
  const start = useRef<Point>(initial);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-no-drag]")) return;

      origin.current = { x: event.clientX, y: event.clientY };
      start.current = pos;
      let moved = false;

      const move = (e: PointerEvent) => {
        const dx = e.clientX - origin.current.x;
        const dy = e.clientY - origin.current.y;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        if (!moved) {
          moved = true;
          setDragging(true);
        }
        e.preventDefault();
        setPos({ x: start.current.x + dx, y: start.current.y + dy });
      };
      const up = () => {
        setDragging(false);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [pos],
  );

  return { pos, dragging, onPointerDown };
}

/**
 * Convenience wrapper: absolutely-positions its children at a draggable point.
 * The whole surface is a drag handle except elements marked `data-no-drag`.
 */
export function Draggable({
  initial,
  z,
  className,
  children,
}: {
  initial: Point;
  z?: number;
  className?: string;
  children: ReactNode;
}) {
  const { pos, dragging, onPointerDown } = useDraggable(initial);
  return (
    <div
      className={`gk-draggable ${dragging ? "is-dragging" : ""} ${className ?? ""}`}
      style={{ left: pos.x, top: pos.y, zIndex: dragging ? 999 : z }}
      onPointerDown={onPointerDown}
    >
      {children}
    </div>
  );
}
