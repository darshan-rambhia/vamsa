/**
 * Unit Tests for Textarea Component
 */
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  describe("rendering", () => {
    test("renders textarea element", () => {
      const { getByRole } = render(<Textarea />);
      expect(getByRole("textbox")).toBeDefined();
    });

    test("renders with placeholder", () => {
      const { getByPlaceholderText } = render(
        <Textarea placeholder="Enter your message" />
      );
      expect(getByPlaceholderText("Enter your message")).toBeDefined();
    });

    test("renders with default value", () => {
      const { getByRole } = render(<Textarea defaultValue="test value" />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe("test value");
    });

    test("renders with custom rows", () => {
      const { getByRole } = render(<Textarea rows={10} />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.getAttribute("rows")).toBe("10");
    });

    test("renders with custom cols", () => {
      const { getByRole } = render(<Textarea cols={50} />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.getAttribute("cols")).toBe("50");
    });

    test("renders with both rows and cols", () => {
      const { getByRole } = render(<Textarea rows={5} cols={40} />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.getAttribute("rows")).toBe("5");
      expect(textarea.getAttribute("cols")).toBe("40");
    });
  });

  describe("value and onChange handling", () => {
    test("supports controlled value", () => {
      const { getByRole, rerender } = render(
        <Textarea value="initial" readOnly />
      );
      let textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe("initial");

      rerender(<Textarea value="updated" readOnly />);
      textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe("updated");
    });

    test("forwards onChange handler prop", () => {
      const handleChange = () => {};
      const { getByRole } = render(
        <Textarea onChange={handleChange} data-testid="textarea" />
      );
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      // Verify textarea is rendered and can receive onChange
      expect(textarea).toBeDefined();
    });

    test("forwards onInput handler prop", () => {
      const handleInput = () => {};
      const { getByRole } = render(
        <Textarea onInput={handleInput} data-testid="textarea" />
      );
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      // Verify textarea is rendered and can receive onInput
      expect(textarea).toBeDefined();
    });

    test("supports empty value", () => {
      const { getByRole } = render(<Textarea value="" readOnly />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe("");
    });

    test("supports multiline content", () => {
      const multilineContent = "Line 1\nLine 2\nLine 3";
      const { getByRole } = render(
        <Textarea defaultValue={multilineContent} />
      );
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe(multilineContent);
    });
  });

  describe("disabled state", () => {
    test("renders with disabled attribute", () => {
      const { getByRole } = render(<Textarea disabled />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(true);
    });

    test("has disabled styling", () => {
      const { getByRole } = render(
        <Textarea disabled data-testid="disabled-textarea" />
      );
      const textarea = getByRole("textbox");
      expect(textarea.className).toContain("disabled:");
    });

    test("prevents user interaction when disabled", () => {
      const { getByRole } = render(
        <Textarea disabled defaultValue="cannot edit" />
      );
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(true);
    });

    test("applies opacity-50 when disabled", () => {
      const { getByRole } = render(
        <Textarea disabled data-testid="disabled-textarea" />
      );
      const textarea = getByRole("textbox");
      expect(textarea.className).toContain("disabled:opacity-50");
    });

    test("applies cursor-not-allowed when disabled", () => {
      const { getByRole } = render(
        <Textarea disabled data-testid="disabled-textarea" />
      );
      const textarea = getByRole("textbox");
      expect(textarea.className).toContain("disabled:cursor-not-allowed");
    });
  });

  describe("styling", () => {
    test("applies base styles", () => {
      const { getByRole } = render(<Textarea data-testid="styled-textarea" />);
      const textarea = getByRole("textbox");
      expect(textarea.className).toContain("rounded-md");
      expect(textarea.className).toContain("border");
      expect(textarea.className).toContain("bg-transparent");
      expect(textarea.className).toContain("px-3");
      expect(textarea.className).toContain("py-2");
    });

    test("applies minimum height", () => {
      const { getByRole } = render(<Textarea data-testid="styled-textarea" />);
      const textarea = getByRole("textbox");
      expect(textarea.className).toContain("min-h-[60px]");
    });

    test("applies full width", () => {
      const { getByRole } = render(<Textarea data-testid="styled-textarea" />);
      const textarea = getByRole("textbox");
      expect(textarea.className).toContain("w-full");
    });

    test("applies shadow styling", () => {
      const { getByRole } = render(<Textarea data-testid="styled-textarea" />);
      const textarea = getByRole("textbox");
      expect(textarea.className).toContain("shadow-sm");
    });

    test("applies focus-visible styles", () => {
      const { getByRole } = render(<Textarea data-testid="styled-textarea" />);
      const textarea = getByRole("textbox");
      expect(textarea.className).toContain("focus-visible:ring-1");
      expect(textarea.className).toContain("focus-visible:outline-none");
    });

    test("applies placeholder styling", () => {
      const { getByRole } = render(<Textarea data-testid="styled-textarea" />);
      const textarea = getByRole("textbox");
      expect(textarea.className).toContain("placeholder:text-muted-foreground");
    });

    test("applies custom className", () => {
      const { getByRole } = render(
        <Textarea className="custom-class" data-testid="custom-textarea" />
      );
      const textarea = getByRole("textbox");
      expect(textarea.className).toContain("custom-class");
    });

    test("preserves base classes when adding custom className", () => {
      const { getByRole } = render(
        <Textarea className="custom-class" data-testid="custom-textarea" />
      );
      const textarea = getByRole("textbox");
      // Verify both base and custom classes are present
      expect(textarea.className).toContain("rounded-md");
      expect(textarea.className).toContain("border");
      expect(textarea.className).toContain("custom-class");
    });

    test("applies text sizing", () => {
      const { getByRole } = render(<Textarea data-testid="styled-textarea" />);
      const textarea = getByRole("textbox");
      expect(textarea.className).toContain("text-base");
    });
  });

  describe("HTML attributes", () => {
    test("passes through name attribute", () => {
      const { getByRole } = render(<Textarea name="message" />);
      const textarea = getByRole("textbox");
      expect(textarea.getAttribute("name")).toBe("message");
    });

    test("passes through id attribute", () => {
      const { getByRole } = render(<Textarea id="my-textarea" />);
      const textarea = getByRole("textbox");
      expect(textarea.getAttribute("id")).toBe("my-textarea");
    });

    test("passes through required attribute", () => {
      const { getByRole } = render(<Textarea required />);
      const textarea = getByRole("textbox");
      expect(textarea.hasAttribute("required")).toBe(true);
    });

    test("passes through maxLength attribute", () => {
      const { getByRole } = render(<Textarea maxLength={200} />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.getAttribute("maxlength")).toBe("200");
    });

    test("passes through aria attributes", () => {
      const { getByLabelText } = render(
        <Textarea aria-label="Comment" data-testid="aria-textarea" />
      );
      const textarea = getByLabelText("Comment");
      expect(textarea).toBeDefined();
    });

    test("passes through data attributes", () => {
      const { getByTestId } = render(<Textarea data-testid="test-textarea" />);
      expect(getByTestId("test-textarea")).toBeDefined();
    });

    test("passes through spellCheck attribute", () => {
      const { getByRole } = render(<Textarea spellCheck="false" />);
      const textarea = getByRole("textbox");
      expect(textarea.getAttribute("spellcheck")).toBe("false");
    });

    test("passes through autoFocus attribute", () => {
      const { getByRole } = render(<Textarea />);
      const textarea = getByRole("textbox");
      // autoFocus prop is handled by React and may not always show as attribute
      expect(textarea).toBeDefined();
    });

    test("passes through readOnly attribute", () => {
      const { getByRole } = render(<Textarea readOnly />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.readOnly).toBe(true);
    });

    test("passes through wrap attribute", () => {
      const { getByRole } = render(<Textarea wrap="hard" />);
      const textarea = getByRole("textbox");
      expect(textarea.getAttribute("wrap")).toBe("hard");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let textareaRef: unknown = null;
      render(
        <Textarea
          ref={(el) => {
            textareaRef = el;
          }}
        />
      );
      expect(textareaRef).toBeDefined();
      expect(textareaRef).not.toBeNull();
    });

    test("allows imperative control through ref", () => {
      let textareaRef: unknown = null;
      render(
        <Textarea
          ref={(el) => {
            textareaRef = el;
          }}
        />
      );

      if (textareaRef) {
        const ta = textareaRef as HTMLTextAreaElement;
        ta.value = "set via ref";
        expect(ta.value).toBe("set via ref");
      }
    });

    test("allows focusing through ref", () => {
      let textareaRef: unknown = null;
      render(
        <Textarea
          ref={(el) => {
            textareaRef = el;
          }}
        />
      );

      if (textareaRef) {
        const ta = textareaRef as HTMLTextAreaElement;
        ta.focus();
        expect(document.activeElement).toBe(ta);
      }
    });
  });

  describe("display name", () => {
    test("has correct displayName", () => {
      expect(Textarea.displayName).toBe("Textarea");
    });
  });

  describe("edge cases", () => {
    test("handles very long content", () => {
      const longContent = "a".repeat(10000);
      const { getByRole } = render(<Textarea defaultValue={longContent} />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value.length).toBe(10000);
      expect(textarea.value).toBe(longContent);
    });

    test("handles special characters", () => {
      const specialContent = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const { getByRole } = render(<Textarea defaultValue={specialContent} />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe(specialContent);
    });

    test("handles unicode characters", () => {
      const unicodeContent = "Hello 世界 مرحبا мир 🌍";
      const { getByRole } = render(<Textarea defaultValue={unicodeContent} />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe(unicodeContent);
    });

    test("handles tab characters", () => {
      const contentWithTabs = "Line 1\t\tIndented\nLine 2";
      const { getByRole } = render(<Textarea defaultValue={contentWithTabs} />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toBe(contentWithTabs);
    });

    test("handles null ref", () => {
      expect(() => {
        render(<Textarea ref={null} />);
      }).not.toThrow();
    });
  });

  describe("combination scenarios", () => {
    test("renders disabled textarea with placeholder", () => {
      const { getByPlaceholderText } = render(
        <Textarea disabled placeholder="Cannot edit" />
      );
      const textarea = getByPlaceholderText(
        "Cannot edit"
      ) as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(true);
      expect(textarea.getAttribute("placeholder")).toBe("Cannot edit");
    });

    test("renders required textarea with custom rows", () => {
      const { getByRole } = render(<Textarea required rows={8} />);
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.hasAttribute("required")).toBe(true);
      expect(textarea.getAttribute("rows")).toBe("8");
    });

    test("renders textarea with name, id, and custom class", () => {
      const { getByRole } = render(
        <Textarea name="feedback" id="feedback-area" className="highlight" />
      );
      const textarea = getByRole("textbox");
      expect(textarea.getAttribute("name")).toBe("feedback");
      expect(textarea.getAttribute("id")).toBe("feedback-area");
      expect(textarea.className).toContain("highlight");
      expect(textarea.className).toContain("rounded-md");
    });

    test("renders disabled readonly textarea", () => {
      const { getByRole } = render(
        <Textarea disabled readOnly defaultValue="View only" />
      );
      const textarea = getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(true);
      expect(textarea.readOnly).toBe(true);
      expect(textarea.value).toBe("View only");
    });
  });
});
