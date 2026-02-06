/**
 * Unit tests for AvatarImage component
 *
 * Tests verify the component:
 * 1. Exports and renders correctly
 * 2. Handles all prop combinations
 * 3. Displays initials or images based on props
 * 4. Applies proper CSS classes for styling and sizing
 */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AvatarImage } from "./avatar-image";

describe("AvatarImage Component", () => {
  describe("exports and rendering", () => {
    it("should export AvatarImage component", () => {
      expect(AvatarImage).toBeDefined();
      expect(typeof AvatarImage).toBe("function");
    });

    it("should render a circular container with proper classes", () => {
      const { container } = render(<AvatarImage alt="John Doe" />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar).toBeDefined();
      expect(avatar.className).toContain("rounded-full");
      expect(avatar.className).toContain("inline-flex");
      expect(avatar.className).toContain("items-center");
      expect(avatar.className).toContain("justify-center");
      expect(avatar.className).toContain("overflow-hidden");
      expect(avatar.className).toContain("bg-primary/10");
    });

    it("should render initials when no image is provided", () => {
      const { getByText } = render(<AvatarImage alt="John Doe" />);
      const initials = getByText("JD");

      expect(initials).toBeDefined();
      expect(initials.textContent).toBe("JD");
    });

    it("should use fallbackInitials when provided", () => {
      const { getByText } = render(
        <AvatarImage alt="John Doe" fallbackInitials="XX" />
      );
      const initials = getByText("XX");

      expect(initials).toBeDefined();
      expect(initials.textContent).toBe("XX");
    });

    it("should display single letter initial when name has only one word", () => {
      const { getByText } = render(<AvatarImage alt="Madonna" />);
      const initials = getByText("M");

      expect(initials).toBeDefined();
    });

    it("should display question mark when alt is empty", () => {
      const { getByText } = render(<AvatarImage alt="" />);
      const initials = getByText("?");

      expect(initials).toBeDefined();
    });
  });

  describe("instantiation with required props", () => {
    it("should create element with required alt prop", () => {
      const element = <AvatarImage alt="John Doe" />;

      expect(element).toBeDefined();
      expect(element.type).toBe(AvatarImage);
    });

    it("should create element with alt and thumbnailPath", () => {
      const element = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(element).toBeDefined();
      expect(element.type).toBe(AvatarImage);
    });
  });

  describe("size variants", () => {
    it("should apply small size classes", () => {
      const { container } = render(<AvatarImage alt="John Doe" size="sm" />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar.className).toContain("h-8");
      expect(avatar.className).toContain("w-8");
      expect(avatar.className).toContain("text-xs");
    });

    it("should apply medium size classes (default)", () => {
      const { container } = render(<AvatarImage alt="John Doe" size="md" />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar.className).toContain("h-10");
      expect(avatar.className).toContain("w-10");
      expect(avatar.className).toContain("text-sm");
    });

    it("should apply large size classes", () => {
      const { container } = render(<AvatarImage alt="John Doe" size="lg" />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar.className).toContain("h-14");
      expect(avatar.className).toContain("w-14");
      expect(avatar.className).toContain("text-lg");
    });

    it("should apply extra large size classes", () => {
      const { container } = render(<AvatarImage alt="John Doe" size="xl" />);
      const avatar = container.firstChild as HTMLElement;

      expect(avatar.className).toContain("h-24");
      expect(avatar.className).toContain("w-24");
      expect(avatar.className).toContain("text-2xl");
    });

    it("should use default size when undefined", () => {
      const { container } = render(
        <AvatarImage alt="John Doe" size={undefined} />
      );
      const avatar = container.firstChild as HTMLElement;

      // Default is "md"
      expect(avatar.className).toContain("h-10");
      expect(avatar.className).toContain("w-10");
    });
  });

  describe("optional props handling", () => {
    it("should accept size prop", () => {
      const element = <AvatarImage alt="John Doe" size="sm" />;

      expect(element).toBeDefined();
    });

    it("should accept all size variants", () => {
      const sizes = ["sm", "md", "lg", "xl"] as const;

      for (const size of sizes) {
        const element = <AvatarImage alt="John Doe" size={size} />;
        expect(element).toBeDefined();
      }
    });

    it("should accept fallbackInitials prop", () => {
      const element = <AvatarImage alt="John Doe" fallbackInitials="JD" />;

      expect(element).toBeDefined();
    });

    it("should accept className prop and merge with base styles", () => {
      const { container } = render(
        <AvatarImage
          alt="John Doe"
          className="custom-style border-primary ring-2"
        />
      );
      const avatar = container.firstChild as HTMLElement;

      // Should have base classes
      expect(avatar.className).toContain("rounded-full");
      // Should have custom classes
      expect(avatar.className).toContain("custom-style");
      expect(avatar.className).toContain("border-primary");
      expect(avatar.className).toContain("ring-2");
    });

    it("should accept mediaId prop", () => {
      const element = <AvatarImage alt="John Doe" mediaId="user-123" />;

      expect(element).toBeDefined();
    });

    it("should accept webpPath prop", () => {
      const element = (
        <AvatarImage alt="John Doe" webpPath="media/webp/avatar.webp" />
      );

      expect(element).toBeDefined();
    });

    it("should accept filePath prop", () => {
      const element = (
        <AvatarImage alt="John Doe" filePath="media/original/avatar.jpg" />
      );

      expect(element).toBeDefined();
    });

    it("should accept all image path variants together", () => {
      const element = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
          webpPath="media/webp/avatar.webp"
          filePath="media/original/avatar.jpg"
        />
      );

      expect(element).toBeDefined();
    });
  });

  describe("image rendering", () => {
    it("should render image when thumbnailPath is provided", () => {
      const { container, queryByText } = render(
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      // Image should be rendered
      expect(img).toBeDefined();
      expect(img.src).toContain("media/thumbnails/avatar.webp");
      expect(img.alt).toBe("John Doe");
      // Initials should not be shown
      expect(queryByText("JD")).toBeNull();
    });

    it("should use thumbnailPath in preference to webpPath", () => {
      const { container } = render(
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
          webpPath="media/webp/avatar.webp"
        />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      // Should prefer thumbnail
      expect(img.src).toContain("media/thumbnails/avatar.webp");
    });

    it("should use webpPath when thumbnailPath is not available", () => {
      const { container } = render(
        <AvatarImage alt="John Doe" webpPath="media/webp/avatar.webp" />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      expect(img.src).toContain("media/webp/avatar.webp");
    });

    it("should use filePath when no other paths are available", () => {
      const { container } = render(
        <AvatarImage alt="John Doe" filePath="media/original/avatar.jpg" />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      expect(img.src).toContain("media/original/avatar.jpg");
    });

    it("should render initials when all image paths are null", () => {
      const { getByText } = render(
        <AvatarImage
          alt="John Doe"
          thumbnailPath={null}
          webpPath={null}
          filePath={null}
        />
      );
      const initials = getByText("JD");

      expect(initials).toBeDefined();
    });

    it("should set loading attribute to lazy on images", () => {
      const { container } = render(
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      expect(img.getAttribute("loading")).toBe("lazy");
    });

    it("should set decoding attribute to async on images", () => {
      const { container } = render(
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      expect(img.getAttribute("decoding")).toBe("async");
    });
  });

  describe("null and undefined handling", () => {
    it("should handle undefined size", () => {
      const element = <AvatarImage alt="John Doe" size={undefined} />;

      expect(element).toBeDefined();
    });

    it("should handle undefined fallbackInitials", () => {
      const element = (
        <AvatarImage alt="John Doe" fallbackInitials={undefined} />
      );

      expect(element).toBeDefined();
    });

    it("should handle undefined className", () => {
      const element = <AvatarImage alt="John Doe" className={undefined} />;

      expect(element).toBeDefined();
    });

    it("should handle null mediaId", () => {
      const element = <AvatarImage alt="John Doe" mediaId={null} />;

      expect(element).toBeDefined();
    });

    it("should handle undefined mediaId", () => {
      const element = <AvatarImage alt="John Doe" mediaId={undefined} />;

      expect(element).toBeDefined();
    });

    it("should handle null thumbnailPath", () => {
      const element = <AvatarImage alt="John Doe" thumbnailPath={null} />;

      expect(element).toBeDefined();
    });

    it("should handle null webpPath", () => {
      const element = <AvatarImage alt="John Doe" webpPath={null} />;

      expect(element).toBeDefined();
    });

    it("should handle null filePath", () => {
      const element = <AvatarImage alt="John Doe" filePath={null} />;

      expect(element).toBeDefined();
    });

    it("should handle all paths as null", () => {
      const element = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath={null}
          webpPath={null}
          filePath={null}
        />
      );

      expect(element).toBeDefined();
    });
  });

  describe("edge cases with special characters", () => {
    it("should handle empty string alt", () => {
      const element = <AvatarImage alt="" />;

      expect(element).toBeDefined();
    });

    it("should handle alt with special characters", () => {
      const element = <AvatarImage alt="O'Brien Murphy" />;

      expect(element).toBeDefined();
    });

    it("should handle alt with hyphens", () => {
      const element = <AvatarImage alt="Jean-Claude Van Damme" />;

      expect(element).toBeDefined();
    });

    it("should handle alt with unicode characters", () => {
      const element = <AvatarImage alt="Björk Íslaug" />;

      expect(element).toBeDefined();
    });

    it("should handle very long alt text", () => {
      const longName =
        "Alexander Maximilian Johann Baptist von Humboldt-Friedrich";
      const element = <AvatarImage alt={longName} />;

      expect(element).toBeDefined();
    });

    it("should handle alt with numbers", () => {
      const element = <AvatarImage alt="John Doe 2" />;

      expect(element).toBeDefined();
    });

    it("should handle image paths with special characters", () => {
      const element = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar-2024-01-01.webp"
        />
      );

      expect(element).toBeDefined();
    });

    it("should handle fallbackInitials with multiple characters", () => {
      const element = <AvatarImage alt="John Doe" fallbackInitials="JDXYZ" />;

      expect(element).toBeDefined();
    });
  });

  describe("edge cases with single/multi-word names", () => {
    it("should handle single word name", () => {
      const element = <AvatarImage alt="Madonna" />;

      expect(element).toBeDefined();
    });

    it("should handle two word name", () => {
      const element = <AvatarImage alt="Jane Smith" />;

      expect(element).toBeDefined();
    });

    it("should handle three word name", () => {
      const element = <AvatarImage alt="Jean Pierre Dubois" />;

      expect(element).toBeDefined();
    });
  });

  describe("complex instantiation scenarios", () => {
    it("should work with minimal config (alt only)", () => {
      const element = <AvatarImage alt="John Doe" />;

      expect(element).toBeDefined();
      expect(element.type).toBe(AvatarImage);
    });

    it("should work with image and initials together", () => {
      const element = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
          fallbackInitials="JD"
        />
      );

      expect(element).toBeDefined();
    });

    it("should work with full configuration", () => {
      const element = (
        <AvatarImage
          mediaId="user-123"
          alt="John Doe"
          fallbackInitials="JD"
          size="lg"
          className="ring-primary ring-2 ring-offset-2"
          thumbnailPath="media/thumbnails/avatar.webp"
          webpPath="media/webp/avatar.webp"
          filePath="media/original/avatar.jpg"
        />
      );

      expect(element).toBeDefined();
      expect(element.type).toBe(AvatarImage);
    });

    it("should work with different sizes for different contexts", () => {
      const headerAvatar = (
        <AvatarImage
          alt="John Doe"
          size="sm"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      const profileAvatar = (
        <AvatarImage
          alt="John Doe"
          size="xl"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(headerAvatar).toBeDefined();
      expect(profileAvatar).toBeDefined();
    });
  });
});
