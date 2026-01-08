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
          "border-b-2 border-border",
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
            {/* Desktop nav links */}
            {children && (
              <div className="hidden items-center gap-1 md:flex">
                {children}
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop actions */}
            <div className="hidden sm:flex sm:items-center sm:gap-3">
              {actions}
            </div>
            <ThemeToggle size="sm" />
            {/* Mobile menu button */}
            {children && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={cn(
                  "md:hidden inline-flex items-center justify-center",
                  "h-9 w-9 rounded-md",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-accent",
                  "transition-colors duration-200"
                )}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {children && mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="px-4 py-3 space-y-1">
              {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                  return React.cloneElement(child as React.ReactElement<{ className?: string }>, {
                    className: cn(
                      (child.props as { className?: string }).className,
                      "w-full justify-start"
                    ),
                  });
                }
                return child;
              })}
            </div>
            {/* Mobile actions */}
            {actions && (
              <div className="px-4 py-3 border-t border-border sm:hidden">
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
          "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md",
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
