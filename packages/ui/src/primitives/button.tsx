import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  // Base styles - refined with smooth transitions
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Forest green with subtle hover darken
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98]",
        // Destructive - Autumn red
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md active:scale-[0.98]",
        // Outline - Warm border with subtle fill on hover
        outline:
          "border-2 border-primary/30 bg-transparent text-foreground hover:border-primary hover:bg-primary/5 active:scale-[0.98]",
        // Secondary - Moss green, softer than primary
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md active:scale-[0.98]",
        // Ghost - Minimal, just hover effect
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        // Link - Underline style
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 py-2.5 text-sm",
        sm: "h-9 rounded-md px-6 py-2 text-sm",
        lg: "h-12 rounded-md px-9 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
