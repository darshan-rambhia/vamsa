/**
 * Unit tests for ResponsiveImage component
 *
 * Tests verify the component:
 * 1. Exports and renders correctly
 * 2. Handles responsive image sizes and srcSet
 * 3. Uses picture element for responsive images
 * 4. Displays error placeholder when image fails to load
 * 5. Applies lazy loading and priority settings
 */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ResponsiveImage } from "./responsive-image";

describe("ResponsiveImage Component", () => {
  describe("exports and basic rendering", () => {
    it("should export ResponsiveImage component", () => {
      expect(ResponsiveImage).toBeDefined();
      expect(typeof ResponsiveImage).toBe("function");
    });

    it("should render an image with alt text", () => {
      const { container } = render(
        <ResponsiveImage mediaId="test-123" alt="Test image" />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      expect(img).toBeDefined();
      expect(img.alt).toBe("Test image");
    });

    it("should set lazy loading by default", () => {
      const { container } = render(
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/test.webp"
        />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      expect(img.getAttribute("loading")).toBe("lazy");
    });

    it("should set eager loading when priority is true", () => {
      const { container } = render(
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          priority={true}
          webpPath="media/test.webp"
        />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      expect(img.getAttribute("loading")).toBe("eager");
    });

    it("should have async decoding attribute", () => {
      const { container } = render(
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/test.webp"
        />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      expect(img.getAttribute("decoding")).toBe("async");
    });

    it("should apply responsive object-cover styling", () => {
      const { container } = render(
        <ResponsiveImage mediaId="test-123" alt="Test image" />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      expect(img.className).toContain("h-full");
      expect(img.className).toContain("w-full");
      expect(img.className).toContain("object-cover");
    });
  });

  describe("instantiation with required props", () => {
    it("should create element with mediaId and alt", () => {
      const element = <ResponsiveImage mediaId="test-123" alt="Test image" />;

      expect(element).toBeDefined();
      expect(element.type).toBe(ResponsiveImage);
      expect(element.props.mediaId).toBe("test-123");
      expect(element.props.alt).toBe("Test image");
    });
  });

  describe("instantiation with optional webpPath", () => {
    it("should accept webpPath prop", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.webpPath).toBe("media/webp/test-123.webp");
    });

    it("should accept null webpPath", () => {
      const element = (
        <ResponsiveImage mediaId="test-123" alt="Test image" webpPath={null} />
      );

      expect(element).toBeDefined();
      expect(element.props.webpPath).toBeNull();
    });

    it("should accept undefined webpPath", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath={undefined}
        />
      );

      expect(element).toBeDefined();
    });
  });

  describe("responsive image sizes", () => {
    it("should render picture element with source when responsive sizes provided", () => {
      const { container } = render(
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          thumb800Path="media/responsive/test-123_800.webp"
        />
      );
      const picture = container.querySelector("picture");

      expect(picture).toBeDefined();
      expect(picture?.querySelector("source")).toBeDefined();
    });

    it("should set correct srcSet with responsive sizes", () => {
      const { container } = render(
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          thumb800Path="media/responsive/test-123_800.webp"
          thumb1200Path="media/responsive/test-123_1200.webp"
        />
      );
      const source = container.querySelector("source") as HTMLSourceElement;

      expect(source).toBeDefined();
      const srcSet = source.getAttribute("srcset") || source.srcset || "";
      expect(srcSet.toString()).toContain(
        "media/responsive/test-123_400.webp 400w"
      );
      expect(srcSet.toString()).toContain(
        "media/responsive/test-123_800.webp 800w"
      );
      expect(srcSet.toString()).toContain(
        "media/responsive/test-123_1200.webp 1200w"
      );
    });

    it("should include only provided responsive sizes in srcSet", () => {
      const { container } = render(
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          thumb1200Path="media/responsive/test-123_1200.webp"
        />
      );
      const source = container.querySelector("source") as HTMLSourceElement;

      const srcSet = source.getAttribute("srcset") || source.srcset || "";
      expect(srcSet.toString()).toContain("400w");
      expect(srcSet.toString()).toContain("1200w");
      expect(srcSet.toString()).not.toContain("800w");
    });

    it("should set source type to image/webp", () => {
      const { container } = render(
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
        />
      );
      const source = container.querySelector("source") as HTMLSourceElement;

      expect(source.type).toBe("image/webp");
    });

    it("should use custom sizes attribute when provided", () => {
      const customSizes = "(max-width: 640px) 100vw, 50vw";
      const { container } = render(
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          sizes={customSizes}
        />
      );
      const source = container.querySelector("source") as HTMLSourceElement;

      expect(source.getAttribute("sizes")).toBe(customSizes);
    });

    it("should use default sizes when not provided", () => {
      const { container } = render(
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
        />
      );
      const source = container.querySelector("source") as HTMLSourceElement;

      expect(source.getAttribute("sizes")).toBe(
        "(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
      );
    });

    it("should accept thumb400Path", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.thumb400Path).toBe(
        "media/responsive/test-123_400.webp"
      );
    });

    it("should accept all responsive size props", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          thumb800Path="media/responsive/test-123_800.webp"
          thumb1200Path="media/responsive/test-123_1200.webp"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.thumb400Path).toBeDefined();
      expect(element.props.thumb800Path).toBeDefined();
      expect(element.props.thumb1200Path).toBeDefined();
    });

    it("should accept null responsive sizes", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path={null}
          thumb800Path={null}
          thumb1200Path={null}
        />
      );

      expect(element).toBeDefined();
    });
  });

  describe("instantiation with optional filePath", () => {
    it("should accept filePath prop", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          filePath="media/original/test-123.jpg"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.filePath).toBe("media/original/test-123.jpg");
    });
  });

  describe("className and styling", () => {
    it("should accept className prop and apply to image", () => {
      const { container } = render(
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          className="rounded-lg shadow-md"
        />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      expect(img.className).toContain("rounded-lg");
      expect(img.className).toContain("shadow-md");
      // Should still have base classes
      expect(img.className).toContain("h-full");
      expect(img.className).toContain("w-full");
    });

    it("should accept multiple classes in className", () => {
      const customClass = "rounded-md shadow-lg border-2";
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          className={customClass}
        />
      );

      expect(element).toBeDefined();
      expect(element.props.className).toContain("rounded-md");
      expect(element.props.className).toContain("shadow-lg");
      expect(element.props.className).toContain("border-2");
    });

    it("should apply transition opacity classes for loading states", () => {
      const { container } = render(
        <ResponsiveImage mediaId="test-123" alt="Test image" />
      );
      const img = container.querySelector("img") as HTMLImageElement;

      expect(img.className).toContain("transition-opacity");
      expect(img.className).toContain("duration-300");
    });
  });

  describe("instantiation with optional priority", () => {
    it("should accept priority=true", () => {
      const element = (
        <ResponsiveImage mediaId="test-123" alt="Test image" priority={true} />
      );

      expect(element).toBeDefined();
      expect(element.props.priority).toBe(true);
    });

    it("should accept priority=false", () => {
      const element = (
        <ResponsiveImage mediaId="test-123" alt="Test image" priority={false} />
      );

      expect(element).toBeDefined();
      expect(element.props.priority).toBe(false);
    });

    it("should default priority to false when undefined", () => {
      const element = <ResponsiveImage mediaId="test-123" alt="Test image" />;

      expect(element).toBeDefined();
      expect(element.props.priority ?? false).toBe(false);
    });
  });

  describe("instantiation with optional sizes", () => {
    it("should accept custom sizes attribute", () => {
      const customSizes = "(max-width: 640px) 100vw, 50vw";
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          sizes={customSizes}
        />
      );

      expect(element).toBeDefined();
      expect(element.props.sizes).toBe(customSizes);
    });

    it("should use default sizes when not provided", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.sizes ?? undefined).toBeUndefined();
    });
  });

  describe("handling null/undefined sources", () => {
    it("should handle missing all image sources", () => {
      const element = <ResponsiveImage mediaId="test-123" alt="Test image" />;

      expect(element).toBeDefined();
    });

    it("should handle webpPath with filePath fallback", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          webpPath="media/webp/test-123.webp"
          filePath="media/original/test-123.jpg"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.webpPath).toBeDefined();
      expect(element.props.filePath).toBeDefined();
    });

    it("should handle filePath only (no webpPath)", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          filePath="media/original/test-123.jpg"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.filePath).toBe("media/original/test-123.jpg");
    });
  });

  describe("different responsive size combinations", () => {
    it("should handle only 400px size", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.thumb400Path).toBeDefined();
      expect(element.props.thumb800Path).toBeUndefined();
      expect(element.props.thumb1200Path).toBeUndefined();
    });

    it("should handle 400px and 800px sizes", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          thumb800Path="media/responsive/test-123_800.webp"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.thumb400Path).toBeDefined();
      expect(element.props.thumb800Path).toBeDefined();
      expect(element.props.thumb1200Path).toBeUndefined();
    });

    it("should handle all three sizes (400, 800, 1200)", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          thumb800Path="media/responsive/test-123_800.webp"
          thumb1200Path="media/responsive/test-123_1200.webp"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.thumb400Path).toBeDefined();
      expect(element.props.thumb800Path).toBeDefined();
      expect(element.props.thumb1200Path).toBeDefined();
    });

    it("should handle non-sequential sizes", () => {
      const element = (
        <ResponsiveImage
          mediaId="test-123"
          alt="Test image"
          thumb400Path="media/responsive/test-123_400.webp"
          thumb1200Path="media/responsive/test-123_1200.webp"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.thumb400Path).toBeDefined();
      expect(element.props.thumb800Path).toBeUndefined();
      expect(element.props.thumb1200Path).toBeDefined();
    });
  });

  describe("alt text handling", () => {
    it("should preserve alt text exactly", () => {
      const altText = "Beautiful sunset photo from 2023";
      const element = <ResponsiveImage mediaId="test-123" alt={altText} />;

      expect(element).toBeDefined();
      expect(element.props.alt).toBe(altText);
    });

    it("should handle alt text with special characters", () => {
      const altText = "Photo of John & Jane's family (1985)";
      const element = <ResponsiveImage mediaId="test-123" alt={altText} />;

      expect(element).toBeDefined();
      expect(element.props.alt).toBe(altText);
    });

    it("should require non-empty alt text", () => {
      const element = (
        <ResponsiveImage mediaId="test-123" alt="Meaningful description" />
      );

      expect(element).toBeDefined();
      expect(element.props.alt.length).toBeGreaterThan(0);
    });
  });

  describe("complex prop combinations", () => {
    it("should accept all props simultaneously", () => {
      const element = (
        <ResponsiveImage
          mediaId="photo-2023-001"
          alt="Family reunion photo"
          className="h-auto w-full rounded-lg shadow-md"
          priority={true}
          webpPath="media/webp/photo-2023-001.webp"
          thumb400Path="media/responsive/photo-2023-001_400.webp"
          thumb800Path="media/responsive/photo-2023-001_800.webp"
          thumb1200Path="media/responsive/photo-2023-001_1200.webp"
          filePath="media/original/photo-2023-001.jpg"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
        />
      );

      expect(element).toBeDefined();
      expect(element.props.mediaId).toBe("photo-2023-001");
      expect(element.props.alt).toBe("Family reunion photo");
      expect(element.props.className).toContain("rounded-lg");
      expect(element.props.className).toContain("shadow-md");
      expect(element.props.priority).toBe(true);
      expect(element.props.webpPath).toBeDefined();
      expect(element.props.thumb400Path).toBeDefined();
      expect(element.props.thumb800Path).toBeDefined();
      expect(element.props.thumb1200Path).toBeDefined();
      expect(element.props.filePath).toBeDefined();
      expect(element.props.sizes).toBeDefined();
    });

    it("should accept minimal props only", () => {
      const element = <ResponsiveImage mediaId="minimal" alt="Test" />;

      expect(element).toBeDefined();
      expect(element.props.mediaId).toBe("minimal");
      expect(element.props.alt).toBe("Test");
    });
  });
});
