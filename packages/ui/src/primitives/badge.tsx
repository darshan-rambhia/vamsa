import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  // Improved padding (px-2.5 py-0.5 -> px-3 py-1) and added letter-spacing for better readability
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        // Default - forest green
        default: "bg-primary/20 text-primary border border-primary/30",
        // Secondary - forest green for "Living" status (WCAG 2 AA compliant)
        secondary:
          "bg-primary/15 text-primary border border-primary/40",
        // Destructive - autumn red
        destructive:
          "bg-destructive/20 text-destructive border border-destructive/30",
        // Outline - dark border for "Deceased" (WCAG 2 AA compliant)
        outline:
          "border-2 border-foreground/70 text-foreground/90 bg-background/50",
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
