import * as React from "react";
import { cn } from "../lib/utils";

interface HoverCardContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openDelay: number;
  closeDelay: number;
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(
  null
);

function useHoverCardContext() {
  const ctx = React.useContext(HoverCardContext);
  if (!ctx) {
    throw new Error("HoverCard components must be used within a HoverCard");
  }
  return ctx;
}

interface HoverCardProps {
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
}

const HoverCard = ({
  children,
  openDelay = 300,
  closeDelay = 300,
}: HoverCardProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <HoverCardContext.Provider value={{ open, setOpen, openDelay, closeDelay }}>
      <div className="relative inline-block">{children}</div>
    </HoverCardContext.Provider>
  );
};

interface HoverCardTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

const HoverCardTrigger = ({
  children,
  asChild: _asChild,
}: HoverCardTriggerProps) => {
  const ctx = useHoverCardContext();
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => ctx.setOpen(true), ctx.openDelay);
  };

  const handleMouseLeave = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => ctx.setOpen(false), ctx.closeDelay);
  };

  return (
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: "contents" }}
    >
      {children}
    </span>
  );
};

const HoverCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: "start" | "center" | "end";
    sideOffset?: number;
  }
>(
  (
    { className, children, align = "center", sideOffset = 4, ...props },
    ref
  ) => {
    const ctx = useHoverCardContext();
    const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    if (!ctx.open) return null;

    return (
      <div
        ref={ref}
        onMouseEnter={() => {
          if (closeTimer.current) clearTimeout(closeTimer.current);
        }}
        onMouseLeave={() => {
          closeTimer.current = setTimeout(
            () => ctx.setOpen(false),
            ctx.closeDelay
          );
        }}
        style={{ top: `calc(100% + ${sideOffset}px)` }}
        className={cn(
          "absolute z-50 w-64",
          "bg-popover text-popover-foreground border-border rounded-lg border-2 shadow-md",
          "p-4 outline-none",
          "animate-in fade-in-0 zoom-in-95",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "start" && "left-0",
          align === "end" && "right-0",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
HoverCardContent.displayName = "HoverCardContent";

export { HoverCard, HoverCardTrigger, HoverCardContent };
