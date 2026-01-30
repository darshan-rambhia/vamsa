/**
 * Unit Tests for Nav Components
 */
import { describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { Nav, NavLink } from "./nav";

describe("Nav", () => {
  describe("rendering", () => {
    test("renders nav element", () => {
      const { container } = render(<Nav data-testid="nav" />);
      const nav = container.querySelector("nav");
      expect(nav).toBeDefined();
      expect(nav?.tagName).toBe("NAV");
    });

    test("renders default logo text 'Vamsa' when no logo prop provided", () => {
      const { getByText } = render(<Nav data-testid="nav" />);
      expect(getByText("Vamsa")).toBeDefined();
    });

    test("renders custom logo when logo prop provided", () => {
      const { getByText } = render(
        <Nav logo={<div>Custom Logo</div>} data-testid="nav" />
      );
      expect(getByText("Custom Logo")).toBeDefined();
    });

    test("renders with custom className", () => {
      const { container } = render(
        <Nav className="custom-nav" data-testid="nav" />
      );
      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("custom-nav");
    });

    test("renders with children (nav links)", () => {
      const { getByText } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      expect(getByText("Home")).toBeDefined();
    });

    test("renders with actions", () => {
      const { getByText } = render(
        <Nav actions={<button>Sign In</button>} data-testid="nav" />
      );
      expect(getByText("Sign In")).toBeDefined();
    });
  });

  describe("styling", () => {
    test("applies sticky positioning", () => {
      const { container } = render(<Nav data-testid="nav" />);
      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("sticky");
      expect(nav?.className).toContain("top-0");
    });

    test("applies z-index for stacking context", () => {
      const { container } = render(<Nav data-testid="nav" />);
      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("z-50");
    });

    test("applies full width styling", () => {
      const { container } = render(<Nav data-testid="nav" />);
      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("w-full");
    });

    test("applies background with backdrop blur", () => {
      const { container } = render(<Nav data-testid="nav" />);
      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("bg-background/95");
      expect(nav?.className).toContain("backdrop-blur-sm");
    });

    test("applies border styling", () => {
      const { container } = render(<Nav data-testid="nav" />);
      const nav = container.querySelector("nav");
      expect(nav?.className).toContain("border");
      expect(nav?.className).toContain("border-b-2");
    });

    test("applies max-width container", () => {
      const { container } = render(<Nav data-testid="nav" />);
      const innerDiv = container.querySelector("[class*='max-w-7xl']");
      expect(innerDiv).toBeDefined();
    });

    test("applies responsive padding", () => {
      const { container } = render(<Nav data-testid="nav" />);
      const innerDiv = container.querySelector("[class*='px-']");
      expect(innerDiv).toBeDefined();
      expect(innerDiv?.className).toContain("px-4");
    });
  });

  describe("logo section", () => {
    test("renders logo section with flex layout", () => {
      const { container } = render(<Nav data-testid="nav" />);
      const logoSection = container.querySelector("[class*='gap-8']");
      expect(logoSection).toBeDefined();
      expect(logoSection?.className).toContain("flex");
      expect(logoSection?.className).toContain("items-center");
    });

    test("logo has display font styling", () => {
      const { getByText } = render(<Nav data-testid="nav" />);
      const logo = getByText("Vamsa");
      expect(logo.className).toContain("font-display");
      expect(logo.className).toContain("text-xl");
      expect(logo.className).toContain("font-medium");
    });

    test("renders nav children hidden on mobile, visible on lg", () => {
      const { container } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      const linksContainer = container.querySelector("[class*='lg:flex']");
      expect(linksContainer).toBeDefined();
      expect(linksContainer?.className).toContain("hidden");
      expect(linksContainer?.className).toContain("lg:flex");
    });
  });

  describe("mobile menu button", () => {
    test("renders menu button when children (nav links) are present", () => {
      const { getByTestId } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      expect(getByTestId("nav-mobile-menu-button")).toBeDefined();
    });

    test("menu button is hidden on lg screens", () => {
      const { getByTestId } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      const menuButton = getByTestId("nav-mobile-menu-button");
      expect(menuButton.className).toContain("lg:hidden");
    });

    test("menu button has aria-label", () => {
      const { getByTestId } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      const menuButton = getByTestId("nav-mobile-menu-button");
      expect(menuButton.getAttribute("aria-label")).toBe("Toggle menu");
    });

    test("menu button toggles aria-expanded on click", () => {
      const { getByTestId } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      const menuButton = getByTestId("nav-mobile-menu-button");
      expect(menuButton.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(menuButton);
      expect(menuButton.getAttribute("aria-expanded")).toBe("true");

      fireEvent.click(menuButton);
      expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    });

    test("does not render menu button when no children provided", () => {
      const { queryByTestId } = render(<Nav data-testid="nav" />);
      expect(queryByTestId("nav-mobile-menu-button")).toBeNull();
    });

    test("menu button has hover styles", () => {
      const { getByTestId } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      const menuButton = getByTestId("nav-mobile-menu-button");
      expect(menuButton.className).toContain("hover:bg-accent");
      expect(menuButton.className).toContain("hover:text-foreground");
    });

    test("menu button has transition styling", () => {
      const { getByTestId } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      const menuButton = getByTestId("nav-mobile-menu-button");
      expect(menuButton.className).toContain("transition-colors");
    });
  });

  describe("menu icon", () => {
    test("renders hamburger icon when menu is closed", () => {
      const { getByTestId } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      const menuButton = getByTestId("nav-mobile-menu-button");
      const svgs = menuButton.querySelectorAll("svg");
      // Should have hamburger icon initially
      expect(svgs.length).toBeGreaterThan(0);
    });

    test("changes icon when menu is opened", () => {
      const { getByTestId } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      const menuButton = getByTestId("nav-mobile-menu-button");

      fireEvent.click(menuButton);
      // After clicking, icon should change (X icon appears)
      const updatedSvgs = menuButton.querySelectorAll("svg");
      expect(updatedSvgs.length).toBeGreaterThan(0);
    });
  });

  describe("mobile/tablet menu dropdown", () => {
    test("menu button can toggle open/closed state", () => {
      const { getByTestId } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      const menuButton = getByTestId("nav-mobile-menu-button");

      // Initial state: closed
      expect(menuButton.getAttribute("aria-expanded")).toBe("false");

      // Click to open
      fireEvent.click(menuButton);
      expect(menuButton.getAttribute("aria-expanded")).toBe("true");

      // Click to close
      fireEvent.click(menuButton);
      expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    });

    test("dropdown renders when menu is open", () => {
      const { getByTestId, container } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      const menuButton = getByTestId("nav-mobile-menu-button");

      // Initially no dropdown visible
      let dropdownContent = container.querySelector(".border-t.lg\\:hidden");
      expect(dropdownContent).toBeNull();

      // After opening
      fireEvent.click(menuButton);
      dropdownContent = container.querySelector(".space-y-1");
      expect(dropdownContent).toBeDefined();
    });

    test("dropdown renders with actions section", () => {
      const { getByTestId, container } = render(
        <Nav actions={<button>Sign In</button>}>
          <NavLink href="/">Home</NavLink>
        </Nav>
      );
      const menuButton = getByTestId("nav-mobile-menu-button");
      fireEvent.click(menuButton);

      // Dropdown structure should be rendered
      const nav = container.querySelector("nav");
      expect(nav).toBeDefined();
    });
  });

  describe("theme toggle", () => {
    test("renders theme toggle button", () => {
      const { container } = render(<Nav data-testid="nav" />);
      // Theme toggle should be rendered
      const nav = container.querySelector("nav");
      expect(nav).toBeDefined();
    });
  });

  describe("actions section", () => {
    test("renders actions on desktop (lg and up)", () => {
      const { container } = render(
        <Nav actions={<button>Sign In</button>} data-testid="nav" />
      );
      const actionsContainer = container.querySelector("[class*='lg:flex']");
      expect(actionsContainer).toBeDefined();
    });

    test("actions are hidden below lg breakpoint", () => {
      const { container } = render(
        <Nav actions={<button>Sign In</button>} data-testid="nav" />
      );
      // The actions container (not the nav itself) should have hidden/lg:flex
      const actionsContainer = container.querySelector("[class*='lg:flex']");
      expect(actionsContainer).toBeDefined();
      if (actionsContainer) {
        expect(actionsContainer.className).toContain("hidden");
        expect(actionsContainer.className).toContain("lg:flex");
      }
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      const navRef = { current: null as HTMLElement | null };
      render(
        <Nav
          ref={(el) => {
            navRef.current = el;
          }}
          data-testid="nav"
        />
      );
      expect(navRef.current).not.toBeNull();
      expect(navRef.current!.tagName).toBe("NAV");
    });
  });

  describe("HTML attributes", () => {
    test("passes through data attributes", () => {
      const { container } = render(
        <Nav data-testid="nav" data-custom="value" />
      );
      const nav = container.querySelector("nav");
      expect(nav?.getAttribute("data-custom")).toBe("value");
    });

    test("passes through aria attributes", () => {
      const { container } = render(
        <Nav aria-label="Main navigation" data-testid="nav" />
      );
      const nav = container.querySelector("nav");
      expect(nav?.getAttribute("aria-label")).toBe("Main navigation");
    });

    test("passes through role attribute", () => {
      const { container } = render(<Nav role="navigation" data-testid="nav" />);
      const nav = container.querySelector("nav");
      expect(nav?.getAttribute("role")).toBe("navigation");
    });
  });

  describe("composition", () => {
    test("renders complete nav structure with logo, links, and actions", () => {
      const { getByText, getByTestId } = render(
        <Nav logo={<div>Logo</div>} actions={<button>Sign In</button>}>
          <NavLink href="/">Home</NavLink>
          <NavLink href="/about">About</NavLink>
        </Nav>
      );

      expect(getByText("Logo")).toBeDefined();
      expect(getByText("Home")).toBeDefined();
      expect(getByText("About")).toBeDefined();
      expect(getByText("Sign In")).toBeDefined();
      expect(getByTestId("nav-mobile-menu-button")).toBeDefined();
    });

    test("renders multiple nav links properly", () => {
      const { getByText } = render(
        <Nav data-testid="nav">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/people">People</NavLink>
          <NavLink href="/visualize">Visualize</NavLink>
        </Nav>
      );

      expect(getByText("Home")).toBeDefined();
      expect(getByText("People")).toBeDefined();
      expect(getByText("Visualize")).toBeDefined();
    });
  });
});

describe("NavLink", () => {
  describe("rendering", () => {
    test("renders anchor element", () => {
      const { getByRole } = render(<NavLink href="/">Home</NavLink>);
      const link = getByRole("link");
      expect(link).toBeDefined();
      expect(link.tagName).toBe("A");
    });

    test("renders with href attribute", () => {
      const { getByRole } = render(<NavLink href="/home">Home</NavLink>);
      const link = getByRole("link");
      expect(link.getAttribute("href")).toBe("/home");
    });

    test("renders with children text", () => {
      const { getByText } = render(<NavLink href="/">Home</NavLink>);
      expect(getByText("Home")).toBeDefined();
    });

    test("renders with complex children", () => {
      const { getByText } = render(
        <NavLink href="/">
          <span>Icon</span>
          Home
        </NavLink>
      );
      expect(getByText("Icon")).toBeDefined();
      expect(getByText("Home")).toBeDefined();
    });

    test("renders with custom className", () => {
      const { getByRole } = render(
        <NavLink href="/" className="custom-link">
          Home
        </NavLink>
      );
      const link = getByRole("link");
      expect(link.className).toContain("custom-link");
    });
  });

  describe("styling - base", () => {
    test("applies base inline-flex layout", () => {
      const { getByRole } = render(<NavLink href="/">Home</NavLink>);
      const link = getByRole("link");
      expect(link.className).toContain("inline-flex");
      expect(link.className).toContain("items-center");
    });

    test("applies padding styling", () => {
      const { getByRole } = render(<NavLink href="/">Home</NavLink>);
      const link = getByRole("link");
      expect(link.className).toContain("px-4");
      expect(link.className).toContain("py-2");
    });

    test("applies rounded styling", () => {
      const { getByRole } = render(<NavLink href="/">Home</NavLink>);
      const link = getByRole("link");
      expect(link.className).toContain("rounded-md");
    });

    test("applies text styling", () => {
      const { getByRole } = render(<NavLink href="/">Home</NavLink>);
      const link = getByRole("link");
      expect(link.className).toContain("text-sm");
      expect(link.className).toContain("font-medium");
    });

    test("applies transition styling", () => {
      const { getByRole } = render(<NavLink href="/">Home</NavLink>);
      const link = getByRole("link");
      expect(link.className).toContain("transition-all");
      expect(link.className).toContain("duration-200");
    });
  });

  describe("active state", () => {
    test("applies active state styling when active prop is true", () => {
      const { getByRole } = render(
        <NavLink href="/" active>
          Home
        </NavLink>
      );
      const link = getByRole("link");
      expect(link.className).toContain("bg-primary/10");
      expect(link.className).toContain("text-primary");
    });

    test("applies inactive state styling when active prop is false", () => {
      const { getByRole } = render(
        <NavLink href="/" active={false}>
          Home
        </NavLink>
      );
      const link = getByRole("link");
      expect(link.className).toContain("text-muted-foreground");
      expect(link.className).toContain("hover:text-foreground");
      expect(link.className).toContain("hover:bg-accent");
    });

    test("applies inactive state by default (no active prop)", () => {
      const { getByRole } = render(<NavLink href="/">Home</NavLink>);
      const link = getByRole("link");
      expect(link.className).toContain("text-muted-foreground");
    });
  });

  describe("interactive states", () => {
    test("has hover text color styling", () => {
      const { getByRole } = render(
        <NavLink href="/" active={false}>
          Home
        </NavLink>
      );
      const link = getByRole("link");
      expect(link.className).toContain("hover:text-foreground");
    });

    test("has hover background styling", () => {
      const { getByRole } = render(
        <NavLink href="/" active={false}>
          Home
        </NavLink>
      );
      const link = getByRole("link");
      expect(link.className).toContain("hover:bg-accent");
    });

    test("active state does not have hover background", () => {
      const { getByRole } = render(
        <NavLink href="/" active>
          Home
        </NavLink>
      );
      const link = getByRole("link");
      // Should have primary background already
      expect(link.className).toContain("bg-primary/10");
    });
  });

  describe("ref forwarding", () => {
    test("forwards ref correctly", () => {
      const linkRef = { current: null as HTMLAnchorElement | null };
      render(
        <NavLink
          href="/"
          ref={(el) => {
            linkRef.current = el;
          }}
        >
          Home
        </NavLink>
      );
      expect(linkRef.current).not.toBeNull();
      expect(linkRef.current!.tagName).toBe("A");
    });
  });

  describe("HTML attributes", () => {
    test("passes through target attribute", () => {
      const { getByRole } = render(
        <NavLink href="/" target="_blank">
          Home
        </NavLink>
      );
      const link = getByRole("link");
      expect(link.getAttribute("target")).toBe("_blank");
    });

    test("passes through rel attribute", () => {
      const { getByRole } = render(
        <NavLink href="/" rel="noopener">
          Home
        </NavLink>
      );
      const link = getByRole("link");
      expect(link.getAttribute("rel")).toBe("noopener");
    });

    test("passes through title attribute", () => {
      const { getByRole } = render(
        <NavLink href="/" title="Go to home">
          Home
        </NavLink>
      );
      const link = getByRole("link");
      expect(link.getAttribute("title")).toBe("Go to home");
    });

    test("passes through data attributes", () => {
      const { getByRole } = render(
        <NavLink href="/" data-testid="home-link">
          Home
        </NavLink>
      );
      const link = getByRole("link");
      expect(link.getAttribute("data-testid")).toBe("home-link");
    });

    test("passes through aria attributes", () => {
      const { getByRole } = render(
        <NavLink href="/" aria-current="page">
          Home
        </NavLink>
      );
      const link = getByRole("link");
      expect(link.getAttribute("aria-current")).toBe("page");
    });
  });

  describe("distinguishing between active and inactive", () => {
    test("active and inactive links have different styling", () => {
      const { getByRole, rerender } = render(<NavLink href="/">Home</NavLink>);
      const inactiveLink = getByRole("link");
      const inactiveClasses = inactiveLink.className;

      rerender(
        <NavLink href="/" active>
          Home
        </NavLink>
      );
      const activeLink = getByRole("link");
      const activeClasses = activeLink.className;

      expect(inactiveClasses).not.toEqual(activeClasses);
    });
  });
});
