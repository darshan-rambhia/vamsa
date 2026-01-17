"use client";

import { useState } from "react";
import { cn } from "@vamsa/ui";

interface AvatarImageProps {
  mediaId?: string | null;
  alt: string;
  fallbackInitials?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  thumbnailPath?: string | null;
  webpPath?: string | null;
  filePath?: string | null;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export function AvatarImage({
  mediaId: _mediaId,
  alt,
  fallbackInitials,
  size = "md",
  className,
  thumbnailPath,
  webpPath,
  filePath,
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine the best image source to use
  const imageSrc = thumbnailPath
    ? `/${thumbnailPath}`
    : webpPath
      ? `/${webpPath}`
      : filePath || null;

  // Calculate initials from alt text if not provided
  const initials =
    fallbackInitials ||
    alt
      .split(" ")
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "?";

  const showImage = imageSrc && !hasError;

  return (
    <div
      className={cn(
        // Base styles
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        // Background for fallback
        "bg-primary/10 text-primary font-display font-medium",
        // Border
        "ring-border ring-offset-background ring-2 ring-offset-2",
        // Size
        sizeClasses[size],
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300",
            !isLoaded && "opacity-0",
            isLoaded && "opacity-100"
          )}
        />
      ) : (
        <span className="select-none">{initials}</span>
      )}
    </div>
  );
}
