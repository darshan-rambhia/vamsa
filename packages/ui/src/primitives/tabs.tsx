import * as React from "react";
import {
  Tabs as AriaTabs,
  Tab,
  TabList,
  TabPanel,
} from "react-aria-components";
import { cn } from "../lib/utils";

type TabsProps = React.ComponentProps<typeof AriaTabs> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value, onValueChange, className, ...props }, ref) => (
    <AriaTabs
      ref={ref}
      defaultSelectedKey={defaultValue}
      selectedKey={value}
      onSelectionChange={(key) => onValueChange?.(String(key))}
      className={cn("", className)}
      {...props}
    />
  )
);
Tabs.displayName = "Tabs";

type TabsListProps = React.ComponentProps<typeof TabList>;

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <TabList
      ref={ref}
      className={cn(
        "bg-muted/30 text-muted-foreground border-border/50 inline-flex h-12 items-center justify-start rounded-lg border p-1.5",
        "w-full overflow-x-auto sm:w-auto",
        className
      )}
      {...props}
    />
  )
);
TabsList.displayName = "TabsList";

type TabsTriggerProps = React.ComponentProps<typeof Tab> & {
  value: string;
};

const TabsTrigger = React.forwardRef<HTMLDivElement, TabsTriggerProps>(
  ({ value, className, ...props }, ref) => (
    <Tab
      id={value}
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap",
        "ring-offset-background transition-all duration-200 ease-out",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // Active state: prominent background, primary-tinted text, and shadow
        "data-[selected]:bg-background data-[selected]:text-primary data-[selected]:shadow-md",
        "data-[selected]:border-primary/20 data-[selected]:border",
        // Inactive state: subtle hover feedback (when not selected)
        "not-data-[selected]:hover:bg-background/50 not-data-[selected]:hover:text-foreground/80",
        className
      )}
      {...props}
    />
  )
);
TabsTrigger.displayName = "TabsTrigger";

type TabsContentProps = React.ComponentProps<typeof TabPanel> & {
  value: string;
};

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className, ...props }, ref) => (
    <TabPanel
      id={value}
      ref={ref}
      shouldForceMount
      className={cn(
        "ring-offset-background mt-6",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        // Hide inert (non-active) panels
        "data-[inert]:hidden",
        className
      )}
      {...props}
    />
  )
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
