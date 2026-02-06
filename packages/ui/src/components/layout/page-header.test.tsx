/**
 * Unit Tests for PageHeader Component
 */
import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  describe("rendering", () => {
    test("renders header element", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const header = container.querySelector("header");
      expect(header).toBeDefined();
      expect(header?.tagName).toBe("HEADER");
    });

    test("renders with required title prop", () => {
      const { getByText } = render(<PageHeader title="My Page Title" />);
      expect(getByText("My Page Title")).toBeDefined();
    });

    test("renders h1 with title text", () => {
      const { container, getByText } = render(
        <PageHeader title="Test Title" />
      );
      const h1 = container.querySelector("h1");
      expect(h1).toBeDefined();
      expect(h1?.tagName).toBe("H1");
      expect(getByText("Test Title")).toBeDefined();
    });

    test("renders title inside h1 element", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const h1 = container.querySelector("h1");
      expect(h1?.textContent).toBe("Test Title");
    });
  });

  describe("title styling", () => {
    test("applies display font to title", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const h1 = container.querySelector("h1");
      expect(h1?.className).toContain("font-display");
    });

    test("applies text size 3xl on mobile, 4xl on sm, 5xl on lg", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const h1 = container.querySelector("h1");
      expect(h1?.className).toContain("text-3xl");
      expect(h1?.className).toContain("sm:text-4xl");
      expect(h1?.className).toContain("lg:text-5xl");
    });

    test("applies font-medium weight to title", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const h1 = container.querySelector("h1");
      expect(h1?.className).toContain("font-medium");
    });

    test("applies tracking-tight letter spacing", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const h1 = container.querySelector("h1");
      expect(h1?.className).toContain("tracking-tight");
    });
  });

  describe("description prop", () => {
    test("does not render description when prop is not provided", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const paragraph = container.querySelector("p");
      expect(paragraph).toBeNull();
    });

    test("renders description when prop is provided", () => {
      const { getByText } = render(
        <PageHeader title="Test Title" description="Test description" />
      );
      expect(getByText("Test description")).toBeDefined();
    });

    test("renders description in p element", () => {
      const { container } = render(
        <PageHeader title="Test Title" description="Test description" />
      );
      const paragraph = container.querySelector("p");
      expect(paragraph).toBeDefined();
      expect(paragraph?.tagName).toBe("P");
      expect(paragraph?.textContent).toBe("Test description");
    });

    test("applies muted-foreground color to description", () => {
      const { container } = render(
        <PageHeader title="Test Title" description="Test description" />
      );
      const paragraph = container.querySelector("p");
      expect(paragraph?.className).toContain("text-muted-foreground");
    });

    test("applies text-lg size to description", () => {
      const { container } = render(
        <PageHeader title="Test Title" description="Test description" />
      );
      const paragraph = container.querySelector("p");
      expect(paragraph?.className).toContain("text-lg");
    });

    test("applies max-width constraint to description", () => {
      const { container } = render(
        <PageHeader title="Test Title" description="Test description" />
      );
      const paragraph = container.querySelector("p");
      expect(paragraph?.className).toContain("max-w-2xl");
    });

    test("renders empty string description", () => {
      const { container } = render(
        <PageHeader title="Test Title" description="" />
      );
      const paragraph = container.querySelector("p");
      expect(paragraph).toBeNull();
    });

    test("renders description with special characters", () => {
      const description = "This is a test with <special> & characters!";
      const { getByText } = render(
        <PageHeader title="Test Title" description={description} />
      );
      expect(getByText(description)).toBeDefined();
    });
  });

  describe("actions prop", () => {
    test("does not render actions section when prop is not provided", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const actionDiv = container.querySelector(
        ".flex.shrink-0.items-center.gap-3"
      );
      expect(actionDiv).toBeNull();
    });

    test("renders actions section when prop is provided", () => {
      const { getByText } = render(
        <PageHeader title="Test Title" actions={<button>Action</button>} />
      );
      expect(getByText("Action")).toBeDefined();
    });

    test("renders actions in a div with flex layout", () => {
      const { container } = render(
        <PageHeader title="Test Title" actions={<button>Action</button>} />
      );
      const actionDiv = container.querySelector(
        ".flex.shrink-0.items-center.gap-3"
      );
      expect(actionDiv).toBeDefined();
    });

    test("applies shrink-0 to prevent flex shrinking", () => {
      const { container } = render(
        <PageHeader title="Test Title" actions={<button>Action</button>} />
      );
      const actionDiv = container.querySelector(".flex.shrink-0.items-center");
      expect(actionDiv?.className).toContain("shrink-0");
    });

    test("applies items-center alignment to actions", () => {
      const { container } = render(
        <PageHeader title="Test Title" actions={<button>Action</button>} />
      );
      const actionDiv = container.querySelector(".flex.shrink-0.items-center");
      expect(actionDiv?.className).toContain("items-center");
    });

    test("applies gap-3 spacing between action items", () => {
      const { container } = render(
        <PageHeader title="Test Title" actions={<button>Action</button>} />
      );
      const actionDiv = container.querySelector(".flex.shrink-0.items-center");
      expect(actionDiv?.className).toContain("gap-3");
    });

    test("renders multiple action elements", () => {
      const { getByText } = render(
        <PageHeader
          title="Test Title"
          actions={
            <>
              <button>Action 1</button>
              <button>Action 2</button>
            </>
          }
        />
      );
      expect(getByText("Action 1")).toBeDefined();
      expect(getByText("Action 2")).toBeDefined();
    });

    test("renders complex action components", () => {
      const { getByText } = render(
        <PageHeader
          title="Test Title"
          actions={
            <div>
              <span>Filter:</span>
              <button>By Date</button>
            </div>
          }
        />
      );
      expect(getByText("Filter:")).toBeDefined();
      expect(getByText("By Date")).toBeDefined();
    });
  });

  describe("header layout", () => {
    test("applies flex display to header", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const header = container.querySelector("header");
      expect(header?.className).toContain("flex");
    });

    test("applies flex-col on mobile", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const header = container.querySelector("header");
      expect(header?.className).toContain("flex-col");
    });

    test("applies sm:flex-row for responsive layout", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const header = container.querySelector("header");
      expect(header?.className).toContain("sm:flex-row");
    });

    test("applies sm:items-end for bottom alignment at sm breakpoint", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const header = container.querySelector("header");
      expect(header?.className).toContain("sm:items-end");
    });

    test("applies sm:justify-between for space distribution", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const header = container.querySelector("header");
      expect(header?.className).toContain("sm:justify-between");
    });

    test("applies gap-4 between flex items", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const header = container.querySelector("header");
      expect(header?.className).toContain("gap-4");
    });

    test("applies mb-8 margin bottom", () => {
      const { container } = render(<PageHeader title="Test Title" />);
      const header = container.querySelector("header");
      expect(header?.className).toContain("mb-8");
    });
  });

  describe("title and description container", () => {
    test("wraps title and description in div with space-y-2", () => {
      const { container } = render(
        <PageHeader title="Test Title" description="Test description" />
      );
      const titleDiv = container.querySelector(".space-y-2");
      expect(titleDiv).toBeDefined();
      expect(titleDiv?.className).toContain("space-y-2");
    });

    test("title and description are siblings in same container", () => {
      const { container } = render(
        <PageHeader title="Test Title" description="Test description" />
      );
      const titleDiv = container.querySelector(".space-y-2");
      const h1 = titleDiv?.querySelector("h1");
      const p = titleDiv?.querySelector("p");
      expect(h1).toBeDefined();
      expect(p).toBeDefined();
    });
  });

  describe("className prop", () => {
    test("applies custom className to header", () => {
      const { container } = render(
        <PageHeader title="Test Title" className="custom-class" />
      );
      const header = container.querySelector("header");
      expect(header?.className).toContain("custom-class");
    });

    test("merges custom className with default classes", () => {
      const { container } = render(
        <PageHeader title="Test Title" className="custom-class" />
      );
      const header = container.querySelector("header");
      // Should have both default classes and custom class
      expect(header?.className).toContain("flex");
      expect(header?.className).toContain("custom-class");
    });

    test("allows overriding default responsive behavior via className", () => {
      const { container } = render(
        <PageHeader title="Test Title" className="flex-row items-start" />
      );
      const header = container.querySelector("header");
      // Should have both overridden and default classes
      expect(header?.className).toContain("flex-row");
      expect(header?.className).toContain("items-start");
    });

    test("applies multiple custom classes", () => {
      const { container } = render(
        <PageHeader title="Test Title" className="class1 class2 class3" />
      );
      const header = container.querySelector("header");
      expect(header?.className).toContain("class1");
      expect(header?.className).toContain("class2");
      expect(header?.className).toContain("class3");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref to header element", () => {
      const headerRef = { current: null as HTMLElement | null };
      render(
        <PageHeader
          ref={(el) => {
            headerRef.current = el;
          }}
          title="Test Title"
        />
      );
      expect(headerRef.current).not.toBeNull();
      expect(headerRef.current?.tagName).toBe("HEADER");
    });

    test("ref allows access to header properties", () => {
      const headerRef = { current: null as HTMLElement | null };
      render(
        <PageHeader
          ref={(el) => {
            headerRef.current = el;
          }}
          title="Test Title"
          className="test-header"
        />
      );
      expect(headerRef.current?.className).toContain("test-header");
    });
  });

  describe("HTML attributes passthrough", () => {
    test("passes through data-testid attribute", () => {
      const { getByTestId } = render(
        <PageHeader title="Test Title" data-testid="page-header" />
      );
      expect(getByTestId("page-header")).toBeDefined();
    });

    test("passes through data attributes", () => {
      const { container } = render(
        <PageHeader title="Test Title" data-custom="custom-value" />
      );
      const header = container.querySelector("header");
      expect(header?.getAttribute("data-custom")).toBe("custom-value");
    });

    test("passes through aria-label attribute", () => {
      const { container } = render(
        <PageHeader title="Test Title" aria-label="Main page header" />
      );
      const header = container.querySelector("header");
      expect(header?.getAttribute("aria-label")).toBe("Main page header");
    });

    test("passes through aria-describedby attribute", () => {
      const { container } = render(
        <PageHeader title="Test Title" aria-describedby="description" />
      );
      const header = container.querySelector("header");
      expect(header?.getAttribute("aria-describedby")).toBe("description");
    });

    test("passes through multiple HTML attributes", () => {
      const { container } = render(
        <PageHeader
          title="Test Title"
          data-testid="header"
          aria-label="Header"
          role="banner"
        />
      );
      const header = container.querySelector("header");
      expect(header?.getAttribute("data-testid")).toBe("header");
      expect(header?.getAttribute("aria-label")).toBe("Header");
      expect(header?.getAttribute("role")).toBe("banner");
    });
  });

  describe("displayName", () => {
    test("has correct displayName for debugging", () => {
      expect(PageHeader.displayName).toBe("PageHeader");
    });
  });

  describe("composition and integration", () => {
    test("renders complete structure with all props", () => {
      const { container, getByText } = render(
        <PageHeader
          title="My Page"
          description="This is a description"
          actions={<button>Action Button</button>}
          className="custom-header"
          data-testid="full-header"
        />
      );

      const header = container.querySelector("header");
      expect(header).toBeDefined();
      expect(getByText("My Page")).toBeDefined();
      expect(getByText("This is a description")).toBeDefined();
      expect(getByText("Action Button")).toBeDefined();
      expect(header?.className).toContain("custom-header");
    });

    test("renders with only required title prop", () => {
      const { container } = render(<PageHeader title="Minimal Header" />);
      const header = container.querySelector("header");
      expect(header).toBeDefined();
      // Should not have description or actions sections
      const p = container.querySelector("p");
      const actionDiv = container.querySelector(
        ".flex.shrink-0.items-center.gap-3"
      );
      expect(p).toBeNull();
      expect(actionDiv).toBeNull();
    });

    test("renders with title and description only", () => {
      const { container, getByText } = render(
        <PageHeader title="Page Title" description="Page description" />
      );

      expect(getByText("Page Title")).toBeDefined();
      expect(getByText("Page description")).toBeDefined();
      // Should not have actions section
      const actionDiv = container.querySelector(
        ".flex.shrink-0.items-center.gap-3"
      );
      expect(actionDiv).toBeNull();
    });

    test("renders with title and actions only", () => {
      const { container, getByText } = render(
        <PageHeader title="Page Title" actions={<button>Save</button>} />
      );

      expect(getByText("Page Title")).toBeDefined();
      expect(getByText("Save")).toBeDefined();
      // Should not have description
      const p = container.querySelector("p");
      expect(p).toBeNull();
    });

    test("renders long title text without breaking layout", () => {
      const longTitle =
        "This is a very long title that might wrap across multiple lines in responsive design";
      const { getByText } = render(<PageHeader title={longTitle} />);
      expect(getByText(longTitle)).toBeDefined();
    });

    test("renders long description text without breaking layout", () => {
      const longDescription =
        "This is a very long description that describes the page in detail and might wrap across multiple lines when rendered on different screen sizes";
      const { getByText } = render(
        <PageHeader title="Title" description={longDescription} />
      );
      expect(getByText(longDescription)).toBeDefined();
    });
  });

  describe("edge cases", () => {
    test("handles title with only whitespace", () => {
      const { container } = render(<PageHeader title="   " />);
      const h1 = container.querySelector("h1");
      expect(h1).toBeDefined();
      expect(h1?.textContent).toBe("   ");
    });

    test("handles description with only whitespace", () => {
      const { container } = render(
        <PageHeader title="Title" description="   " />
      );
      // Whitespace-only description is still rendered as it's truthy
      const p = container.querySelector("p");
      expect(p).toBeDefined();
    });

    test("handles null actions by not rendering actions section", () => {
      const { container } = render(<PageHeader title="Title" actions={null} />);
      const actionDiv = container.querySelector(
        ".flex.shrink-0.items-center.gap-3"
      );
      expect(actionDiv).toBeNull();
    });

    test("renders with JSX fragment in actions", () => {
      const { getByText } = render(
        <PageHeader
          title="Title"
          actions={
            <>
              <button>Button 1</button>
              <button>Button 2</button>
            </>
          }
        />
      );
      expect(getByText("Button 1")).toBeDefined();
      expect(getByText("Button 2")).toBeDefined();
    });
  });
});
