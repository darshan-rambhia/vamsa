import { cn } from "@vamsa/ui";

interface ImagePlaceholderProps {
  variant?: "landscape" | "portrait";
  className?: string;
}

/**
 * Design-system-aligned SVG placeholder for missing or broken images.
 * Uses earth-tone palette via CSS variables.
 */
export function ImagePlaceholder({
  variant = "landscape",
  className,
}: ImagePlaceholderProps) {
  if (variant === "portrait") {
    return (
      <svg
        className={cn("text-muted-foreground/40", className)}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Head */}
        <circle
          cx="32"
          cy="22"
          r="10"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        {/* Shoulders */}
        <path
          d="M14 54c0-9.941 8.059-18 18-18s18 8.059 18 18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Landscape variant — stylized mountain/sun scene
  return (
    <svg
      className={cn("text-muted-foreground/40", className)}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sun */}
      <circle cx="48" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" />
      {/* Mountains */}
      <path
        d="M4 52l16-24 10 14 8-10 22 20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Frame */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
