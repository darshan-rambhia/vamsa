"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@vamsa/ui";

/**
 * Easing function for smooth count-up animation
 * Quadratic ease-out: fast start, slow end
 */
function easeOutQuad(t: number): number {
  return t * (2 - t);
}

interface AnimatedNumberProps {
  /**
   * Target number to animate to
   */
  value: number;
  /**
   * Animation duration in milliseconds
   * @default 500
   */
  duration?: number;
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Animated count-up effect for numbers
 *
 * Respects user's reduced motion preference - if enabled,
 * shows the final value immediately without animation.
 *
 * @example
 * ```tsx
 * <AnimatedNumber value={156} />
 * <AnimatedNumber value={42} duration={800} />
 * ```
 */
export function AnimatedNumber({
  value,
  duration = 500,
  className,
}: AnimatedNumberProps) {
  const [displayedValue, setDisplayedValue] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // If user prefers reduced motion or already animated, show value immediately
    if (prefersReducedMotion || hasAnimatedRef.current) {
      setDisplayedValue(value);
      return;
    }

    // Mark as animated to prevent re-animation on subsequent renders
    hasAnimatedRef.current = true;

    const startTime = performance.now();
    const startValue = 0;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Apply easing function for smooth animation
      const easedProgress = easeOutQuad(progress);
      const currentValue = Math.floor(
        startValue + (value - startValue) * easedProgress
      );

      setDisplayedValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [value, duration, prefersReducedMotion]);

  return <span className={className}>{displayedValue.toLocaleString()}</span>;
}
