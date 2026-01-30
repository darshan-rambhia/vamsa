import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../lib/utils";
import type { VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  // Improved padding (px-2.5 py-0.5 -> px-3 py-1) and added letter-spacing for better readability
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        // Default - forest green
        default: "bg-primary/20 text-primary border border-primary/30",
        // Secondary - vibrant green for "Living" status (WCAG 2 AA compliant)
        secondary:
          "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-400 dark:border-green-700",
        // Destructive - autumn red
        destructive:
          "bg-destructive/20 text-destructive border border-destructive/30",
        // Outline - warm brown for "Deceased" (WCAG 2 AA compliant, earth tones aesthetic)
        outline:
          "bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-700",
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
