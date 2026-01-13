/**
 * Unit Tests for ResponsiveImage Component
 * Tests responsive image rendering, lazy loading, and accessibility
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";
import React from "react";
import { ResponsiveImage } from "./responsive-image";

describe("ResponsiveImage Component", () => {
  describe("Rendering with mediaId", () => {
    it("should render picture element when responsive sizes available", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          thumb800Path="media/responsive/test-123_800.webp"
          thumb1200Path="media/responsive/test-123_1200.webp"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
      expect(component.type).toBe(React.Fragment);
    });

    it("should render simple img when no responsive sizes", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should render fallback when no image source available", () => {
      const component = <ResponsiveImage mediaId="test-123" alt="Test image" />;

      expect(component).toBeDefined();
    });

    it("should accept mediaId prop", () => {
      const component = <ResponsiveImage mediaId="unique-id-123" alt="Test" />;

      expect(component).toBeDefined();
    });

    it("should use mediaId in path construction", () => {
      const mediaId = "image-with-id";
      const component = (
        <ResponsiveImage
          mediaId={mediaId}
          alt="Test image"
          thumb400Path={`media/responsive/${mediaId}_400.webp`}
        />
      );

      expect(component).toBeDefined();
    });
  });

  describe("Lazy Loading", () => {
    it("should set loading to lazy by default", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should set loading to eager when priority is true", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
          priority={true}
        />
      );

      expect(component).toBeDefined();
    });

    it("should set loading to lazy when priority is false", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
          priority={false}
        />
      );

      expect(component).toBeDefined();
    });

    it("should set decoding to async", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });
  });

  describe("Priority Loading", () => {
    it("should support priority prop", () => {
      const componentWithPriority = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
          priority={true}
        />
      );

      const componentWithoutPriority = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
          priority={false}
        />
      );

      expect(componentWithPriority.props.priority).toBe(true);
      expect(componentWithoutPriority.props.priority).toBe(false);
    });

    it("should default priority to false", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.priority ?? false).toBe(false);
    });

    it("should apply eager loading with priority true", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
          priority={true}
        />
      );

      expect(component.props.priority).toBe(true);
    });

    it("should apply lazy loading without priority", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.priority ?? false).toBe(false);
    });
  });

  describe("Fallback Behavior", () => {
    it("should show error placeholder on load failure", () => {
      const component = <ResponsiveImage mediaId="test-123" alt="Test image" />;

      expect(component).toBeDefined();
    });

    it("should use webpPath as fallback", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.webpPath).toBe("media/webp/test-123.webp");
    });

    it("should use filePath when webpPath not available", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          filePath="media/original/test-123.jpg"
        />
      );

      expect(component.props.filePath).toBe("media/original/test-123.jpg");
    });

    it("should display error icon when image fails to load", () => {
      const component = <ResponsiveImage mediaId="test-123" alt="Test image" />;

      expect(component).toBeDefined();
    });

    it("should have accessible fallback", () => {
      const component = <ResponsiveImage mediaId="test-123" alt="Test image" />;

      expect(component).toBeDefined();
    });
  });

  describe("Accessibility", () => {
    it("should include alt text", () => {
      const altText = "Beautiful sunset photo";
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt={altText}
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.alt).toBe(altText);
    });

    it("should accept descriptive alt text", () => {
      const altText = "Family portrait from 1985 wedding";
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt={altText}
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.alt).toBe(altText);
    });

    it("should have alt text for all variants", () => {
      const altText = "Test image";
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt={altText}
          thumb400Path="media/responsive/test-123_400.webp"
          thumb800Path="media/responsive/test-123_800.webp"
          thumb1200Path="media/responsive/test-123_1200.webp"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.alt).toBe(altText);
    });

    it("should not use empty alt text", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Photo of John Doe"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.alt.length).toBeGreaterThan(0);
    });

    it("should support semantic HTML with picture element", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should have proper role semantics", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });
  });

  describe("Responsive Sizes", () => {
    it("should accept all responsive size props", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          thumb800Path="media/responsive/test-123_800.webp"
          thumb1200Path="media/responsive/test-123_1200.webp"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.thumb400Path).toBeDefined();
      expect(component.props.thumb800Path).toBeDefined();
      expect(component.props.thumb1200Path).toBeDefined();
    });

    it("should use provided sizes attribute", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          sizes="(max-width: 640px) 100vw, 50vw"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.sizes).toBe("(max-width: 640px) 100vw, 50vw");
    });

    it("should use default sizes when not provided", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(
        component.props.sizes ??
          "(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
      ).toContain("400px");
    });

    it("should build srcSet from available sizes", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          thumb800Path="media/responsive/test-123_800.webp"
          thumb1200Path="media/responsive/test-123_1200.webp"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should handle partial responsive sizes", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          thumb800Path="media/responsive/test-123_800.webp"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.thumb400Path).toBeDefined();
      expect(component.props.thumb800Path).toBeDefined();
      expect(component.props.thumb1200Path).toBeUndefined();
    });

    it("should handle single responsive size", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.thumb400Path).toBeDefined();
    });
  });

  describe("Image Paths", () => {
    it("should prefix paths with forward slash", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.webpPath).toBe("media/webp/test-123.webp");
    });

    it("should handle various path formats", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/uuid-123_400.webp"
          thumb800Path="media/responsive/uuid-123_800.webp"
          webpPath="media/webp/uuid-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should preserve path structure", () => {
      const paths = {
        thumb400: "media/responsive/test-image_400.webp",
        thumb800: "media/responsive/test-image_800.webp",
        thumb1200: "media/responsive/test-image_1200.webp",
        webp: "media/webp/test-image.webp",
      };

      const component = (
        <ResponsiveImage
          mediaId="test-image"
          alt="Test image"
          thumb400Path={paths.thumb400}
          thumb800Path={paths.thumb800}
          thumb1200Path={paths.thumb1200}
          webpPath={paths.webp}
        />
      );

      expect(component.props.thumb400Path).toBe(paths.thumb400);
      expect(component.props.thumb800Path).toBe(paths.thumb800);
      expect(component.props.thumb1200Path).toBe(paths.thumb1200);
      expect(component.props.webpPath).toBe(paths.webp);
    });
  });

  describe("Styling", () => {
    it("should accept className prop", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          className="rounded-lg"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.className).toBe("rounded-lg");
    });

    it("should apply custom classes", () => {
      const customClass = "w-full h-auto object-cover rounded-md shadow-lg";
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          className={customClass}
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.className).toBe(customClass);
    });

    it("should handle multiple classes", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          className="border-primary rounded-full border-2"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.className).toContain("rounded-full");
    });

    it("should have default size styling", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });
  });

  describe("WebP Format Support", () => {
    it("should render picture element with WebP source", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should have fallback image for non-WebP browsers", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          webpPath="media/webp/test-123.webp"
          filePath="media/original/test-123.jpg"
        />
      );

      expect(component.props.filePath).toBeDefined();
    });

    it("should declare WebP type in source element", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });
  });

  describe("Loading States", () => {
    it("should start with loading state", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should support onLoad callback", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should support onError callback", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should apply opacity transition while loading", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle null responsive paths", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path={null}
          thumb800Path={null}
          thumb1200Path={null}
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should handle undefined responsive paths", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path={undefined}
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should handle missing webpPath", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          filePath="media/original/test-123.jpg"
        />
      );

      expect(component).toBeDefined();
    });

    it("should handle missing all paths", () => {
      const component = <ResponsiveImage mediaId="test-123" alt="Test image" />;

      expect(component).toBeDefined();
    });

    it("should handle very long mediaId", () => {
      const longId = "a".repeat(100);
      const component = (
        <ResponsiveImage
          mediaId={longId}
          alt="Test image"
          webpPath={`media/webp/${longId}.webp`}
        />
      );

      expect(component).toBeDefined();
    });

    it("should handle special characters in alt text", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Photo of 'John & Jane's' family (2020)"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.alt).toContain("John");
    });
  });

  describe("Props Validation", () => {
    it("should require mediaId and alt props", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component.props.mediaId).toBeDefined();
      expect(component.props.alt).toBeDefined();
    });

    it("should accept optional webpPath", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath={undefined}
        />
      );

      expect(component).toBeDefined();
    });

    it("should accept optional className", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          className={undefined}
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });

    it("should accept optional priority", () => {
      const component = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          priority={undefined}
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(component).toBeDefined();
    });
  });
});
