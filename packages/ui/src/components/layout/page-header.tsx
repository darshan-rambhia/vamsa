import * as React from "react";
import { cn } from "../../lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
  ({ className, title, description, actions, ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
          className
        )}
        {...props}
      >
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground max-w-2xl text-lg">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-3">{actions}</div>
        )}
      </header>
    );
  }
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
