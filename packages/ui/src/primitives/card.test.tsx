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
      expect(card.className).toContain("border");
      expect(card.className).toContain("shadow");
    });

    test("has hover styles", () => {
      const { getByTestId } = render(<Card data-testid="card">Content</Card>);
      const card = getByTestId("card");
      expect(card.className).toContain("hover:");
    });

    test("has transition styles", () => {
      const { getByTestId } = render(<Card data-testid="card">Content</Card>);
      const card = getByTestId("card");
      expect(card.className).toContain("transition");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let cardRef: HTMLDivElement | null = null;
      render(<Card ref={(el) => (cardRef = el)}>Content</Card>);
      expect(cardRef).toBeInstanceOf(HTMLDivElement);
    });
  });
});

describe("CardHeader", () => {
  test("renders header element", () => {
    const { getByTestId } = render(<CardHeader data-testid="header">Header</CardHeader>);
    expect(getByTestId("header")).toBeDefined();
  });

  test("renders with children", () => {
    const { getByText } = render(<CardHeader>Header Content</CardHeader>);
    expect(getByText("Header Content")).toBeDefined();
  });

  test("applies base styles with padding", () => {
    const { getByTestId } = render(<CardHeader data-testid="header">Header</CardHeader>);
    const header = getByTestId("header");
    expect(header.className).toContain("p-6");
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
    render(<CardHeader ref={(el) => (headerRef = el)}>Header</CardHeader>);
    expect(headerRef).toBeInstanceOf(HTMLDivElement);
  });
});

describe("CardTitle", () => {
  test("renders heading element", () => {
    const { getByRole } = render(<CardTitle>Title</CardTitle>);
    expect(getByRole("heading")).toBeDefined();
  });

  test("renders h3 by default", () => {
    const { getByTestId } = render(<CardTitle data-testid="title">Title</CardTitle>);
    const title = getByTestId("title");
    expect(title.tagName).toBe("H3");
  });

  test("renders with children", () => {
    const { getByText } = render(<CardTitle>My Card Title</CardTitle>);
    expect(getByText("My Card Title")).toBeDefined();
  });

  test("applies font styles", () => {
    const { getByTestId } = render(<CardTitle data-testid="title">Title</CardTitle>);
    const title = getByTestId("title");
    expect(title.className).toContain("font-display");
    expect(title.className).toContain("font-medium");
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
    render(<CardTitle ref={(el) => (titleRef = el)}>Title</CardTitle>);
    expect(titleRef).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe("CardDescription", () => {
  test("renders paragraph element", () => {
    const { getByTestId } = render(<CardDescription data-testid="desc">Description</CardDescription>);
    const desc = getByTestId("desc");
    expect(desc.tagName).toBe("P");
  });

  test("renders with children", () => {
    const { getByText } = render(<CardDescription>Card description text</CardDescription>);
    expect(getByText("Card description text")).toBeDefined();
  });

  test("applies muted text style", () => {
    const { getByTestId } = render(<CardDescription data-testid="desc">Description</CardDescription>);
    const desc = getByTestId("desc");
    expect(desc.className).toContain("text-muted-foreground");
  });

  test("applies small text size", () => {
    const { getByTestId } = render(<CardDescription data-testid="desc">Description</CardDescription>);
    const desc = getByTestId("desc");
    expect(desc.className).toContain("text-sm");
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
      <CardDescription ref={(el) => (descRef = el)}>Description</CardDescription>
    );
    expect(descRef).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe("CardContent", () => {
  test("renders content element", () => {
    const { getByTestId } = render(<CardContent data-testid="content">Content</CardContent>);
    expect(getByTestId("content")).toBeDefined();
  });

  test("renders with children", () => {
    const { getByText } = render(<CardContent>Main content here</CardContent>);
    expect(getByText("Main content here")).toBeDefined();
  });

  test("applies padding styles", () => {
    const { getByTestId } = render(<CardContent data-testid="content">Content</CardContent>);
    const content = getByTestId("content");
    expect(content.className).toContain("p-6");
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
    render(<CardContent ref={(el) => (contentRef = el)}>Content</CardContent>);
    expect(contentRef).toBeInstanceOf(HTMLDivElement);
  });
});

describe("CardFooter", () => {
  test("renders footer element", () => {
    const { getByTestId } = render(<CardFooter data-testid="footer">Footer</CardFooter>);
    expect(getByTestId("footer")).toBeDefined();
  });

  test("renders with children", () => {
    const { getByText } = render(<CardFooter>Footer content</CardFooter>);
    expect(getByText("Footer content")).toBeDefined();
  });

  test("applies flex styles for actions", () => {
    const { getByTestId } = render(<CardFooter data-testid="footer">Footer</CardFooter>);
    const footer = getByTestId("footer");
    expect(footer.className).toContain("flex");
    expect(footer.className).toContain("items-center");
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
    render(<CardFooter ref={(el) => (footerRef = el)}>Footer</CardFooter>);
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
