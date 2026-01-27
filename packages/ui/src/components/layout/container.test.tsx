/**
 * Unit Tests for Container Component
 */
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Container } from "./container";

describe("Container", () => {
  describe("rendering", () => {
    test("renders as a div element", () => {
      const { container } = render(<Container data-testid="container" />);
      const div = container.querySelector("div");
      expect(div).toBeDefined();
      expect(div?.tagName).toBe("DIV");
    });

    test("renders with children", () => {
      const { getByText } = render(
        <Container>
          <span>Test Content</span>
        </Container>
      );
      expect(getByText("Test Content")).toBeDefined();
    });

    test("renders with multiple children", () => {
      const { getByText } = render(
        <Container>
          <div>First</div>
          <div>Second</div>
          <div>Third</div>
        </Container>
      );
      expect(getByText("First")).toBeDefined();
      expect(getByText("Second")).toBeDefined();
      expect(getByText("Third")).toBeDefined();
    });

    test("renders with text children", () => {
      const { getByText } = render(<Container>Simple Text</Container>);
      expect(getByText("Simple Text")).toBeDefined();
    });

    test("renders with empty children", () => {
      const { container } = render(<Container />);
      const div = container.querySelector("div");
      expect(div).toBeDefined();
    });

    test("renders with node children", () => {
      const { container } = render(
        <Container>
          <p>Paragraph</p>
          <button>Button</button>
        </Container>
      );
      const p = container.querySelector("p");
      const button = container.querySelector("button");
      expect(p).toBeDefined();
      expect(button).toBeDefined();
    });
  });

  describe("base styling", () => {
    test("applies mx-auto class for centering", () => {
      const { container } = render(<Container data-testid="container" />);
      const div = container.querySelector("div");
      expect(div?.className).toContain("mx-auto");
    });

    test("applies w-full class for full width", () => {
      const { container } = render(<Container data-testid="container" />);
      const div = container.querySelector("div");
      expect(div?.className).toContain("w-full");
    });

    test("applies base padding class", () => {
      const { container } = render(<Container data-testid="container" />);
      const div = container.querySelector("div");
      expect(div?.className).toContain("px-4");
    });

    test("applies responsive padding for small screens", () => {
      const { container } = render(<Container data-testid="container" />);
      const div = container.querySelector("div");
      expect(div?.className).toContain("sm:px-6");
    });

    test("applies responsive padding for large screens", () => {
      const { container } = render(<Container data-testid="container" />);
      const div = container.querySelector("div");
      expect(div?.className).toContain("lg:px-12");
    });

    test("applies all required base classes together", () => {
      const { container } = render(<Container data-testid="container" />);
      const div = container.querySelector("div");
      expect(div?.className).toContain("mx-auto");
      expect(div?.className).toContain("w-full");
      expect(div?.className).toContain("px-4");
      expect(div?.className).toContain("sm:px-6");
      expect(div?.className).toContain("lg:px-12");
    });
  });

  describe("size variants", () => {
    test("applies lg size by default", () => {
      const { container } = render(<Container data-testid="container" />);
      const div = container.querySelector("div");
      expect(div?.className).toContain("max-w-7xl");
    });

    test("applies sm size when specified", () => {
      const { container } = render(
        <Container size="sm" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.className).toContain("max-w-3xl");
      expect(div?.className).not.toContain("max-w-7xl");
    });

    test("applies md size when specified", () => {
      const { container } = render(
        <Container size="md" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.className).toContain("max-w-5xl");
      expect(div?.className).not.toContain("max-w-7xl");
    });

    test("applies lg size when explicitly specified", () => {
      const { container } = render(
        <Container size="lg" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.className).toContain("max-w-7xl");
    });

    test("applies full size when specified", () => {
      const { container } = render(
        <Container size="full" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.className).toContain("max-w-none");
      expect(div?.className).not.toContain("max-w-7xl");
    });

    test("sm and lg sizes are visually different", () => {
      const { container: smContainer, rerender } = render(
        <Container size="sm" data-testid="container" />
      );
      const smDiv = smContainer.querySelector("div");
      const smClasses = smDiv?.className;

      rerender(<Container size="lg" data-testid="container" />);
      const lgDiv = smContainer.querySelector("div");
      const lgClasses = lgDiv?.className;

      expect(smClasses).not.toEqual(lgClasses);
      expect(smClasses).toContain("max-w-3xl");
      expect(lgClasses).toContain("max-w-7xl");
    });

    test("md and lg sizes are visually different", () => {
      const { container: mdContainer, rerender } = render(
        <Container size="md" data-testid="container" />
      );
      const mdDiv = mdContainer.querySelector("div");
      const mdClasses = mdDiv?.className;

      rerender(<Container size="lg" data-testid="container" />);
      const lgDiv = mdContainer.querySelector("div");
      const lgClasses = lgDiv?.className;

      expect(mdClasses).not.toEqual(lgClasses);
      expect(mdClasses).toContain("max-w-5xl");
      expect(lgClasses).toContain("max-w-7xl");
    });

    test("full size differs from constrained sizes", () => {
      const { container: fullContainer, rerender } = render(
        <Container size="full" data-testid="container" />
      );
      const fullDiv = fullContainer.querySelector("div");
      const fullClasses = fullDiv?.className;

      rerender(<Container size="lg" data-testid="container" />);
      const lgDiv = fullContainer.querySelector("div");
      const lgClasses = lgDiv?.className;

      expect(fullClasses).not.toEqual(lgClasses);
      expect(fullClasses).toContain("max-w-none");
      expect(lgClasses).not.toContain("max-w-none");
    });
  });

  describe("className handling", () => {
    test("accepts custom className prop", () => {
      const { container } = render(
        <Container className="custom-class" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.className).toContain("custom-class");
    });

    test("merges custom className with base classes", () => {
      const { container } = render(
        <Container className="custom-class" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.className).toContain("custom-class");
      expect(div?.className).toContain("mx-auto");
      expect(div?.className).toContain("w-full");
      expect(div?.className).toContain("px-4");
    });

    test("merges custom className with size variant", () => {
      const { container } = render(
        <Container size="sm" className="custom-class" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.className).toContain("custom-class");
      expect(div?.className).toContain("max-w-3xl");
    });

    test("custom className takes precedence when conflicting", () => {
      const { container } = render(
        <Container className="px-8" data-testid="container" />
      );
      const div = container.querySelector("div");
      // Tailwind merge should prefer custom px-8 over px-4
      expect(div?.className).toContain("px-8");
    });

    test("handles multiple custom classes", () => {
      const { container } = render(
        <Container
          className="custom-1 custom-2 custom-3"
          data-testid="container"
        />
      );
      const div = container.querySelector("div");
      expect(div?.className).toContain("custom-1");
      expect(div?.className).toContain("custom-2");
      expect(div?.className).toContain("custom-3");
    });

    test("handles empty custom className string", () => {
      const { container } = render(
        <Container className="" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.className).toContain("mx-auto");
      expect(div?.className).toContain("w-full");
    });
  });

  describe("HTML attributes", () => {
    test("passes through data attributes", () => {
      const { container } = render(
        <Container data-testid="container" data-custom="value" />
      );
      const div = container.querySelector("div");
      expect(div?.getAttribute("data-custom")).toBe("value");
    });

    test("passes through multiple data attributes", () => {
      const { container } = render(
        <Container data-testid="container" data-foo="bar" data-baz="qux" />
      );
      const div = container.querySelector("div");
      expect(div?.getAttribute("data-foo")).toBe("bar");
      expect(div?.getAttribute("data-baz")).toBe("qux");
    });

    test("passes through aria attributes", () => {
      const { container } = render(
        <Container aria-label="Main content" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.getAttribute("aria-label")).toBe("Main content");
    });

    test("passes through id attribute", () => {
      const { container } = render(
        <Container id="main-container" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.getAttribute("id")).toBe("main-container");
    });

    test("passes through role attribute", () => {
      const { container } = render(
        <Container role="main" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.getAttribute("role")).toBe("main");
    });

    test("passes through title attribute", () => {
      const { container } = render(
        <Container title="Container tooltip" data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.getAttribute("title")).toBe("Container tooltip");
    });

    test("passes through style attribute as object", () => {
      const { container } = render(
        <Container style={{ marginTop: "10px" }} data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.style.marginTop).toBe("10px");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref to div element", () => {
      const divRef = { current: null as HTMLDivElement | null };
      render(
        <Container
          ref={(el) => {
            divRef.current = el;
          }}
          data-testid="container"
        />
      );
      expect(divRef.current).not.toBeNull();
      expect(divRef.current?.tagName).toBe("DIV");
    });

    test("ref is mutable", () => {
      let refCallCount = 0;
      render(
        <Container
          ref={() => {
            refCallCount++;
          }}
          data-testid="container"
        />
      );
      expect(refCallCount).toBeGreaterThan(0);
    });
  });

  describe("display name", () => {
    test("has correct display name for debugging", () => {
      expect(Container.displayName).toBe("Container");
    });
  });

  describe("prop combinations", () => {
    test("combines size, className, and html attributes", () => {
      const { container } = render(
        <Container
          size="md"
          className="custom-bg"
          data-testid="container"
          aria-label="Content area"
        />
      );
      const div = container.querySelector("div");
      expect(div?.className).toContain("max-w-5xl");
      expect(div?.className).toContain("custom-bg");
      expect(div?.className).toContain("mx-auto");
      expect(div?.getAttribute("aria-label")).toBe("Content area");
    });

    test("all size variants work with custom className", () => {
      const sizes: Array<"sm" | "md" | "lg" | "full"> = [
        "sm",
        "md",
        "lg",
        "full",
      ];
      const expectedClasses = {
        sm: "max-w-3xl",
        md: "max-w-5xl",
        lg: "max-w-7xl",
        full: "max-w-none",
      };

      sizes.forEach((size) => {
        const { container } = render(
          <Container
            size={size}
            className="my-custom"
            data-testid="container"
          />
        );
        const div = container.querySelector("div");
        expect(div?.className).toContain(expectedClasses[size]);
        expect(div?.className).toContain("my-custom");
      });
    });

    test("children render correctly with all size variants", () => {
      const sizes: Array<"sm" | "md" | "lg" | "full"> = [
        "sm",
        "md",
        "lg",
        "full",
      ];

      sizes.forEach((size) => {
        const { getByText } = render(
          <Container size={size}>
            <div>Content for {size}</div>
          </Container>
        );
        expect(getByText(`Content for ${size}`)).toBeDefined();
      });
    });

    test("complex children with custom className and size", () => {
      const { getByText, getByRole } = render(
        <Container size="md" className="custom-container">
          <h1>Title</h1>
          <p>Paragraph</p>
          <button>Action</button>
        </Container>
      );
      expect(getByText("Title")).toBeDefined();
      expect(getByText("Paragraph")).toBeDefined();
      expect(getByRole("button")).toBeDefined();
    });
  });

  describe("edge cases", () => {
    test("handles undefined size prop (uses default)", () => {
      const { container } = render(
        <Container size={undefined} data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.className).toContain("max-w-7xl");
    });

    test("renders with null children", () => {
      const { container } = render(<Container>{null}</Container>);
      const div = container.querySelector("div");
      expect(div).toBeDefined();
    });

    test("renders with undefined children", () => {
      const { container } = render(<Container>{undefined}</Container>);
      const div = container.querySelector("div");
      expect(div).toBeDefined();
    });

    test("renders with false children (React falsy)", () => {
      const { container } = render(<Container>{false}</Container>);
      const div = container.querySelector("div");
      expect(div).toBeDefined();
    });

    test("handles deeply nested children", () => {
      const { getByText } = render(
        <Container>
          <div>
            <div>
              <div>
                <span>Deeply Nested</span>
              </div>
            </div>
          </div>
        </Container>
      );
      expect(getByText("Deeply Nested")).toBeDefined();
    });

    test("forwards all HTML div attributes", () => {
      const { container } = render(
        <Container tabIndex={-1} data-testid="container" />
      );
      const div = container.querySelector("div");
      expect(div?.tabIndex).toBe(-1);
    });
  });

  describe("mutant killing scenarios", () => {
    test("verifies size variant selection is correct - sm", () => {
      const { container: smContainer } = render(
        <Container size="sm" data-testid="container" />
      );
      const smDiv = smContainer.querySelector("div");
      // Must be max-w-3xl, not other values
      expect(smDiv?.className).toContain("max-w-3xl");
      expect(smDiv?.className).not.toContain("max-w-5xl");
      expect(smDiv?.className).not.toContain("max-w-7xl");
      expect(smDiv?.className).not.toContain("max-w-none");
    });

    test("verifies size variant selection is correct - md", () => {
      const { container: mdContainer } = render(
        <Container size="md" data-testid="container" />
      );
      const mdDiv = mdContainer.querySelector("div");
      // Must be max-w-5xl, not other values
      expect(mdDiv?.className).toContain("max-w-5xl");
      expect(mdDiv?.className).not.toContain("max-w-3xl");
      expect(mdDiv?.className).not.toContain("max-w-7xl");
      expect(mdDiv?.className).not.toContain("max-w-none");
    });

    test("verifies size variant selection is correct - lg", () => {
      const { container: lgContainer } = render(
        <Container size="lg" data-testid="container" />
      );
      const lgDiv = lgContainer.querySelector("div");
      // Must be max-w-7xl, not other values
      expect(lgDiv?.className).toContain("max-w-7xl");
      expect(lgDiv?.className).not.toContain("max-w-3xl");
      expect(lgDiv?.className).not.toContain("max-w-5xl");
      expect(lgDiv?.className).not.toContain("max-w-none");
    });

    test("verifies size variant selection is correct - full", () => {
      const { container: fullContainer } = render(
        <Container size="full" data-testid="container" />
      );
      const fullDiv = fullContainer.querySelector("div");
      // Must be max-w-none, not other values
      expect(fullDiv?.className).toContain("max-w-none");
      expect(fullDiv?.className).not.toContain("max-w-3xl");
      expect(fullDiv?.className).not.toContain("max-w-5xl");
      expect(fullDiv?.className).not.toContain("max-w-7xl");
    });

    test("verifies default size is lg not md", () => {
      const { container: defaultContainer } = render(
        <Container data-testid="container" />
      );
      const defaultDiv = defaultContainer.querySelector("div");
      expect(defaultDiv?.className).toContain("max-w-7xl");
      expect(defaultDiv?.className).not.toContain("max-w-5xl");
    });

    test("verifies default size is lg not sm", () => {
      const { container: defaultContainer } = render(
        <Container data-testid="container" />
      );
      const defaultDiv = defaultContainer.querySelector("div");
      expect(defaultDiv?.className).toContain("max-w-7xl");
      expect(defaultDiv?.className).not.toContain("max-w-3xl");
    });

    test("verifies className merging happens - custom wins on conflicts", () => {
      const { container } = render(
        <Container className="max-w-2xl" data-testid="container" />
      );
      const div = container.querySelector("div");
      // Custom className should be present
      expect(div?.className).toContain("max-w-2xl");
      // And base classes should still be there
      expect(div?.className).toContain("mx-auto");
      expect(div?.className).toContain("w-full");
    });

    test("verifies children are rendered in correct order", () => {
      const { container } = render(
        <Container>
          <span id="first">First</span>
          <span id="second">Second</span>
          <span id="third">Third</span>
        </Container>
      );
      const children = container.querySelectorAll("span");
      expect(children.length).toBe(3);
      expect(children[0]?.id).toBe("first");
      expect(children[1]?.id).toBe("second");
      expect(children[2]?.id).toBe("third");
    });

    test("verifies ref points to the div not a child", () => {
      const divRef = { current: null as HTMLDivElement | null };
      render(
        <Container
          ref={(el) => {
            divRef.current = el;
          }}
        >
          <span>Child</span>
        </Container>
      );
      expect(divRef.current?.tagName).toBe("DIV");
      expect(divRef.current?.children.length).toBe(1);
      expect(divRef.current?.children[0]?.tagName).toBe("SPAN");
    });
  });
});
