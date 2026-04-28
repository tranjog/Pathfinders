import { useState, useRef, useEffect, useCallback } from 'react';

interface UseResizableLayoutResult {
  mainRef: React.RefObject<HTMLDivElement | null>;
  sideWidth: number;
  mapHeight: number;
  startDrag: () => void;
}

/**
 * Drag-to-resize between the map pane and the side panel.
 *
 * - Side-by-side layout: drag adjusts `sideWidth` (right-hand panel width).
 * - Stacked layout: drag adjusts `mapHeight` (top-pane height).
 *
 * The caller decides which mode is active via `isStacked`.
 */
export function useResizableLayout(isStacked: boolean): UseResizableLayoutResult {
  const [sideWidth, setSideWidth] = useState(() => Math.round(window.innerWidth * 0.35));
  const [mapHeight, setMapHeight] = useState(() => Math.round((window.innerHeight - 48) * 0.5));
  const dragging = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      if (isStacked) {
        const newMapHeight = e.clientY - rect.top;
        setMapHeight(Math.max(200, Math.min(newMapHeight, rect.height - 200)));
      } else {
        const newSideWidth = rect.right - e.clientX;
        setSideWidth(Math.max(280, Math.min(newSideWidth, rect.width - 300)));
      }
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isStacked]);

  const startDrag = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = isStacked ? 'row-resize' : 'col-resize';
  }, [isStacked]);

  return { mainRef, sideWidth, mapHeight, startDrag };
}
