import * as React from "react";
import { cn } from "../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles - warm border, generous padding
          "border-input bg-background flex h-11 w-full rounded-md border-2 px-4 py-2 text-base",
          // Placeholder - muted bark brown
          "placeholder:text-muted-foreground",
          // Focus state - forest green accent
          "focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-2",
          // Hover state
          "hover:border-primary/50",
          // Transition
          "transition-all duration-200 ease-out",
          // File input styling
          "file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Disabled state
          "disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
          // Responsive text size
          "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
