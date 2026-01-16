/**
 * Unit Tests for Card Components
 */
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";

describe("Card", () => {
  describe("rendering", () => {
    test("renders card element", () => {
      const { getByTestId } = render(<Card data-testid="card">Content</Card>);
      expect(getByTestId("card")).toBeDefined();
    });

    test("renders with children", () => {
      const { getByText } = render(<Card>Card Content</Card>);
      expect(getByText("Card Content")).toBeDefined();
    });

    test("renders with custom className", () => {
      const { getByTestId } = render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      );
      const card = getByTestId("card");
      expect(card.className).toContain("custom-class");
    });
  });

  describe("styling", () => {
    test("applies base styles", () => {
      const { getByTestId } = render(<Card data-testid="card">Content</Card>);
      const card = getByTestId("card");
      expect(card.className).toContain("rounded-lg");
      expect(card.className).toContain("border-2");
      expect(card.className).toContain("shadow-sm");
    });

    test("applies hover styles on hover", () => {
      const { getByTestId } = render(<Card data-testid="card">Content</Card>);
      const card = getByTestId("card");
      // Verify hover classes are present
      expect(card.className).toContain("hover:border-primary/20");
      expect(card.className).toContain("hover:shadow-md");
    });

    test("applies transition animation", () => {
      const { getByTestId } = render(<Card data-testid="card">Content</Card>);
      const card = getByTestId("card");
      // Verify full transition configuration
      expect(card.className).toContain("transition-all");
      expect(card.className).toContain("duration-300");
      expect(card.className).toContain("ease-out");
    });

    test("applies background and text color", () => {
      const { getByTestId } = render(<Card data-testid="card">Content</Card>);
      const card = getByTestId("card");
      expect(card.className).toContain("bg-card");
      expect(card.className).toContain("text-card-foreground");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let cardRef: HTMLDivElement | null = null;
      render(
        <Card
          ref={(el) => {
            cardRef = el;
          }}
        >
          Content
        </Card>
      );
      expect(cardRef).not.toBeNull();
      expect(cardRef!.tagName).toBe("DIV");
    });
  });
});

describe("CardHeader", () => {
  test("renders header element", () => {
    const { getByTestId } = render(
      <CardHeader data-testid="header">Header</CardHeader>
    );
    expect(getByTestId("header")).toBeDefined();
  });

  test("renders with children", () => {
    const { getByText } = render(<CardHeader>Header Content</CardHeader>);
    expect(getByText("Header Content")).toBeDefined();
  });

  test("applies flex layout for title and description", () => {
    const { getByTestId } = render(
      <CardHeader data-testid="header">Header</CardHeader>
    );
    const header = getByTestId("header");
    // Vertical flex layout for stacking
    expect(header.className).toContain("flex");
    expect(header.className).toContain("flex-col");
    // Spacing between children
    expect(header.className).toContain("space-y-2");
    // Padding with reduced bottom padding for content spacing
    expect(header.className).toContain("p-6");
    expect(header.className).toContain("pb-4");
  });

  test("applies custom className", () => {
    const { getByTestId } = render(
      <CardHeader className="custom-header" data-testid="header">
        Header
      </CardHeader>
    );
    const header = getByTestId("header");
    expect(header.className).toContain("custom-header");
  });

  test("forwards ref correctly", () => {
    let headerRef: HTMLDivElement | null = null;
    render(
      <CardHeader
        ref={(el) => {
          headerRef = el;
        }}
      >
        Header
      </CardHeader>
    );
    expect(headerRef).not.toBeNull();
    expect(headerRef!.tagName).toBe("DIV");
  });
});

describe("CardTitle", () => {
  test("renders heading element", () => {
    const { getByRole } = render(<CardTitle>Title</CardTitle>);
    expect(getByRole("heading")).toBeDefined();
  });

  test("renders h3 by default", () => {
    const { getByTestId } = render(
      <CardTitle data-testid="title">Title</CardTitle>
    );
    const title = getByTestId("title");
    expect(title.tagName).toBe("H3");
  });

  test("renders with children", () => {
    const { getByText } = render(<CardTitle>My Card Title</CardTitle>);
    expect(getByText("My Card Title")).toBeDefined();
  });

  test("applies typography and spacing styles", () => {
    const { getByTestId } = render(
      <CardTitle data-testid="title">Title</CardTitle>
    );
    const title = getByTestId("title");
    // Display font
    expect(title.className).toContain("font-display");
    expect(title.className).toContain("text-xl");
    // Weight and spacing
    expect(title.className).toContain("font-medium");
    expect(title.className).toContain("leading-tight");
    expect(title.className).toContain("tracking-tight");
  });

  test("renders with aria-label for accessibility", () => {
    const { getByTestId } = render(
      <CardTitle aria-label="Important Title" data-testid="title">
        Title
      </CardTitle>
    );
    const title = getByTestId("title");
    expect(title.getAttribute("aria-label")).toBe("Important Title");
  });

  test("renders sr-only text when no children provided", () => {
    const { container } = render(<CardTitle aria-label="Card title" />);
    const srOnlyText = container.querySelector(".sr-only");
    expect(srOnlyText).toBeDefined();
    expect(srOnlyText?.textContent).toBe("Card title");
  });

  test("applies custom className", () => {
    const { getByTestId } = render(
      <CardTitle className="custom-title" data-testid="title">
        Title
      </CardTitle>
    );
    const title = getByTestId("title");
    expect(title.className).toContain("custom-title");
  });

  test("forwards ref correctly", () => {
    let titleRef: HTMLHeadingElement | null = null;
    render(
      <CardTitle
        ref={(el) => {
          titleRef = el;
        }}
      >
        Title
      </CardTitle>
    );
    expect(titleRef).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe("CardDescription", () => {
  test("renders paragraph element", () => {
    const { getByTestId } = render(
      <CardDescription data-testid="desc">Description</CardDescription>
    );
    const desc = getByTestId("desc");
    expect(desc.tagName).toBe("P");
  });

  test("renders with children", () => {
    const { getByText } = render(
      <CardDescription>Card description text</CardDescription>
    );
    expect(getByText("Card description text")).toBeDefined();
  });

  test("applies muted text styling for secondary information", () => {
    const { getByTestId } = render(
      <CardDescription data-testid="desc">Description</CardDescription>
    );
    const desc = getByTestId("desc");
    // Color and size for subtle description text
    expect(desc.className).toContain("text-muted-foreground");
    expect(desc.className).toContain("text-sm");
    // Line height for readability
    expect(desc.className).toContain("leading-relaxed");
  });

  test("applies custom className", () => {
    const { getByTestId } = render(
      <CardDescription className="custom-desc" data-testid="desc">
        Description
      </CardDescription>
    );
    const desc = getByTestId("desc");
    expect(desc.className).toContain("custom-desc");
  });

  test("forwards ref correctly", () => {
    let descRef: HTMLParagraphElement | null = null;
    render(
      <CardDescription
        ref={(el) => {
          descRef = el;
        }}
      >
        Description
      </CardDescription>
    );
    expect(descRef).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe("CardContent", () => {
  test("renders content element", () => {
    const { getByTestId } = render(
      <CardContent data-testid="content">Content</CardContent>
    );
    expect(getByTestId("content")).toBeDefined();
  });

  test("renders with children", () => {
    const { getByText } = render(<CardContent>Main content here</CardContent>);
    expect(getByText("Main content here")).toBeDefined();
  });

  test("applies padding with reduced top padding", () => {
    const { getByTestId } = render(
      <CardContent data-testid="content">Content</CardContent>
    );
    const content = getByTestId("content");
    // Standard padding on sides and bottom
    expect(content.className).toContain("p-6");
    // Reduced top padding to avoid double spacing after header
    expect(content.className).toContain("pt-0");
  });

  test("applies custom className", () => {
    const { getByTestId } = render(
      <CardContent className="custom-content" data-testid="content">
        Content
      </CardContent>
    );
    const content = getByTestId("content");
    expect(content.className).toContain("custom-content");
  });

  test("forwards ref correctly", () => {
    let contentRef: HTMLDivElement | null = null;
    render(
      <CardContent
        ref={(el) => {
          contentRef = el;
        }}
      >
        Content
      </CardContent>
    );
    expect(contentRef).toBeInstanceOf(HTMLDivElement);
  });
});

describe("CardFooter", () => {
  test("renders footer element", () => {
    const { getByTestId } = render(
      <CardFooter data-testid="footer">Footer</CardFooter>
    );
    expect(getByTestId("footer")).toBeDefined();
  });

  test("renders with children", () => {
    const { getByText } = render(<CardFooter>Footer content</CardFooter>);
    expect(getByText("Footer content")).toBeDefined();
  });

  test("applies flex layout for action buttons", () => {
    const { getByTestId } = render(
      <CardFooter data-testid="footer">Footer</CardFooter>
    );
    const footer = getByTestId("footer");
    // Layout for horizontal button arrangement
    expect(footer.className).toContain("flex");
    expect(footer.className).toContain("items-center");
    // Spacing between actions
    expect(footer.className).toContain("gap-4");
    // Padding to match content area
    expect(footer.className).toContain("p-6");
    expect(footer.className).toContain("pt-0");
  });

  test("applies custom className", () => {
    const { getByTestId } = render(
      <CardFooter className="custom-footer" data-testid="footer">
        Footer
      </CardFooter>
    );
    const footer = getByTestId("footer");
    expect(footer.className).toContain("custom-footer");
  });

  test("forwards ref correctly", () => {
    let footerRef: HTMLDivElement | null = null;
    render(
      <CardFooter
        ref={(el) => {
          footerRef = el;
        }}
      >
        Footer
      </CardFooter>
    );
    expect(footerRef).toBeInstanceOf(HTMLDivElement);
  });
});

describe("Card composition", () => {
  test("renders full card with all subcomponents", () => {
    const { getByTestId, getByText } = render(
      <Card data-testid="full-card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description goes here</CardDescription>
        </CardHeader>
        <CardContent>Main content area</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    );

    expect(getByTestId("full-card")).toBeDefined();
    expect(getByText("Card Title")).toBeDefined();
    expect(getByText("Card description goes here")).toBeDefined();
    expect(getByText("Main content area")).toBeDefined();
    expect(getByText("Footer actions")).toBeDefined();
  });
});
