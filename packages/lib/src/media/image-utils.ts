/**
 * Image Utilities
 *
 * Pure functions for image source selection, srcSet building,
 * and initials calculation. These are extracted from React components
 * to enable unit testing without React dependencies.
 *
 * Exported Functions:
 * - buildSrcSet: Build srcSet string from thumbnail paths
 * - selectImageSource: Select best available image source
 * - selectAvatarSource: Select avatar image with fallback chain
 * - calculateInitials: Calculate display initials from name
 */

/**
 * Build a srcSet string from available thumbnail paths
 *
 * Creates a responsive image srcSet attribute value from multiple
 * resolution thumbnail paths.
 *
 * @param thumb400Path - Path to 400w thumbnail
 * @param thumb800Path - Path to 800w thumbnail
 * @param thumb1200Path - Path to 1200w thumbnail
 * @returns Comma-separated srcSet string, or empty string if no thumbnails
 *
 * @example
 * const srcSet = buildSrcSet("media/thumb400.webp", "media/thumb800.webp", null);
 * // Returns: "/media/thumb400.webp 400w, /media/thumb800.webp 800w"
 */
export function buildSrcSet(
  thumb400Path?: string | null,
  thumb800Path?: string | null,
  thumb1200Path?: string | null
): string {
  const sources: string[] = [];
  if (thumb400Path) sources.push(`/${thumb400Path} 400w`);
  if (thumb800Path) sources.push(`/${thumb800Path} 800w`);
  if (thumb1200Path) sources.push(`/${thumb1200Path} 1200w`);
  return sources.join(", ");
}

/**
 * Select the best available image source for display
 *
 * Prefers WebP format when available, falls back to original file path.
 *
 * @param webpPath - Path to WebP version of image
 * @param filePath - Path to original image file
 * @returns Selected image path with leading slash, or empty string
 *
 * @example
 * const src = selectImageSource("media/photo.webp", "media/photo.jpg");
 * // Returns: "/media/photo.webp"
 */
export function selectImageSource(
  webpPath?: string | null,
  filePath?: string
): string {
  if (webpPath) return `/${webpPath}`;
  return filePath || "";
}

/**
 * Select the best avatar image source with fallback chain
 *
 * Priority order:
 * 1. Thumbnail (small, optimized for avatars)
 * 2. WebP version
 * 3. Original file
 *
 * @param thumbnailPath - Path to thumbnail version
 * @param webpPath - Path to WebP version
 * @param filePath - Path to original file
 * @returns Selected image path with leading slash, or null if none available
 *
 * @example
 * const src = selectAvatarSource("media/thumb.webp", "media/full.webp", null);
 * // Returns: "/media/thumb.webp"
 */
export function selectAvatarSource(
  thumbnailPath?: string | null,
  webpPath?: string | null,
  filePath?: string | null
): string | null {
  if (thumbnailPath) return `/${thumbnailPath}`;
  if (webpPath) return `/${webpPath}`;
  return filePath || null;
}

/**
 * Calculate display initials from a name string
 *
 * Extracts the first letter of each word (up to 2 letters) and
 * converts to uppercase. Falls back to provided initials or "?".
 *
 * @param name - Full name to extract initials from
 * @param fallbackInitials - Optional pre-calculated initials to use
 * @returns 1-2 character uppercase initials string
 *
 * @example
 * calculateInitials("John Doe", undefined);     // "JD"
 * calculateInitials("Jane", undefined);          // "J"
 * calculateInitials("John Doe", "X");           // "X"
 * calculateInitials("", undefined);             // "?"
 */
export function calculateInitials(
  name: string,
  fallbackInitials?: string
): string {
  if (fallbackInitials) return fallbackInitials;

  const initials = name
    .split(" ")
    .filter((word) => word.length > 0) // Filter out empty strings from extra spaces
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || "?";
}
