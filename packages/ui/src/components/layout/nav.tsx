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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8 lg:px-12">
          {/* Logo */}
          <div className="flex items-center gap-8">
            {logo || (
              <span className="font-display text-xl font-medium tracking-tight">
                Vamsa
              </span>
            )}
            {/* Nav links */}
            {children && (
              <div className="hidden items-center gap-1 md:flex">
                {children}
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {actions}
            <ThemeToggle size="sm" />
          </div>
        </div>
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
