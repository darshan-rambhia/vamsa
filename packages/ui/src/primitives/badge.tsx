import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  // Improved padding (px-2.5 py-0.5 -> px-3 py-1) and added letter-spacing for better readability
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        // Default - forest green (for "Living")
        default: "bg-primary/15 text-primary border border-primary/25",
        // Secondary - moss green
        secondary:
          "bg-secondary/25 text-secondary-foreground border border-secondary/35",
        // Destructive - autumn red
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/25",
        // Outline - just border (for "Deceased")
        outline: "border-2 border-muted-foreground/40 text-muted-foreground bg-transparent",
        // Muted - subtle (for tab counts, etc.)
        muted: "bg-muted/80 text-muted-foreground border border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
