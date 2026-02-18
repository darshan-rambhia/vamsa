"use client";

import { useState } from "react";
import { cn } from "@vamsa/ui";
import { ImagePlaceholder } from "./image-placeholder";

interface ResponsiveImageProps {
  mediaId: string;
  alt: string;
  className?: string;
  priority?: boolean;
  webpPath?: string | null;
  thumb400Path?: string | null;
  thumb800Path?: string | null;
  thumb1200Path?: string | null;
  filePath?: string;
  sizes?: string;
}

export function ResponsiveImage({
  mediaId: _mediaId,
  alt,
  className,
  priority = false,
  webpPath,
  thumb400Path,
  thumb800Path,
  thumb1200Path,
  filePath,
  sizes = "(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px",
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Build srcSet from available responsive sizes
  const buildSrcSet = () => {
    const sources: Array<string> = [];
    if (thumb400Path) sources.push(`/${thumb400Path} 400w`);
    if (thumb800Path) sources.push(`/${thumb800Path} 800w`);
    if (thumb1200Path) sources.push(`/${thumb1200Path} 1200w`);
    return sources.join(", ");
  };

  const srcSet = buildSrcSet();

  // Fallback image source
  const fallbackSrc = webpPath ? `/${webpPath}` : filePath || "";

  // If we have an error, show placeholder
  if (hasError) {
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground/50 flex items-center justify-center",
          className
        )}
      >
        <ImagePlaceholder variant="landscape" className="h-16 w-16" />
      </div>
    );
  }

  // If we have responsive sizes, use picture element with srcset
  if (srcSet) {
    return (
      <picture>
        <source srcSet={srcSet} sizes={sizes} type="image/webp" />
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <img
          src={fallbackSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300",
            !isLoaded && "opacity-0",
            isLoaded && "opacity-100",
            className
          )}
        />
      </picture>
    );
  }

  // Fallback to simple img tag
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <img
      src={fallbackSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onLoad={() => setIsLoaded(true)}
      onError={() => setHasError(true)}
      className={cn(
        "h-full w-full object-cover transition-opacity duration-300",
        !isLoaded && "opacity-0",
        isLoaded && "opacity-100",
        className
      )}
    />
  );
}
