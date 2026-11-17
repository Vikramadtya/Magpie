import { useRef, useState, type PointerEvent } from 'react';

/** Horizontal swipe on touch screens: drag past the threshold and let go to trigger. Mouse and pen are ignored. */
export function useSwipe({ onLeft, onRight, threshold = 96, enabled = true }: { onLeft?: () => void; onRight?: () => void; threshold?: number; enabled?: boolean }) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; locked: boolean } | null>(null);

  const reset = () => { start.current = null; setDx(0); };
  return {
    dx,
    threshold,
    bind: {
      style: { touchAction: 'pan-y' as const, transform: dx ? `translateX(${dx}px)` : undefined, transition: start.current ? 'none' : 'transform 160ms ease-out' },
      onPointerDown: (e: PointerEvent) => {
        if (!enabled || e.pointerType !== 'touch') return;
        // Taps on controls (selects, buttons) are not swipes.
        if ((e.target as HTMLElement).closest('select,input,button,a,textarea')) return;
        start.current = { x: e.clientX, y: e.clientY, locked: false };
      },
      onPointerMove: (e: PointerEvent) => {
        const s = start.current;
        if (!s) return;
        const mx = e.clientX - s.x;
        if (!s.locked && Math.abs(e.clientY - s.y) > Math.abs(mx) && Math.abs(e.clientY - s.y) > 8) return reset();
        s.locked = true;
        setDx(Math.max(-160, Math.min(160, mx)));
      },
      onPointerUp: () => {
        const d = dx;
        reset();
        if (d >= threshold) onRight?.();
        else if (d <= -threshold) onLeft?.();
      },
      onPointerCancel: reset,
    },
  };
}
