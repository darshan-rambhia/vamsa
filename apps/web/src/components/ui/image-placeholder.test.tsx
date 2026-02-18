import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ImagePlaceholder } from "./image-placeholder";

describe("ImagePlaceholder", () => {
  it("renders landscape variant with mountain/sun SVG content", () => {
    const { container } = render(<ImagePlaceholder variant="landscape" />);
    const svg = container.querySelector("svg");

    expect(svg).toBeDefined();
    expect(svg!.getAttribute("aria-hidden")).toBe("true");
    // Landscape has a circle (sun), a path (mountains), and a rect (frame)
    expect(container.querySelector("circle")).toBeDefined();
    expect(container.querySelector("rect")).toBeDefined();
    expect(container.querySelector("path")).toBeDefined();
  });

  it("renders portrait variant with person silhouette SVG content", () => {
    const { container } = render(<ImagePlaceholder variant="portrait" />);
    const svg = container.querySelector("svg");

    expect(svg).toBeDefined();
    expect(svg!.getAttribute("aria-hidden")).toBe("true");
    // Portrait has a circle (head) and a path (shoulders), no rect
    expect(container.querySelector("circle")).toBeDefined();
    expect(container.querySelector("path")).toBeDefined();
    expect(container.querySelector("rect")).toBeNull();
  });

  it("defaults to landscape variant when no variant is specified", () => {
    const { container } = render(<ImagePlaceholder />);

    // Landscape has a rect (frame), portrait does not
    expect(container.querySelector("rect")).toBeDefined();
  });

  it("applies className prop to the SVG element", () => {
    const { container } = render(
      <ImagePlaceholder className="mx-auto h-16 w-16" />
    );
    const svg = container.querySelector("svg");
    const classAttr = svg!.getAttribute("class") ?? "";

    expect(classAttr).toContain("h-16");
    expect(classAttr).toContain("w-16");
    expect(classAttr).toContain("mx-auto");
  });
});
