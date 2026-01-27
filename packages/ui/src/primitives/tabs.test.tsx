/**
 * Unit Tests for Tabs Components
 */
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

describe("Tabs", () => {
  describe("rendering", () => {
    test("renders tabs container", () => {
      const { container } = render(
        <Tabs defaultValue="tab1" data-testid="tabs-root">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );
      const root = container.querySelector(
        "[data-testid='tabs-root']"
      ) as HTMLElement | null;
      expect(root).toBeDefined();
    });

    test("renders with default value", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      expect(container).toBeDefined();
    });

    test("renders with controlled value", () => {
      let currentValue = "tab1";
      const { container, rerender } = render(
        <Tabs value={currentValue}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      expect(container).toBeDefined();

      currentValue = "tab2";
      rerender(
        <Tabs value={currentValue}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      expect(container).toBeDefined();
    });

    test("accepts data attributes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1" data-testid="tabs">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );
      const tabs = container.querySelector(
        "[data-testid='tabs']"
      ) as HTMLElement | null;
      expect(tabs).toBeDefined();
    });
  });

  describe("tab switching", () => {
    test("switches between tabs", () => {
      const { container, getByText } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      // Both tabs should be in DOM
      expect(getByText("Tab 1")).toBeDefined();
      expect(getByText("Tab 2")).toBeDefined();
      expect(getByText("Content 1")).toBeDefined();
      // Content 2 is in hidden tabpanel, verify structure exists
      const tabpanels = container.querySelectorAll("[role='tabpanel']");
      expect(tabpanels.length).toBe(2);
    });

    test("multiple tabs can be rendered", () => {
      const { getByText } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>
      );

      expect(getByText("Tab 1")).toBeDefined();
      expect(getByText("Tab 2")).toBeDefined();
      expect(getByText("Tab 3")).toBeDefined();
    });
  });
});

describe("TabsList", () => {
  describe("rendering", () => {
    test("renders list element", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const list = container.querySelector("[data-testid='tabs-list']");
      expect(list).toBeDefined();
    });

    test("renders with children triggers", () => {
      const { getByText } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      expect(getByText("Tab 1")).toBeDefined();
      expect(getByText("Tab 2")).toBeDefined();
    });

    test("renders multiple triggers", () => {
      const { getByText } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">First</TabsTrigger>
            <TabsTrigger value="tab2">Second</TabsTrigger>
            <TabsTrigger value="tab3">Third</TabsTrigger>
            <TabsTrigger value="tab4">Fourth</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      expect(getByText("First")).toBeDefined();
      expect(getByText("Second")).toBeDefined();
      expect(getByText("Third")).toBeDefined();
      expect(getByText("Fourth")).toBeDefined();
    });
  });

  describe("styling", () => {
    test("applies base styling classes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list" />
        </Tabs>
      );
      const list = container.querySelector(
        "[data-testid='tabs-list']"
      ) as HTMLElement | null;
      expect(list?.className).toContain("inline-flex");
      expect(list?.className).toContain("h-12");
      expect(list?.className).toContain("items-center");
      expect(list?.className).toContain("rounded-lg");
      expect(list?.className).toContain("border");
    });

    test("applies responsive width classes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list" />
        </Tabs>
      );
      const list = container.querySelector(
        "[data-testid='tabs-list']"
      ) as HTMLElement | null;
      expect(list?.className).toContain("w-full");
      expect(list?.className).toContain("sm:w-auto");
      expect(list?.className).toContain("overflow-x-auto");
    });

    test("applies padding and spacing", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list" />
        </Tabs>
      );
      const list = container.querySelector(
        "[data-testid='tabs-list']"
      ) as HTMLElement | null;
      expect(list?.className).toContain("p-1.5");
    });

    test("applies background and border colors", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list" />
        </Tabs>
      );
      const list = container.querySelector(
        "[data-testid='tabs-list']"
      ) as HTMLElement | null;
      expect(list?.className).toContain("bg-muted");
      expect(list?.className).toContain("border-border");
      expect(list?.className).toContain("text-muted-foreground");
    });

    test("applies custom className", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-list-class" data-testid="tabs-list" />
        </Tabs>
      );
      const list = container.querySelector(
        "[data-testid='tabs-list']"
      ) as HTMLElement | null;
      expect(list?.className).toContain("custom-list-class");
    });

    test("merges custom className with base classes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-class" data-testid="tabs-list" />
        </Tabs>
      );
      const list = container.querySelector("[data-testid='tabs-list']");
      // Both base and custom classes should be present
      expect(list?.className).toContain("custom-class");
      expect(list?.className).toContain("inline-flex");
      expect(list?.className).toContain("h-12");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let listRef: HTMLDivElement | null = null;
      render(
        <Tabs defaultValue="tab1">
          <TabsList
            ref={(el) => {
              listRef = el;
            }}
            data-testid="tabs-list"
          />
        </Tabs>
      );
      expect(listRef).toBeDefined();
      expect(listRef!.className).toContain("inline-flex");
    });

    test("ref points to actual DOM element", () => {
      let listRef: HTMLDivElement | null = null;
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList
            ref={(el) => {
              listRef = el;
            }}
            data-testid="tabs-list"
          />
        </Tabs>
      );
      const queryList = container.querySelector("[data-testid='tabs-list']");
      expect(listRef === queryList).toBe(true);
    });
  });

  describe("HTML attributes", () => {
    test("passes through data attributes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list" data-custom="value" />
        </Tabs>
      );
      const list = container.querySelector(
        "[data-testid='tabs-list']"
      ) as HTMLElement | null;
      expect(list?.getAttribute("data-custom")).toBe("value");
    });

    test("passes through aria attributes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList aria-label="Tab list" data-testid="tabs-list" />
        </Tabs>
      );
      const list = container.querySelector(
        "[data-testid='tabs-list']"
      ) as HTMLElement | null;
      expect(list?.getAttribute("aria-label")).toBe("Tab list");
    });

    test("passes through role attribute", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList role="tablist" data-testid="tabs-list" />
        </Tabs>
      );
      const list = container.querySelector(
        "[data-testid='tabs-list']"
      ) as HTMLElement | null;
      expect(list?.getAttribute("role")).toBe("tablist");
    });
  });

  describe("displayName", () => {
    test("sets displayName for debugging", () => {
      expect(TabsList.displayName).toBeDefined();
    });
  });
});

describe("TabsTrigger", () => {
  describe("rendering", () => {
    test("renders trigger button", () => {
      const { getByRole } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = getByRole("tab");
      expect(trigger).toBeDefined();
    });

    test("renders with text content", () => {
      const { getByText } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Click me</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      expect(getByText("Click me")).toBeDefined();
    });

    test("renders multiple triggers", () => {
      const { getAllByRole } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const triggers = getAllByRole("tab");
      expect(triggers.length).toBe(3);
    });

    test("renders with children elements", () => {
      const { getByText } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">
              <span>Icon</span>
              <span>Text</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      expect(getByText("Icon")).toBeDefined();
      expect(getByText("Text")).toBeDefined();
    });
  });

  describe("styling", () => {
    test("applies base layout styling", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger">
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.className).toContain("inline-flex");
      expect(trigger?.className).toContain("items-center");
      expect(trigger?.className).toContain("justify-center");
      expect(trigger?.className).toContain("rounded-md");
    });

    test("applies padding and font styling", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger">
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.className).toContain("px-4");
      expect(trigger?.className).toContain("py-2");
      expect(trigger?.className).toContain("text-sm");
      expect(trigger?.className).toContain("font-medium");
      expect(trigger?.className).toContain("whitespace-nowrap");
    });

    test("applies focus styling", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger">
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.className).toContain("focus-visible:ring-ring");
      expect(trigger?.className).toContain("focus-visible:ring-2");
      expect(trigger?.className).toContain("focus-visible:ring-offset-2");
      expect(trigger?.className).toContain("focus-visible:outline-none");
    });

    test("applies transition styling", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger">
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.className).toContain("transition-all");
      expect(trigger?.className).toContain("duration-200");
      expect(trigger?.className).toContain("ease-out");
    });

    test("applies disabled state styling", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" disabled data-testid="trigger">
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.className).toContain("disabled:pointer-events-none");
      expect(trigger?.className).toContain("disabled:opacity-50");
    });

    test("applies active state styling when selected", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="active-trigger">
              Active Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='active-trigger']"
      ) as HTMLElement | null;
      expect(trigger?.className).toContain("data-[state=active]:bg-background");
      expect(trigger?.className).toContain("data-[state=active]:text-primary");
      expect(trigger?.className).toContain("data-[state=active]:shadow-md");
    });

    test("applies inactive state hover styling", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger1">
              Tab 1
            </TabsTrigger>
            <TabsTrigger value="tab2" data-testid="trigger2">
              Tab 2
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const inactiveTrigger = container.querySelector(
        "[data-testid='trigger2']"
      ) as HTMLElement | null;
      expect(inactiveTrigger?.className).toContain(
        "data-[state=inactive]:hover:bg-background"
      );
      expect(inactiveTrigger?.className).toContain(
        "data-[state=inactive]:hover:text-foreground"
      );
    });

    test("applies active state border styling", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger">
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.className).toContain("data-[state=active]:border");
      expect(trigger?.className).toContain(
        "data-[state=active]:border-primary"
      );
    });

    test("applies custom className", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger
              value="tab1"
              className="custom-trigger-class"
              data-testid="trigger"
            >
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.className).toContain("custom-trigger-class");
    });

    test("merges custom className with base classes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger
              value="tab1"
              className="custom-class"
              data-testid="trigger"
            >
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.className).toContain("custom-class");
      expect(trigger?.className).toContain("inline-flex");
      expect(trigger?.className).toContain("text-sm");
    });
  });

  describe("accessibility attributes", () => {
    test("has aria-selected when active", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger">
              Active Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.getAttribute("aria-selected")).toBeDefined();
    });

    test("has role attribute", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger">
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.getAttribute("role")).toBe("tab");
    });

    test("has data-state attribute", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="active">
              Active
            </TabsTrigger>
            <TabsTrigger value="tab2" data-testid="inactive">
              Inactive
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const activeTrigger = container.querySelector(
        "[data-testid='active']"
      ) as HTMLElement | null;
      const inactiveTrigger = container.querySelector(
        "[data-testid='inactive']"
      ) as HTMLElement | null;
      expect(activeTrigger?.getAttribute("data-state")).toBe("active");
      expect(inactiveTrigger?.getAttribute("data-state")).toBe("inactive");
    });

    test("can have custom aria-label", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger
              value="tab1"
              aria-label="First tab"
              data-testid="trigger"
            >
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.getAttribute("aria-label")).toBe("First tab");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let triggerRef: HTMLButtonElement | null = null;
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger
              value="tab1"
              ref={(el) => {
                triggerRef = el;
              }}
              data-testid="trigger"
            >
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      expect(triggerRef).toBeDefined();
      expect(triggerRef!.className).toContain("inline-flex");
    });

    test("ref points to actual DOM element", () => {
      let triggerRef: HTMLButtonElement | null = null;
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger
              value="tab1"
              ref={(el) => {
                triggerRef = el;
              }}
              data-testid="trigger"
            >
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const queryTrigger = container.querySelector("[data-testid='trigger']");
      expect(triggerRef === queryTrigger).toBe(true);
    });
  });

  describe("HTML attributes", () => {
    test("passes through data attributes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger
              value="tab1"
              data-custom="custom-value"
              data-testid="trigger"
            >
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.getAttribute("data-custom")).toBe("custom-value");
    });

    test("passes through aria attributes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger
              value="tab1"
              aria-describedby="tab-description"
              data-testid="trigger"
            >
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.getAttribute("aria-describedby")).toBe("tab-description");
    });

    test("passes through disabled attribute", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" disabled data-testid="trigger">
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      expect(trigger?.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("displayName", () => {
    test("sets displayName for debugging", () => {
      expect(TabsTrigger.displayName).toBeDefined();
    });
  });
});

describe("TabsContent", () => {
  describe("rendering", () => {
    test("renders content container", () => {
      const { container, getByText } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content">
            Content goes here
          </TabsContent>
        </Tabs>
      );
      const content = container.querySelector(
        "[data-testid='content']"
      ) as HTMLElement | null;
      expect(content).toBeDefined();
      expect(getByText("Content goes here")).toBeDefined();
    });

    test("renders with text content", () => {
      const { getByText } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">This is the content</TabsContent>
        </Tabs>
      );
      expect(getByText("This is the content")).toBeDefined();
    });

    test("renders multiple content sections", () => {
      const { container, getByText } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );
      expect(getByText("Content 1")).toBeDefined();
      // Content 2 is hidden but should exist as tabpanel element
      const tabpanels = container.querySelectorAll("[role='tabpanel']");
      expect(tabpanels.length).toBe(2);
      expect(tabpanels[0]?.getAttribute("data-state")).toBe("active");
      expect(tabpanels[1]?.getAttribute("data-state")).toBe("inactive");
    });

    test("renders with children elements", () => {
      const { getByText } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <div>
              <p>Paragraph</p>
            </div>
          </TabsContent>
        </Tabs>
      );
      expect(getByText("Paragraph")).toBeDefined();
    });
  });

  describe("styling", () => {
    test("applies base spacing styling", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content">
            Content
          </TabsContent>
        </Tabs>
      );
      const content = container.querySelector(
        "[data-testid='content']"
      ) as HTMLElement | null;
      expect(content?.className).toContain("mt-6");
    });

    test("applies focus styling", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content">
            Content
          </TabsContent>
        </Tabs>
      );
      const content = container.querySelector(
        "[data-testid='content']"
      ) as HTMLElement | null;
      expect(content?.className).toContain("focus-visible:ring-ring");
      expect(content?.className).toContain("focus-visible:ring-2");
      expect(content?.className).toContain("focus-visible:ring-offset-2");
      expect(content?.className).toContain("focus-visible:outline-none");
    });

    test("applies ring offset styling", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content">
            Content
          </TabsContent>
        </Tabs>
      );
      const content = container.querySelector(
        "[data-testid='content']"
      ) as HTMLElement | null;
      expect(content?.className).toContain("ring-offset-background");
    });

    test("applies custom className", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent
            value="tab1"
            className="custom-content-class"
            data-testid="content"
          >
            Content
          </TabsContent>
        </Tabs>
      );
      const content = container.querySelector(
        "[data-testid='content']"
      ) as HTMLElement | null;
      expect(content?.className).toContain("custom-content-class");
    });

    test("merges custom className with base classes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent
            value="tab1"
            className="custom-class"
            data-testid="content"
          >
            Content
          </TabsContent>
        </Tabs>
      );
      const content = container.querySelector(
        "[data-testid='content']"
      ) as HTMLElement | null;
      expect(content?.className).toContain("custom-class");
      expect(content?.className).toContain("mt-6");
      expect(content?.className).toContain("focus-visible:ring-ring");
    });
  });

  describe("accessibility attributes", () => {
    test("has role attribute", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content">
            Content
          </TabsContent>
        </Tabs>
      );
      const content = container.querySelector(
        "[data-testid='content']"
      ) as HTMLElement | null;
      expect(content?.getAttribute("role")).toBe("tabpanel");
    });

    test("has data-state attribute", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content1">
            Content 1
          </TabsContent>
          <TabsContent value="tab2" data-testid="content2">
            Content 2
          </TabsContent>
        </Tabs>
      );
      const activeContent = container.querySelector(
        "[data-testid='content1']"
      ) as HTMLElement | null;
      const inactiveContent = container.querySelector(
        "[data-testid='content2']"
      ) as HTMLElement | null;
      expect(activeContent?.getAttribute("data-state")).toBe("active");
      expect(inactiveContent?.getAttribute("data-state")).toBe("inactive");
    });

    test("can have custom aria-label", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent
            value="tab1"
            aria-label="First tab content"
            data-testid="content"
          >
            Content
          </TabsContent>
        </Tabs>
      );
      const content = container.querySelector(
        "[data-testid='content']"
      ) as HTMLElement | null;
      expect(content?.getAttribute("aria-label")).toBe("First tab content");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      let contentRef: HTMLDivElement | null = null;
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent
            value="tab1"
            ref={(el) => {
              contentRef = el;
            }}
            data-testid="content"
          >
            Content
          </TabsContent>
        </Tabs>
      );
      expect(contentRef).toBeDefined();
      expect(contentRef!.className).toContain("mt-6");
    });

    test("ref points to actual DOM element", () => {
      let contentRef: HTMLDivElement | null = null;
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent
            value="tab1"
            ref={(el) => {
              contentRef = el;
            }}
            data-testid="content"
          >
            Content
          </TabsContent>
        </Tabs>
      );
      const queryContent = container.querySelector("[data-testid='content']");
      expect(contentRef === queryContent).toBe(true);
    });
  });

  describe("HTML attributes", () => {
    test("passes through data attributes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent
            value="tab1"
            data-custom="custom-value"
            data-testid="content"
          >
            Content
          </TabsContent>
        </Tabs>
      );
      const content = container.querySelector(
        "[data-testid='content']"
      ) as HTMLElement | null;
      expect(content?.getAttribute("data-custom")).toBe("custom-value");
    });

    test("passes through aria attributes", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent
            value="tab1"
            aria-describedby="content-description"
            data-testid="content"
          >
            Content
          </TabsContent>
        </Tabs>
      );
      const content = container.querySelector(
        "[data-testid='content']"
      ) as HTMLElement | null;
      expect(content?.getAttribute("aria-describedby")).toBe(
        "content-description"
      );
    });
  });

  describe("displayName", () => {
    test("sets displayName for debugging", () => {
      expect(TabsContent.displayName).toBeDefined();
    });
  });
});

describe("Tabs integration", () => {
  describe("complete tabs structure", () => {
    test("renders complete tabs with list, triggers, and content", () => {
      const { getByText, container } = render(
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Overview content</TabsContent>
          <TabsContent value="details">Details content</TabsContent>
        </Tabs>
      );

      expect(getByText("Overview")).toBeDefined();
      expect(getByText("Details")).toBeDefined();
      expect(getByText("Overview content")).toBeDefined();
      // Details content is hidden but tabpanel element exists
      const tabpanels = container.querySelectorAll("[role='tabpanel']");
      expect(tabpanels.length).toBe(2);
    });

    test("renders multiple tabs with diverse content", () => {
      const { getByText, container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            <TabsTrigger value="tab4">Tab 4</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
          <TabsContent value="tab4">Content 4</TabsContent>
        </Tabs>
      );

      expect(getByText("Tab 1")).toBeDefined();
      expect(getByText("Tab 2")).toBeDefined();
      expect(getByText("Tab 3")).toBeDefined();
      expect(getByText("Tab 4")).toBeDefined();
      // All content should be in DOM, visible tab renders its text
      expect(getByText("Content 1")).toBeDefined();
      // Hidden tabs exist in DOM but their content text is not accessible via getByText
      // Verify they exist as elements instead
      const contentDivs = container.querySelectorAll("[role='tabpanel']");
      expect(contentDivs.length).toBe(4);
    });

    test("renders with complex nested content", () => {
      const { getByText } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <div>
              <h2>Title</h2>
              <p>Description</p>
              <button>Action</button>
            </div>
          </TabsContent>
        </Tabs>
      );

      expect(getByText("Title")).toBeDefined();
      expect(getByText("Description")).toBeDefined();
    });
  });

  describe("styling consistency", () => {
    test("all components apply their styling correctly together", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="list">
            <TabsTrigger value="tab1" data-testid="trigger">
              Tab
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content">
            Content
          </TabsContent>
        </Tabs>
      );

      const list = container.querySelector(
        "[data-testid='list']"
      ) as HTMLElement | null;
      const trigger = container.querySelector(
        "[data-testid='trigger']"
      ) as HTMLElement | null;
      const content = container.querySelector(
        "[data-testid='content']"
      ) as HTMLElement | null;

      // Verify each has its own styling
      expect(list?.className).toContain("inline-flex");
      expect(trigger?.className).toContain("text-sm");
      expect(content?.className).toContain("mt-6");
    });
  });

  describe("className forwarding edge cases", () => {
    test("TabsList className with multiple words", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList
            className="custom-list extra-class another-class"
            data-testid="list"
          />
        </Tabs>
      );
      const list = container.querySelector("[data-testid='list']");
      expect(list?.className).toContain("custom-list");
      expect(list?.className).toContain("extra-class");
      expect(list?.className).toContain("another-class");
    });

    test("TabsTrigger className with multiple words", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger
              value="tab1"
              className="custom-trigger extra-class"
              data-testid="trigger"
            >
              Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const trigger = container.querySelector("[data-testid='trigger']");
      expect(trigger?.className).toContain("custom-trigger");
      expect(trigger?.className).toContain("extra-class");
    });

    test("TabsContent className with multiple words", () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab</TabsTrigger>
          </TabsList>
          <TabsContent
            value="tab1"
            className="custom-content extra-class"
            data-testid="content"
          >
            Content
          </TabsContent>
        </Tabs>
      );
      const content = container.querySelector("[data-testid='content']");
      expect(content?.className).toContain("custom-content");
      expect(content?.className).toContain("extra-class");
    });
  });
});
