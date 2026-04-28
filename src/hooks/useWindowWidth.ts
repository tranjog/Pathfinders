import { useState, useEffect } from 'react';

/**
 * Tracks `window.innerWidth` and re-renders on resize. Used to drive
 * stacked-vs-side-by-side layout decisions.
 */
export function useWindowWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}
