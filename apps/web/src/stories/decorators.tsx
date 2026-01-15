import type { ReactNode } from "react";
import "~/styles.css";

interface DecoratorProps {
  children: ReactNode;
}

/**
 * Wraps chart components with proper sizing container
 */
export function ChartDecorator({ children }: DecoratorProps) {
  return (
    <div className="bg-background h-[600px] w-full rounded-lg border p-4">
      {children}
    </div>
  );
}

/**
 * Provides theme context (light/dark mode support)
 */
export function ThemeDecorator({ children }: DecoratorProps) {
  return (
    <div className="bg-background text-foreground min-h-screen p-4">
      {children}
    </div>
  );
}

/**
 * Combined decorator for chart stories
 */
export function StoryDecorator({ children }: DecoratorProps) {
  return (
    <ThemeDecorator>
      <ChartDecorator>{children}</ChartDecorator>
    </ThemeDecorator>
  );
}
