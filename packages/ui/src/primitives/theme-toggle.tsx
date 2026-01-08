"use client";

import * as React from "react";
import { cn } from "../lib/utils";

interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md";
}

const ThemeToggle = React.forwardRef<HTMLButtonElement, ThemeToggleProps>(
  ({ className, size = "md", ...props }, ref) => {
    const [theme, setTheme] = React.useState<"light" | "dark">("light");
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }, []);

    const toggleTheme = React.useCallback(() => {
      const newTheme = theme === "light" ? "dark" : "light";
      setTheme(newTheme);

      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    }, [theme]);

    const sizeClasses = size === "sm" ? "h-8 w-8" : "h-10 w-10";
    const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

    // Prevent hydration mismatch
    if (!mounted) {
      return (
        <button
          ref={ref}
          className={cn(
            "inline-flex items-center justify-center rounded-md",
            "border-2 border-border bg-background",
            "transition-all duration-200 ease-out",
            "hover:bg-accent hover:border-primary/30",
            sizeClasses,
            className
          )}
          {...props}
        >
          <span className={cn("opacity-0", iconSize)} />
        </button>
      );
    }

    return (
      <button
        ref={ref}
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        className={cn(
          "inline-flex items-center justify-center rounded-md",
          "border-2 border-border bg-background",
          "transition-all duration-200 ease-out",
          "hover:bg-accent hover:border-primary/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          sizeClasses,
          className
        )}
        {...props}
      >
        {theme === "light" ? (
          // Moon icon for dark mode
          <svg
            className={cn(iconSize, "text-foreground")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        ) : (
          // Sun icon for light mode
          <svg
            className={cn(iconSize, "text-foreground")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        )}
      </button>
    );
  }
);
ThemeToggle.displayName = "ThemeToggle";

export { ThemeToggle };
