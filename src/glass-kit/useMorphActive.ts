import { useCallback, useRef, useState } from "react";

/**
 * The interaction principle of the kit: a control is solid / frosted at rest
 * and morphs into clear glass *while you interact with it*, settling back
 * shortly after release. `active` drives that crossfade; spread `engage` on
 * pointer-down and `release` on pointer-up/leave.
 */
export function useMorphActive(holdMs = 260) {
  const [active, setActive] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const engage = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    setActive(true);
  }, []);

  const release = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(false), holdMs);
  }, [holdMs]);

  return { active, engage, release };
}
