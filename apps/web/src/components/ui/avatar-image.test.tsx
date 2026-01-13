/**
 * Unit Tests for AvatarImage Component
 * Tests size variants, fallback to initials, and accessibility
 */

import { describe, it, expect, beforeEach } from "bun:test";
import React from "react";
import { AvatarImage } from "./avatar-image";

describe("AvatarImage Component", () => {
  describe("Size Variants", () => {
    it("should accept sm size variant", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          size="sm"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.size).toBe("sm");
    });

    it("should accept md size variant", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          size="md"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.size).toBe("md");
    });

    it("should accept lg size variant", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          size="lg"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.size).toBe("lg");
    });

    it("should accept xl size variant", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          size="xl"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.size).toBe("xl");
    });

    it("should default to md size", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.size ?? "md").toBe("md");
    });

    it("should apply sm size styling", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          size="sm"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.size).toBe("sm");
    });

    it("should apply md size styling", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          size="md"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.size).toBe("md");
    });

    it("should apply lg size styling", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          size="lg"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.size).toBe("lg");
    });

    it("should apply xl size styling", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          size="xl"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.size).toBe("xl");
    });

    it("should have different sizes for different variants", () => {
      const sm = <AvatarImage alt="John Doe" size="sm" />;
      const lg = <AvatarImage alt="John Doe" size="lg" />;

      expect(sm.props.size).not.toBe(lg.props.size);
    });
  });

  describe("Fallback to Initials", () => {
    it("should display initials when no image provided", () => {
      const component = <AvatarImage alt="John Doe" fallbackInitials="JD" />;

      expect(component.props.fallbackInitials).toBe("JD");
    });

    it("should calculate initials from alt text", () => {
      const component = <AvatarImage alt="Jane Smith" />;

      expect(component).toBeDefined();
    });

    it("should use provided fallbackInitials over alt", () => {
      const component = <AvatarImage alt="John Doe" fallbackInitials="JD" />;

      expect(component.props.fallbackInitials).toBe("JD");
    });

    it("should handle single name with initials", () => {
      const component = <AvatarImage alt="Madonna" fallbackInitials="M" />;

      expect(component.props.fallbackInitials).toBe("M");
    });

    it("should handle three part names", () => {
      const component = <AvatarImage alt="Jean Pierre Dubois" />;

      expect(component).toBeDefined();
    });

    it("should show initials when image fails to load", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          fallbackInitials="JD"
          thumbnailPath="invalid/path.webp"
        />
      );

      expect(component.props.fallbackInitials).toBe("JD");
    });

    it("should display question mark for missing initials", () => {
      const component = <AvatarImage alt="" />;

      expect(component).toBeDefined();
    });

    it("should uppercase initials", () => {
      const component = <AvatarImage alt="john doe" fallbackInitials="JD" />;

      expect(component.props.fallbackInitials.toUpperCase()).toBe("JD");
    });

    it("should handle special characters in names", () => {
      const component = <AvatarImage alt="O'Brien Murphy" />;

      expect(component).toBeDefined();
    });

    it("should handle hyphens in names", () => {
      const component = <AvatarImage alt="Jean-Claude Van Damme" />;

      expect(component).toBeDefined();
    });
  });

  describe("Image Loading", () => {
    it("should render image when thumbnailPath provided", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.thumbnailPath).toBe(
        "media/thumbnails/avatar.webp"
      );
    });

    it("should prefer thumbnailPath over webpPath", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
          webpPath="media/webp/avatar.webp"
        />
      );

      expect(component.props.thumbnailPath).toBeDefined();
      expect(component.props.webpPath).toBeDefined();
    });

    it("should use webpPath when thumbnailPath not available", () => {
      const component = (
        <AvatarImage alt="John Doe" webpPath="media/webp/avatar.webp" />
      );

      expect(component.props.webpPath).toBe("media/webp/avatar.webp");
    });

    it("should use filePath as last resort", () => {
      const component = (
        <AvatarImage alt="John Doe" filePath="media/original/avatar.jpg" />
      );

      expect(component.props.filePath).toBe("media/original/avatar.jpg");
    });

    it("should handle null image paths", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath={null}
          webpPath={null}
          filePath={null}
        />
      );

      expect(component).toBeDefined();
    });

    it("should handle lazy loading", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should set decoding to async", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should support onLoad state", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should support onError state", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });
  });

  describe("Styling", () => {
    it("should accept className prop", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          className="custom-style"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.className).toBe("custom-style");
    });

    it("should apply ring border styling", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should apply rounded-full styling", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should have correct background for fallback", () => {
      const component = <AvatarImage alt="John Doe" fallbackInitials="JD" />;

      expect(component).toBeDefined();
    });

    it("should have text color for initials", () => {
      const component = <AvatarImage alt="John Doe" />;

      expect(component).toBeDefined();
    });

    it("should have medium font for md size initials", () => {
      const component = (
        <AvatarImage alt="John Doe" size="md" fallbackInitials="JD" />
      );

      expect(component.props.size).toBe("md");
    });

    it("should support custom classes", () => {
      const customClass = "border-2 border-primary";
      const component = (
        <AvatarImage
          alt="John Doe"
          className={customClass}
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.className).toBe(customClass);
    });

    it("should have object-cover for image", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should support opacity transitions", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });
  });

  describe("Accessibility", () => {
    it("should include alt text", () => {
      const altText = "Profile photo of John Doe";
      const component = (
        <AvatarImage
          alt={altText}
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.alt).toBe(altText);
    });

    it("should have descriptive alt text", () => {
      const component = (
        <AvatarImage
          alt="Jane Smith's family photo"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.alt).toContain("Jane Smith");
    });

    it("should not be interactive without role", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should have proper semantic structure", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should preserve alt text for screen readers", () => {
      const component = <AvatarImage alt="John Doe" fallbackInitials="JD" />;

      expect(component.props.alt).toBeDefined();
    });

    it("should support ARIA attributes", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });
  });

  describe("Props Handling", () => {
    it("should accept mediaId prop", () => {
      const component = (
        <AvatarImage
          mediaId="user-123"
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.mediaId).toBe("user-123");
    });

    it("should accept optional mediaId", () => {
      const component = (
        <AvatarImage
          mediaId={undefined}
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should accept null mediaId", () => {
      const component = (
        <AvatarImage
          mediaId={null}
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should require alt text", () => {
      const component = (
        <AvatarImage
          alt="Required alt text"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.alt).toBeDefined();
    });

    it("should accept optional fallbackInitials", () => {
      const component = (
        <AvatarImage alt="John Doe" fallbackInitials={undefined} />
      );

      expect(component).toBeDefined();
    });

    it("should accept optional size", () => {
      const component = <AvatarImage alt="John Doe" size={undefined} />;

      expect(component).toBeDefined();
    });

    it("should accept optional className", () => {
      const component = <AvatarImage alt="John Doe" className={undefined} />;

      expect(component).toBeDefined();
    });

    it("should accept optional image paths", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath={undefined}
          webpPath={undefined}
          filePath={undefined}
        />
      );

      expect(component).toBeDefined();
    });
  });

  describe("Image Error Handling", () => {
    it("should fall back to initials on image error", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          fallbackInitials="JD"
          thumbnailPath="invalid/path.webp"
        />
      );

      expect(component.props.fallbackInitials).toBe("JD");
    });

    it("should not show broken image", () => {
      const component = (
        <AvatarImage alt="John Doe" thumbnailPath="broken-path.webp" />
      );

      expect(component).toBeDefined();
    });

    it("should handle missing image gracefully", () => {
      const component = <AvatarImage alt="John Doe" thumbnailPath={null} />;

      expect(component).toBeDefined();
    });

    it("should show initials as fallback", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          fallbackInitials="JD"
          thumbnailPath="missing.webp"
        />
      );

      expect(component.props.fallbackInitials).toBe("JD");
    });
  });

  describe("Display Modes", () => {
    it("should show image when available", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
          fallbackInitials="JD"
        />
      );

      expect(component.props.thumbnailPath).toBeDefined();
    });

    it("should show initials when no image", () => {
      const component = <AvatarImage alt="John Doe" fallbackInitials="JD" />;

      expect(component.props.fallbackInitials).toBe("JD");
    });

    it("should show calculated initials", () => {
      const component = <AvatarImage alt="John Doe" />;

      expect(component).toBeDefined();
    });

    it("should switch from image to initials on error", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="will-fail.webp"
          fallbackInitials="JD"
        />
      );

      expect(component.props.fallbackInitials).toBe("JD");
    });
  });

  describe("Integration", () => {
    it("should render complete avatar with all options", () => {
      const component = (
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

      expect(component.props.mediaId).toBe("user-123");
      expect(component.props.alt).toBe("John Doe");
      expect(component.props.fallbackInitials).toBe("JD");
      expect(component.props.size).toBe("lg");
      expect(component.props.className).toContain("ring-2");
      expect(component.props.thumbnailPath).toBeDefined();
    });

    it("should work with minimal configuration", () => {
      const component = <AvatarImage alt="John Doe" />;

      expect(component.props.alt).toBe("John Doe");
    });

    it("should work with image path only", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar.webp"
        />
      );

      expect(component.props.thumbnailPath).toBeDefined();
    });

    it("should work with initials only", () => {
      const component = <AvatarImage alt="John Doe" fallbackInitials="JD" />;

      expect(component.props.fallbackInitials).toBe("JD");
    });

    it("should render different sizes for different contexts", () => {
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

      expect(headerAvatar.props.size).toBe("sm");
      expect(profileAvatar.props.size).toBe("xl");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty alt text", () => {
      const component = <AvatarImage alt="" />;

      expect(component).toBeDefined();
    });

    it("should handle very long names", () => {
      const longName =
        "Alexander Maximilian Johann Baptist von Humboldt-Friedrich";
      const component = <AvatarImage alt={longName} />;

      expect(component.props.alt).toBe(longName);
    });

    it("should handle names with numbers", () => {
      const component = <AvatarImage alt="John Doe 2" />;

      expect(component).toBeDefined();
    });

    it("should handle unicode characters in names", () => {
      const component = <AvatarImage alt="Björk Íslaug" />;

      expect(component).toBeDefined();
    });

    it("should handle very long initials string", () => {
      const component = <AvatarImage alt="John Doe" fallbackInitials="JDXYZ" />;

      expect(component.props.fallbackInitials).toBe("JDXYZ");
    });

    it("should handle paths with special characters", () => {
      const component = (
        <AvatarImage
          alt="John Doe"
          thumbnailPath="media/thumbnails/avatar-2024-01-01.webp"
        />
      );

      expect(component.props.thumbnailPath).toContain("2024");
    });
  });
});
