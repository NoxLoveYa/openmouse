import { useCallback, useLayoutEffect, useRef, useState } from "react";

export interface SlidingFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

const HIDDEN: SlidingFrame = { x: 0, y: 0, w: 0, h: 0, visible: false };

/**
 * Tracks the `.active` child inside a nav container and returns a frame for
 * an absolutely-positioned pill that glides behind it. Layout-based
 * (offsetLeft/offsetTop) so horizontal scroll never desyncs the pill.
 * Re-run by changing `dep` (selected page/tab); ResizeObserver covers
 * collapse, resize, and font swaps. Starts invisible to avoid a first-frame
 * jump from the corner.
 *
 * Exposes a callback ref (assignable to any host element's `ref`) instead
 * of a ref object to satisfy React 19's ref variance.
 */
export function useSlidingPill(dep: unknown): {
  setContainerRef: (node: HTMLElement | null) => void;
  frame: SlidingFrame;
} {
  const containerRef = useRef<HTMLElement | null>(null);
  const [frame, setFrame] = useState<SlidingFrame>(HIDDEN);

  const setContainerRef = useCallback((node: HTMLElement | null): void => {
    containerRef.current = node;
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = (): void => {
      const active = container.querySelector(".active") as HTMLElement | null;
      if (!active) {
        setFrame(HIDDEN);
        return;
      }
      setFrame({
        x: active.offsetLeft,
        y: active.offsetTop,
        w: active.offsetWidth,
        h: active.offsetHeight,
        visible: true,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (typeof document !== "undefined" && "fonts" in document) {
      try {
        (document as Document).fonts.ready.then(() => measure()).catch(() => {});
      } catch {
        /* fonts API unavailable — ResizeObserver already covers us */
      }
    }
    return () => observer.disconnect();
  }, [dep]);

  return { setContainerRef, frame };
}
