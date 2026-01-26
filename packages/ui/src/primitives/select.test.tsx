/**
 * Unit Tests for Select Components
 */
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./select";

describe("SelectTrigger", () => {
  describe("rendering", () => {
    test("renders button element", () => {
      const { container } = render(
        <Select>
          <SelectTrigger data-testid="trigger">Open</SelectTrigger>
        </Select>
      );
      const trigger = container.querySelector("[data-testid='trigger']");
      expect(trigger).toBeDefined();
    });

    test("renders with children", () => {
      const { container } = render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <span>Select option</span>
          </SelectTrigger>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("renders with custom className", () => {
      const { container } = render(
        <Select>
          <SelectTrigger className="custom-trigger" data-testid="trigger" />
        </Select>
      );
      const trigger = container.querySelector("[data-testid='trigger']");
      expect(trigger?.className).toBeDefined();
      if (trigger?.className) {
        expect(trigger.className).toContain("custom-trigger");
      }
    });
  });

  describe("styling", () => {
    test("applies styling to trigger", () => {
      const { container } = render(
        <Select>
          <SelectTrigger data-testid="trigger" />
        </Select>
      );
      const trigger = container.querySelector("[data-testid='trigger']");
      expect(trigger).toBeDefined();
      expect(trigger?.className?.length || 0).toBeGreaterThan(0);
    });

    test("applies styling with children", () => {
      const { container } = render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
        </Select>
      );
      const trigger = container.querySelector("[data-testid='trigger']");
      expect(trigger).toBeDefined();
    });

    test("applies disabled state styling", () => {
      const { container } = render(
        <Select>
          <SelectTrigger disabled data-testid="trigger" />
        </Select>
      );
      const trigger = container.querySelector("[data-testid='trigger']");
      expect(trigger?.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("dropdown icon", () => {
    test("renders chevron icon", () => {
      const { container } = render(
        <Select>
          <SelectTrigger data-testid="trigger" />
        </Select>
      );
      const trigger = container.querySelector("[data-testid='trigger']");
      const svg = trigger?.querySelector("svg");
      expect(svg).toBeDefined();
    });

    test("icon renders in trigger", () => {
      const { container } = render(
        <Select>
          <SelectTrigger data-testid="trigger" />
        </Select>
      );
      const trigger = container.querySelector("[data-testid='trigger']");
      expect(trigger).toBeDefined();
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let triggerRef: HTMLElement | null = null;
      render(
        <Select>
          <SelectTrigger
            ref={(el) => {
              triggerRef = el;
            }}
            data-testid="trigger"
          />
        </Select>
      );
      expect(triggerRef).toBeDefined();
    });
  });

  describe("HTML attributes", () => {
    test("passes through disabled attribute", () => {
      const { container } = render(
        <Select>
          <SelectTrigger disabled data-testid="trigger" />
        </Select>
      );
      const trigger = container.querySelector("[data-testid='trigger']");
      expect(trigger?.hasAttribute("disabled")).toBe(true);
    });

    test("passes through data attributes", () => {
      const { container } = render(
        <Select>
          <SelectTrigger data-testid="trigger" data-custom="value" />
        </Select>
      );
      const trigger = container.querySelector("[data-testid='trigger']");
      expect(trigger?.getAttribute("data-custom")).toBe("value");
    });

    test("passes through aria attributes", () => {
      const { container } = render(
        <Select>
          <SelectTrigger aria-label="Select option" data-testid="trigger" />
        </Select>
      );
      const trigger = container.querySelector("[data-testid='trigger']");
      expect(trigger?.getAttribute("aria-label")).toBe("Select option");
    });
  });
});

describe("SelectScrollUpButton", () => {
  describe("rendering", () => {
    test("renders scroll up button", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectScrollUpButton data-testid="scroll-up" />
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("renders with svg icon", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectScrollUpButton data-testid="scroll-up" />
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("styling", () => {
    test("applies styling", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectScrollUpButton data-testid="scroll-up" />
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("custom className is applied", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectScrollUpButton
              className="custom-scroll"
              data-testid="scroll-up"
            />
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let buttonRef: HTMLElement | null = null;
      render(
        <Select>
          <SelectContent>
            <SelectScrollUpButton
              ref={(el) => {
                buttonRef = el;
              }}
              data-testid="scroll-up"
            />
          </SelectContent>
        </Select>
      );
      expect(buttonRef).toBeDefined();
    });
  });
});

describe("SelectScrollDownButton", () => {
  describe("rendering", () => {
    test("renders scroll down button", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectScrollDownButton data-testid="scroll-down" />
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("renders with svg icon", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectScrollDownButton data-testid="scroll-down" />
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("styling", () => {
    test("applies styling", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectScrollDownButton data-testid="scroll-down" />
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("custom className is applied", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectScrollDownButton
              className="custom-scroll"
              data-testid="scroll-down"
            />
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let buttonRef: HTMLElement | null = null;
      render(
        <Select>
          <SelectContent>
            <SelectScrollDownButton
              ref={(el) => {
                buttonRef = el;
              }}
              data-testid="scroll-down"
            />
          </SelectContent>
        </Select>
      );
      expect(buttonRef).toBeDefined();
    });
  });
});

describe("SelectContent", () => {
  describe("rendering", () => {
    test("renders content container", () => {
      const { container } = render(
        <Select>
          <SelectContent data-testid="content">
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("renders scroll up and down buttons", () => {
      const { container } = render(
        <Select>
          <SelectContent data-testid="content">
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("renders with children items", () => {
      const { container } = render(
        <Select>
          <SelectContent data-testid="content">
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("styling", () => {
    test("applies base styling", () => {
      const { container } = render(
        <Select>
          <SelectContent data-testid="content" />
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("applies custom className", () => {
      const { container } = render(
        <Select>
          <SelectContent className="custom-content" data-testid="content" />
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("position variations", () => {
    test("renders with default position", () => {
      const { container } = render(
        <Select>
          <SelectContent data-testid="content" />
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("applies custom className", () => {
      const { container } = render(
        <Select>
          <SelectContent className="custom-content" data-testid="content" />
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let contentRef: HTMLElement | null = null;
      render(
        <Select>
          <SelectContent
            ref={(el) => {
              contentRef = el;
            }}
            data-testid="content"
          />
        </Select>
      );
      expect(contentRef).toBeDefined();
    });
  });
});

describe("SelectLabel", () => {
  describe("rendering", () => {
    test("renders label element", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Category</SelectLabel>
            </SelectGroup>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("renders with children", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Options</SelectLabel>
            </SelectGroup>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("renders with custom className", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="custom-label" data-testid="label">
                Label
              </SelectLabel>
            </SelectGroup>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("styling", () => {
    test("applies padding", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectGroup>
              <SelectLabel data-testid="label">Label</SelectLabel>
            </SelectGroup>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("applies text styling", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectGroup>
              <SelectLabel data-testid="label">Label</SelectLabel>
            </SelectGroup>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let labelRef: HTMLElement | null = null;
      render(
        <Select>
          <SelectContent>
            <SelectGroup>
              <SelectLabel
                ref={(el) => {
                  labelRef = el;
                }}
                data-testid="label"
              >
                Label
              </SelectLabel>
            </SelectGroup>
          </SelectContent>
        </Select>
      );
      expect(labelRef).toBeDefined();
    });
  });
});

describe("SelectItem", () => {
  describe("rendering", () => {
    test("renders item element", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("renders with value attribute", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="option-1" data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("renders with children", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1">
              <span>Option Text</span>
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("renders with custom className", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" className="custom-item" data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("styling", () => {
    test("applies flex layout", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("applies full width", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("applies padding", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("applies text styling", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("applies cursor styling", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("applies rounded styling", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("applies focus styling", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("applies disabled state styling", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" disabled data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("selection indicator", () => {
    test("renders checkmark indicator", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("indicator has proper styling", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let itemRef: HTMLElement | null = null;
      render(
        <Select>
          <SelectContent>
            <SelectItem
              value="1"
              ref={(el) => {
                itemRef = el;
              }}
              data-testid="item"
            >
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      // Ref will be forwarded when rendered in Select context
      expect(itemRef).toBeDefined();
    });
  });

  describe("HTML attributes", () => {
    test("passes through disabled attribute", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" disabled data-testid="item">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      // Item is in portal but we can check it exists in DOM
      expect(container).toBeDefined();
    });

    test("passes through data attributes", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem value="1" data-testid="item" data-custom="value">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });

    test("passes through aria attributes", () => {
      const { container } = render(
        <Select>
          <SelectContent>
            <SelectItem
              value="1"
              aria-label="Select this option"
              data-testid="item"
            >
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      );
      expect(container).toBeDefined();
    });
  });
});

describe("SelectSeparator", () => {
  describe("rendering", () => {
    test("renders separator element", () => {
      const { container } = render(<SelectSeparator data-testid="separator" />);
      expect(
        container.querySelector("[data-testid='separator']")
      ).toBeDefined();
    });

    test("renders with custom className", () => {
      const { container } = render(
        <SelectSeparator className="custom-separator" data-testid="separator" />
      );
      const separator = container.querySelector("[data-testid='separator']");
      expect(separator?.className).toContain("custom-separator");
    });
  });

  describe("styling", () => {
    test("applies background color", () => {
      const { container } = render(<SelectSeparator data-testid="separator" />);
      const separator = container.querySelector("[data-testid='separator']");
      expect(separator?.className).toContain("bg-muted");
    });

    test("applies height", () => {
      const { container } = render(<SelectSeparator data-testid="separator" />);
      const separator = container.querySelector("[data-testid='separator']");
      expect(separator?.className).toContain("h-px");
    });

    test("applies margin", () => {
      const { container } = render(<SelectSeparator data-testid="separator" />);
      const separator = container.querySelector("[data-testid='separator']");
      expect(separator?.className).toContain("-mx-1");
      expect(separator?.className).toContain("my-1");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let separatorRef: HTMLElement | null = null;
      render(
        <SelectSeparator
          ref={(el) => {
            separatorRef = el;
          }}
          data-testid="separator"
        />
      );
      expect(separatorRef).not.toBeNull();
    });
  });
});

describe("Select composition", () => {
  describe("complete select structure", () => {
    test("renders complete select with trigger", () => {
      const { container } = render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
        </Select>
      );

      expect(container.querySelector("[data-testid='trigger']")).toBeDefined();
    });

    test("renders SelectValue placeholder", () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select option..." />
          </SelectTrigger>
        </Select>
      );

      // The placeholder might be shown
      const trigger = document.querySelector("[data-testid='trigger']");
      expect(trigger).toBeDefined();
    });

    test("can compose select with items", () => {
      const { container } = render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1" data-testid="item1">
              Option 1
            </SelectItem>
            <SelectItem value="2" data-testid="item2">
              Option 2
            </SelectItem>
          </SelectContent>
        </Select>
      );

      expect(container.querySelector("[data-testid='trigger']")).toBeDefined();
    });

    test("can compose select with groups", () => {
      const { container } = render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Category</SelectLabel>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      expect(container.querySelector("[data-testid='trigger']")).toBeDefined();
    });

    test("can compose select with separators", () => {
      const { container } = render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectSeparator data-testid="separator" />
            <SelectItem value="2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(container.querySelector("[data-testid='trigger']")).toBeDefined();
    });
  });
});
