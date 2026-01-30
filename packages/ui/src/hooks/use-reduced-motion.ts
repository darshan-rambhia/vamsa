import { useEffect, useState } from "react";

/**
 * Hook to detect user's reduced motion preference
 *
 * Returns true if the user prefers reduced motion (e.g., vestibular disorders,
 * motion sensitivity). Use this to conditionally disable animations in JS.
 *
 * CSS already handles this via the media query in styles.css, but this hook
 * is useful for:
 * - JS-based animations (React Spring, Framer Motion)
 * - Conditional rendering of animated vs static content
 * - Third-party animation libraries
 *
 * @example
 * const prefersReducedMotion = useReducedMotion();
 * return (
 *   <motion.div
 *     animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
 *   />
 * );
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes (user can toggle this in system settings)
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Check if reduced motion is preferred (non-reactive)
 *
 * Use this for one-time checks, like in event handlers.
 * For reactive updates, use the useReducedMotion hook instead.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
