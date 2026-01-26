/**
 * Unit Tests for Avatar Component
 */
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  describe("rendering", () => {
    test("renders avatar element", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      expect(getByTestId("avatar")).toBeDefined();
    });

    test("renders as div element", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.tagName).toBe("DIV");
    });

    test("renders with fallback text", () => {
      const { getByText } = render(<Avatar fallback="AB" />);
      expect(getByText("AB")).toBeDefined();
    });
  });

  describe("image rendering", () => {
    test("renders image element when src is provided", () => {
      const { getByRole } = render(
        <Avatar src="https://example.com/avatar.jpg" alt="User Avatar" />
      );
      const img = getByRole("img");
      expect(img).toBeDefined();
      expect(img.getAttribute("src")).toBe("https://example.com/avatar.jpg");
    });

    test("renders image with alt text", () => {
      const { getByRole } = render(
        <Avatar src="https://example.com/avatar.jpg" alt="John Doe" />
      );
      const img = getByRole("img");
      expect(img.getAttribute("alt")).toBe("John Doe");
    });

    test("renders image with default alt text when alt prop not provided", () => {
      const { getByRole } = render(
        <Avatar src="https://example.com/avatar.jpg" />
      );
      const img = getByRole("img");
      expect(img.getAttribute("alt")).toBe("Avatar");
    });

    test("applies object-cover class to image", () => {
      const { getByRole } = render(
        <Avatar src="https://example.com/avatar.jpg" />
      );
      const img = getByRole("img");
      expect(img.className).toContain("object-cover");
    });

    test("applies full width and height to image", () => {
      const { getByRole } = render(
        <Avatar src="https://example.com/avatar.jpg" />
      );
      const img = getByRole("img");
      expect(img.className).toContain("h-full");
      expect(img.className).toContain("w-full");
    });

    test("does not render image when src is null", () => {
      const { queryByRole } = render(
        <Avatar src={null} alt="User" fallback="JD" />
      );
      const img = queryByRole("img");
      expect(img).toBeNull();
    });

    test("does not render image when src is undefined", () => {
      const { queryByRole } = render(
        <Avatar alt="User" fallback="JD" />
      );
      const img = queryByRole("img");
      expect(img).toBeNull();
    });

    test("does not render image when src is empty string", () => {
      const { queryByRole } = render(
        <Avatar src="" alt="User" fallback="JD" />
      );
      const img = queryByRole("img");
      expect(img).toBeNull();
    });
  });

  describe("fallback initials", () => {
    test("renders fallback prop as initials", () => {
      const { getByText } = render(<Avatar fallback="AB" />);
      expect(getByText("AB")).toBeDefined();
    });

    test("truncates fallback to 2 characters", () => {
      const { getByText } = render(<Avatar fallback="ABCD" />);
      expect(getByText("AB")).toBeDefined();
    });

    test("converts fallback to uppercase", () => {
      const { getByText } = render(<Avatar fallback="ab" />);
      expect(getByText("AB")).toBeDefined();
    });

    test("generates initials from alt text with two words", () => {
      const { getByText } = render(<Avatar alt="John Doe" />);
      expect(getByText("JD")).toBeDefined();
    });

    test("generates initials from alt text with single word", () => {
      const { getByText } = render(<Avatar alt="John" />);
      expect(getByText("JO")).toBeDefined();
    });

    test("generates initials from first and last word with multiple spaces", () => {
      const { getByText } = render(<Avatar alt="John Michael Doe" />);
      expect(getByText("JD")).toBeDefined();
    });

    test("uses fallback over alt when both provided", () => {
      const { getByText, queryByText } = render(
        <Avatar fallback="AB" alt="John Doe" />
      );
      expect(getByText("AB")).toBeDefined();
      expect(queryByText("JD")).toBeNull();
    });

    test("renders question mark when no fallback or alt provided", () => {
      const { getByText } = render(<Avatar />);
      expect(getByText("?")).toBeDefined();
    });

    test("renders initials in span element", () => {
      const { getByText } = render(<Avatar fallback="AB" />);
      const span = getByText("AB").closest("span");
      expect(span).toBeDefined();
    });
  });

  describe("size variants", () => {
    test("applies md size by default", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("h-10");
      expect(avatar.className).toContain("w-10");
    });

    test("applies sm size classes", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" size="sm" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("h-8");
      expect(avatar.className).toContain("w-8");
    });

    test("applies md size classes", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" size="md" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("h-10");
      expect(avatar.className).toContain("w-10");
    });

    test("applies lg size classes", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" size="lg" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("h-14");
      expect(avatar.className).toContain("w-14");
    });

    test("applies xl size classes", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" size="xl" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("h-24");
      expect(avatar.className).toContain("w-24");
    });

    test("applies text size to sm", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" size="sm" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("text-xs");
    });

    test("applies text size to md", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" size="md" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("text-sm");
    });

    test("applies text size to lg", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" size="lg" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("text-lg");
    });

    test("applies text size to xl", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" size="xl" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("text-2xl");
    });
  });

  describe("base styling", () => {
    test("applies relative positioning", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("relative");
    });

    test("applies inline-flex display", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("inline-flex");
    });

    test("applies shrink-0", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("shrink-0");
    });

    test("applies items-center", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("items-center");
    });

    test("applies justify-center", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("justify-center");
    });

    test("applies overflow-hidden", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("overflow-hidden");
    });

    test("applies rounded-full", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("rounded-full");
    });

    test("applies background color", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("bg-primary/10");
    });

    test("applies text color", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("text-primary");
    });

    test("applies font-display", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("font-display");
    });

    test("applies font-medium", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("font-medium");
    });

    test("applies ring border styling", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("ring-border");
      expect(avatar.className).toContain("ring-2");
      expect(avatar.className).toContain("ring-offset-2");
    });

    test("applies ring offset background", () => {
      const { getByTestId } = render(
        <Avatar data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("ring-offset-background");
    });
  });

  describe("fallback span styling", () => {
    test("applies select-none to initials span", () => {
      const { getByText } = render(<Avatar fallback="AB" />);
      const span = getByText("AB").closest("span");
      expect(span?.className).toContain("select-none");
    });
  });

  describe("className forwarding", () => {
    test("applies custom className", () => {
      const { getByTestId } = render(
        <Avatar className="custom-class" data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("custom-class");
    });

    test("preserves base styles with custom className", () => {
      const { getByTestId } = render(
        <Avatar className="custom-class" data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("rounded-full");
      expect(avatar.className).toContain("inline-flex");
      expect(avatar.className).toContain("custom-class");
    });

    test("applies multiple custom classes", () => {
      const { getByTestId } = render(
        <Avatar
          className="custom-class1 custom-class2"
          data-testid="avatar"
          fallback="AB"
        />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.className).toContain("custom-class1");
      expect(avatar.className).toContain("custom-class2");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let avatarRef: HTMLDivElement | null = null;
      render(
        <Avatar
          ref={(el) => {
            avatarRef = el;
          }}
          fallback="AB"
        />
      );
      expect(avatarRef).not.toBeNull();
      expect(avatarRef!.tagName).toBe("DIV");
    });

    test("ref is an instance of HTMLDivElement", () => {
      let avatarRef: HTMLDivElement | null = null;
      render(
        <Avatar
          ref={(el) => {
            avatarRef = el;
          }}
          fallback="AB"
        />
      );
      expect(avatarRef).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("accessibility attributes", () => {
    test("passes through aria-label", () => {
      const { getByTestId } = render(
        <Avatar
          aria-label="User profile picture"
          data-testid="avatar"
          fallback="AB"
        />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.getAttribute("aria-label")).toBe("User profile picture");
    });

    test("passes through aria-describedby", () => {
      const { getByTestId } = render(
        <Avatar
          aria-describedby="avatar-description"
          data-testid="avatar"
          fallback="AB"
        />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.getAttribute("aria-describedby")).toBe(
        "avatar-description"
      );
    });

    test("passes through data-testid", () => {
      const { getByTestId } = render(
        <Avatar data-testid="user-avatar" fallback="AB" />
      );
      expect(getByTestId("user-avatar")).toBeDefined();
    });

    test("passes through role attribute", () => {
      const { getByTestId } = render(
        <Avatar role="img" data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.getAttribute("role")).toBe("img");
    });
  });

  describe("HTML attributes", () => {
    test("passes through id attribute", () => {
      const { getByTestId } = render(
        <Avatar id="avatar-1" data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.getAttribute("id")).toBe("avatar-1");
    });

    test("passes through title attribute", () => {
      const { getByTestId } = render(
        <Avatar title="User Avatar" data-testid="avatar" fallback="AB" />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.getAttribute("title")).toBe("User Avatar");
    });

    test("passes through style object", () => {
      const { getByTestId } = render(
        <Avatar
          style={{ margin: "10px" }}
          data-testid="avatar"
          fallback="AB"
        />
      );
      const avatar = getByTestId("avatar");
      expect(avatar.style.margin).toBe("10px");
    });
  });

  describe("edge cases", () => {
    test("handles empty fallback string by falling back to alt or question mark", () => {
      const { container } = render(<Avatar fallback="" alt="JD" />);
      const span = container.querySelector("span");
      expect(span?.textContent).toBe("JD");
    });

    test("handles single character fallback", () => {
      const { getByText } = render(<Avatar fallback="A" />);
      expect(getByText("A")).toBeDefined();
    });

    test("handles alt text with extra spaces", () => {
      const { getByText } = render(<Avatar alt="John   Doe" />);
      expect(getByText("JD")).toBeDefined();
    });

    test("handles alt text with multiple words separated by spaces", () => {
      const { getByText } = render(<Avatar alt="John Smith Jr" />);
      expect(getByText("JJ")).toBeDefined();
    });

    test("displays only first and last word initials with many words", () => {
      const { getByText } = render(
        <Avatar alt="John Michael Robert Doe" />
      );
      expect(getByText("JD")).toBeDefined();
    });
  });

  describe("conditional rendering", () => {
    test("switches from image to fallback when src is removed", () => {
      const { rerender, queryByRole, getByText } = render(
        <Avatar src="https://example.com/avatar.jpg" alt="User" fallback="AB" />
      );

      // Image should be visible
      let img = queryByRole("img");
      expect(img).toBeDefined();

      // Remove src
      rerender(<Avatar alt="User" fallback="AB" />);

      // Image should not be visible
      img = queryByRole("img");
      expect(img).toBeNull();

      // Fallback should be visible
      expect(getByText("AB")).toBeDefined();
    });

    test("switches from fallback to image when src is added", () => {
      const { rerender, queryByRole, getByText } = render(
        <Avatar alt="User" fallback="AB" />
      );

      // Fallback should be visible
      let img = queryByRole("img");
      expect(img).toBeNull();
      expect(getByText("AB")).toBeDefined();

      // Add src
      rerender(
        <Avatar
          src="https://example.com/avatar.jpg"
          alt="User"
          fallback="AB"
        />
      );

      // Image should be visible
      img = queryByRole("img");
      expect(img).toBeDefined();
    });
  });

  describe("display name", () => {
    test("has displayName set to Avatar", () => {
      expect(Avatar.displayName).toBe("Avatar");
    });
  });
});
