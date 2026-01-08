import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // Default - forest green
        default:
          "bg-primary/10 text-primary border border-primary/20",
        // Secondary - moss
        secondary:
          "bg-secondary/20 text-secondary-foreground border border-secondary/30",
        // Destructive - autumn red
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20",
        // Outline - just border
        outline:
          "border-2 border-border text-foreground bg-transparent",
        // Muted - subtle
        muted:
          "bg-muted text-muted-foreground border border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
