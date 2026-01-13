"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { ThemeToggle } from "../../primitives/theme-toggle";

interface NavProps extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

const Nav = React.forwardRef<HTMLElement, NavProps>(
  ({ className, logo, children, actions, ...props }, ref) => {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    return (
      <nav
        ref={ref}
        className={cn(
          // Base styles
          "sticky top-0 z-50 w-full",
          // Background with subtle blur
          "bg-background/95 backdrop-blur-sm",
          // Border
          "border-border border-b-2",
          className
        )}
        {...props}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-12">
          {/* Logo */}
          <div className="flex items-center gap-8">
            {logo || (
              <span className="font-display text-xl font-medium tracking-tight">
                Vamsa
              </span>
            )}
            {/* Desktop nav links - only show at lg (1024px+) to leave room for actions */}
            {children && (
              <div className="hidden items-center gap-1 lg:flex">
                {children}
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop actions - only show at lg (1024px+) with nav links */}
            <div className="hidden lg:flex lg:items-center lg:gap-3">
              {actions}
            </div>
            <ThemeToggle size="sm" />
            {/* Mobile/tablet menu button - visible below lg breakpoint */}
            {children && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={cn(
                  "inline-flex items-center justify-center lg:hidden",
                  "h-9 w-9 rounded-md",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-accent",
                  "transition-colors duration-200"
                )}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
                data-testid="nav-mobile-menu-button"
              >
                {mobileMenuOpen ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile/tablet menu dropdown - visible below lg breakpoint */}
        {children && mobileMenuOpen && (
          <div className="border-border bg-background border-t lg:hidden">
            <div className="space-y-1 px-4 py-3">
              {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                  return React.cloneElement(
                    child as React.ReactElement<{ className?: string }>,
                    {
                      className: cn(
                        (child.props as { className?: string }).className,
                        "w-full justify-start"
                      ),
                    }
                  );
                }
                return child;
              })}
            </div>
            {/* Actions in mobile menu - always show below lg breakpoint */}
            {actions && (
              <div className="border-border border-t px-4 py-3">
                {actions}
              </div>
            )}
          </div>
        )}
      </nav>
    );
  }
);
Nav.displayName = "Nav";

interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
}

const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, active, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium",
          // Transition
          "transition-all duration-200 ease-out",
          // States
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent",
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
);
NavLink.displayName = "NavLink";

export { Nav, NavLink };
