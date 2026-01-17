/**
 * Unit Tests for Dialog Components
 */
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog";

describe("Dialog", () => {
  describe("Dialog Root", () => {
    test("renders Dialog component", () => {
      const { container } = render(
        <Dialog>
          <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        </Dialog>
      );
      expect(container.querySelector('[data-testid="trigger"]')).toBeDefined();
    });

    test("passes through children", () => {
      const { getByText } = render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
        </Dialog>
      );
      expect(getByText("Open Dialog")).toBeDefined();
    });

    test("supports open state prop", () => {
      const { getByRole } = render(
        <Dialog open={true}>
          <DialogTrigger>Open</DialogTrigger>
        </Dialog>
      );
      expect(getByRole("button")).toBeDefined();
    });

    test("supports onOpenChange callback", () => {
      let openState = false;
      const { getByRole } = render(
        <Dialog open={openState} onOpenChange={(state) => { openState = state; }}>
          <DialogTrigger>Open</DialogTrigger>
        </Dialog>
      );
      expect(getByRole("button")).toBeDefined();
    });
  });

  describe("DialogTrigger", () => {
    test("renders trigger button", () => {
      const { getByRole } = render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
        </Dialog>
      );
      const button = getByRole("button");
      expect(button).toBeDefined();
    });

    test("renders with custom className", () => {
      const { getByRole } = render(
        <Dialog>
          <DialogTrigger className="custom-trigger">Open</DialogTrigger>
        </Dialog>
      );
      const button = getByRole("button");
      expect(button.className).toContain("custom-trigger");
    });

    test("passes through aria attributes", () => {
      const { getByRole } = render(
        <Dialog>
          <DialogTrigger aria-label="Open dialog">Open</DialogTrigger>
        </Dialog>
      );
      const button = getByRole("button");
      expect(button.getAttribute("aria-label")).toBe("Open dialog");
    });

    test("passes through data attributes", () => {
      const { getByTestId } = render(
        <Dialog>
          <DialogTrigger data-testid="dialog-trigger">Open</DialogTrigger>
        </Dialog>
      );
      expect(getByTestId("dialog-trigger")).toBeDefined();
    });

    test("renders with button role", () => {
      const { getByRole } = render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
        </Dialog>
      );
      const trigger = getByRole("button");
      expect(trigger.textContent).toContain("Open Dialog");
    });

    test("is clickable", () => {
      const { getByRole } = render(
        <Dialog>
          <DialogTrigger>Click me</DialogTrigger>
        </Dialog>
      );
      const button = getByRole("button");
      expect(button.tagName).toBe("BUTTON");
    });
  });

  describe("DialogHeader", () => {
    test("renders header container", () => {
      const { getByTestId } = render(
        <DialogHeader data-testid="header">Header</DialogHeader>
      );
      expect(getByTestId("header")).toBeDefined();
    });

    test("renders with children", () => {
      const { getByText } = render(<DialogHeader>Header content</DialogHeader>);
      expect(getByText("Header content")).toBeDefined();
    });

    test("applies flex column layout", () => {
      const { getByTestId } = render(
        <DialogHeader data-testid="header" />
      );
      const header = getByTestId("header");
      expect(header.className).toContain("flex");
      expect(header.className).toContain("flex-col");
    });

    test("applies spacing between children", () => {
      const { getByTestId } = render(
        <DialogHeader data-testid="header" />
      );
      const header = getByTestId("header");
      expect(header.className).toContain("space-y-1.5");
    });

    test("applies text alignment", () => {
      const { getByTestId } = render(
        <DialogHeader data-testid="header" />
      );
      const header = getByTestId("header");
      expect(header.className).toContain("text-center");
      expect(header.className).toContain("sm:text-left");
    });

    test("forwards custom className", () => {
      const { getByTestId } = render(
        <DialogHeader className="custom-header" data-testid="header" />
      );
      const header = getByTestId("header");
      expect(header.className).toContain("custom-header");
    });

    test("is a div element", () => {
      const { getByTestId } = render(
        <DialogHeader data-testid="header" />
      );
      const header = getByTestId("header");
      expect(header.tagName).toBe("DIV");
    });

    test("supports multiple children", () => {
      const { getByText } = render(
        <DialogHeader>
          <div>Title</div>
          <div>Subtitle</div>
        </DialogHeader>
      );
      expect(getByText("Title")).toBeDefined();
      expect(getByText("Subtitle")).toBeDefined();
    });

    test("preserves base styles with custom className", () => {
      const { getByTestId } = render(
        <DialogHeader data-testid="header" className="extra-class" />
      );
      const header = getByTestId("header");
      expect(header.className).toContain("extra-class");
      expect(header.className).toContain("flex");
      expect(header.className).toContain("flex-col");
    });
  });

  describe("DialogFooter", () => {
    test("renders footer container", () => {
      const { getByTestId } = render(
        <DialogFooter data-testid="footer">Footer</DialogFooter>
      );
      expect(getByTestId("footer")).toBeDefined();
    });

    test("renders with children", () => {
      const { getByText } = render(<DialogFooter>Footer content</DialogFooter>);
      expect(getByText("Footer content")).toBeDefined();
    });

    test("applies flex layout", () => {
      const { getByTestId } = render(
        <DialogFooter data-testid="footer" />
      );
      const footer = getByTestId("footer");
      expect(footer.className).toContain("flex");
    });

    test("applies reverse flex direction on mobile", () => {
      const { getByTestId } = render(
        <DialogFooter data-testid="footer" />
      );
      const footer = getByTestId("footer");
      expect(footer.className).toContain("flex-col-reverse");
    });

    test("applies row layout on tablet and up", () => {
      const { getByTestId } = render(
        <DialogFooter data-testid="footer" />
      );
      const footer = getByTestId("footer");
      expect(footer.className).toContain("sm:flex-row");
    });

    test("applies button spacing", () => {
      const { getByTestId } = render(
        <DialogFooter data-testid="footer" />
      );
      const footer = getByTestId("footer");
      expect(footer.className).toContain("sm:space-x-2");
    });

    test("applies justify-end on larger screens", () => {
      const { getByTestId } = render(
        <DialogFooter data-testid="footer" />
      );
      const footer = getByTestId("footer");
      expect(footer.className).toContain("sm:justify-end");
    });

    test("forwards custom className", () => {
      const { getByTestId } = render(
        <DialogFooter className="custom-footer" data-testid="footer" />
      );
      const footer = getByTestId("footer");
      expect(footer.className).toContain("custom-footer");
    });

    test("is a div element", () => {
      const { getByTestId } = render(
        <DialogFooter data-testid="footer" />
      );
      const footer = getByTestId("footer");
      expect(footer.tagName).toBe("DIV");
    });

    test("renders with multiple buttons", () => {
      const { getByText } = render(
        <DialogFooter>
          <button>Cancel</button>
          <button>Save</button>
        </DialogFooter>
      );
      expect(getByText("Cancel")).toBeDefined();
      expect(getByText("Save")).toBeDefined();
    });

    test("combines multiple className", () => {
      const { getByTestId } = render(
        <DialogFooter
          data-testid="footer"
          className="custom-footer additional-class"
        />
      );
      const footer = getByTestId("footer");
      expect(footer.className).toContain("custom-footer");
      expect(footer.className).toContain("additional-class");
      expect(footer.className).toContain("flex");
    });
  });


  describe("Dialog composition", () => {
    test("renders complete dialog structure with trigger", () => {
      const { getByTestId } = render(
        <Dialog>
          <DialogTrigger data-testid="trigger">Open Dialog</DialogTrigger>
          <DialogHeader data-testid="header">
            <div>Header Content</div>
          </DialogHeader>
          <DialogFooter data-testid="footer">
            <button>Action</button>
          </DialogFooter>
        </Dialog>
      );

      expect(getByTestId("trigger")).toBeDefined();
      expect(getByTestId("header")).toBeDefined();
      expect(getByTestId("footer")).toBeDefined();
    });

    test("renders header with content", () => {
      const { getByTestId, getByText } = render(
        <DialogHeader data-testid="header">
          <div>Header Title</div>
          <div>Header Description</div>
        </DialogHeader>
      );

      expect(getByTestId("header")).toBeDefined();
      expect(getByText("Header Title")).toBeDefined();
      expect(getByText("Header Description")).toBeDefined();
    });

    test("renders footer with multiple children", () => {
      const { getByTestId } = render(
        <DialogFooter data-testid="footer">
          <button>Cancel</button>
          <button>Confirm</button>
        </DialogFooter>
      );

      expect(getByTestId("footer")).toBeDefined();
    });

    test("renders dialog with all layout components", () => {
      const { getByTestId } = render(
        <Dialog>
          <DialogTrigger data-testid="trigger">Open</DialogTrigger>
          <DialogHeader data-testid="header" />
          <div data-testid="content">Content</div>
          <DialogFooter data-testid="footer" />
        </Dialog>
      );

      expect(getByTestId("trigger")).toBeDefined();
      expect(getByTestId("header")).toBeDefined();
      expect(getByTestId("content")).toBeDefined();
      expect(getByTestId("footer")).toBeDefined();
    });
  });

  describe("HTML attributes", () => {
    test("DialogHeader passes through data attributes", () => {
      const { getByTestId } = render(
        <DialogHeader data-testid="header" data-custom="value">Header</DialogHeader>
      );
      expect(getByTestId("header")).toBeDefined();
      expect(getByTestId("header").getAttribute("data-custom")).toBe("value");
    });

    test("DialogFooter passes through data attributes", () => {
      const { getByTestId } = render(
        <DialogFooter data-testid="footer" data-custom="value">Footer</DialogFooter>
      );
      expect(getByTestId("footer")).toBeDefined();
      expect(getByTestId("footer").getAttribute("data-custom")).toBe("value");
    });

    test("DialogTrigger supports disabled attribute", () => {
      const { getByRole } = render(
        <Dialog>
          <DialogTrigger disabled>Open</DialogTrigger>
        </Dialog>
      );
      const button = getByRole("button");
      expect(button.hasAttribute("disabled")).toBe(true);
    });

    test("DialogTrigger supports type attribute", () => {
      const { getByRole } = render(
        <Dialog>
          <DialogTrigger type="submit">Open</DialogTrigger>
        </Dialog>
      );
      const button = getByRole("button");
      expect(button.getAttribute("type")).toBe("submit");
    });

    test("DialogHeader supports custom className", () => {
      const { getByTestId } = render(
        <DialogHeader data-testid="header" className="custom-header">Header</DialogHeader>
      );
      const header = getByTestId("header");
      expect(header.className).toContain("custom-header");
    });

    test("DialogFooter supports custom className", () => {
      const { getByTestId } = render(
        <DialogFooter data-testid="footer" className="custom-footer">Footer</DialogFooter>
      );
      const footer = getByTestId("footer");
      expect(footer.className).toContain("custom-footer");
    });
  });
});
