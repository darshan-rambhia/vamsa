import * as React from "react";
import {
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  Button,
  Header,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Separator,
} from "react-aria-components";
import { cn } from "../lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Props for the Select root component.
 * Uses the same external API as the previous Radix-based Select so all
 * consumer files remain untouched.
 */
interface SelectProps {
  /** The current value (controlled). */
  value?: string;
  /** The default value (uncontrolled). */
  defaultValue?: string;
  /**
   * Handler called when the selected value changes.
   *
   * Uses method shorthand (bivariant) to match the original Radix
   * `onValueChange` signature and allow callers to pass narrower callbacks
   * such as `(type: ChartType) => void` where `ChartType extends string`.
   */
  // eslint-disable-next-line @typescript-eslint/method-signature-style
  onValueChange?(value: string): void;
  /** Whether the select is disabled. */
  disabled?: boolean;
  /** The name attribute for form submission. */
  name?: string;
  /** Whether a value is required (HTML required). */
  required?: boolean;
  /** Whether the select is open (controlled). */
  open?: boolean;
  /** Handler called when the open state changes. */
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Select (root)
// ---------------------------------------------------------------------------

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      disabled,
      name,
      required,
      open,
      onOpenChange,
      children,
      className,
    },
    ref
  ) => (
    <AriaSelect
      ref={ref}
      // Map to React Aria's value-based API
      value={value}
      defaultValue={defaultValue}
      onChange={(key) => onValueChange?.(key as string)}
      isDisabled={disabled}
      name={name}
      isRequired={required}
      isOpen={open}
      onOpenChange={onOpenChange}
      className={className}
    >
      {children}
    </AriaSelect>
  )
);
Select.displayName = "Select";

// ---------------------------------------------------------------------------
// SelectGroup — maps to ListBoxSection
// ---------------------------------------------------------------------------

const SelectGroup = React.forwardRef<
  HTMLElement,
  React.ComponentProps<typeof ListBoxSection>
>(({ className, children, ...props }, ref) => (
  <ListBoxSection ref={ref} className={className} {...props}>
    {children}
  </ListBoxSection>
));
SelectGroup.displayName = "SelectGroup";

// ---------------------------------------------------------------------------
// SelectValue — thin wrapper around AriaSelectValue
// ---------------------------------------------------------------------------

interface SelectValueProps {
  placeholder?: string;
  className?: string;
  /**
   * Optional custom content to render instead of the selected text.
   * When provided, it takes precedence over the default placeholder/selectedText rendering.
   */
  children?: React.ReactNode;
}

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, children }, ref) => (
    <AriaSelectValue
      ref={ref}
      className={cn(
        "data-[placeholder]:text-muted-foreground pointer-events-none block truncate",
        className
      )}
    >
      {children !== undefined
        ? () => children
        : ({ isPlaceholder, selectedText }) =>
            isPlaceholder ? (placeholder ?? "") : selectedText}
    </AriaSelectValue>
  )
);
SelectValue.displayName = "SelectValue";

// ---------------------------------------------------------------------------
// SelectTrigger — wraps React Aria's Button (the select trigger slot)
// ---------------------------------------------------------------------------

interface SelectTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, disabled, ...props }, ref) => (
    <Button
      ref={ref}
      isDisabled={disabled}
      className={cn(
        "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...(props as Omit<
        React.ComponentProps<typeof Button>,
        "className" | "isDisabled"
      >)}
    >
      {children}
      <svg
        className="h-4 w-4 shrink-0 opacity-50"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
        />
      </svg>
    </Button>
  )
);
SelectTrigger.displayName = "SelectTrigger";

// ---------------------------------------------------------------------------
// SelectContent — wraps Popover + ListBox
// ---------------------------------------------------------------------------

interface SelectContentProps {
  className?: string;
  children?: React.ReactNode;
  /**
   * Position prop accepted for API compatibility. React Aria handles
   * positioning automatically.
   */
  position?: "popper" | "item-aligned";
}

const SelectContent = React.forwardRef<HTMLElement, SelectContentProps>(
  ({ className, children, position: _position }, ref) => (
    <Popover
      ref={ref}
      className={cn(
        "bg-popover text-popover-foreground entering:animate-in entering:fade-in-0 entering:zoom-in-95 exiting:animate-out exiting:fade-out-0 exiting:zoom-out-95 placement-bottom:slide-in-from-top-2 placement-left:slide-in-from-right-2 placement-right:slide-in-from-left-2 placement-top:slide-in-from-bottom-2 relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border shadow-md outline-none",
        className
      )}
    >
      <ListBox className="p-1 outline-none">{children}</ListBox>
    </Popover>
  )
);
SelectContent.displayName = "SelectContent";

// ---------------------------------------------------------------------------
// SelectLabel — wraps React Aria's Header
// ---------------------------------------------------------------------------

interface SelectLabelProps extends React.HTMLAttributes<HTMLElement> {}

const SelectLabel = React.forwardRef<HTMLElement, SelectLabelProps>(
  ({ className, ...props }, ref) => (
    <Header
      ref={ref}
      className={cn("py-1.5 pr-2 pl-8 text-sm font-semibold", className)}
      {...props}
    />
  )
);
SelectLabel.displayName = "SelectLabel";

// ---------------------------------------------------------------------------
// SelectItem — wraps ListBoxItem, translates `value` → `id`
// ---------------------------------------------------------------------------

interface SelectItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "id"
> {
  value: string;
  disabled?: boolean;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled, ...props }, ref) => (
    <ListBoxItem
      id={value}
      ref={ref}
      isDisabled={disabled}
      className={cn(
        "data-[focused]:bg-accent data-[focused]:text-accent-foreground relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      textValue={typeof children === "string" ? children : value}
      {...(props as Omit<
        React.ComponentProps<typeof ListBoxItem>,
        "id" | "isDisabled" | "className" | "textValue"
      >)}
    >
      {({ isSelected }: { isSelected: boolean }) => (
        <>
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            {isSelected && (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            )}
          </span>
          {children}
        </>
      )}
    </ListBoxItem>
  )
);
SelectItem.displayName = "SelectItem";

// ---------------------------------------------------------------------------
// SelectSeparator — wraps React Aria's Separator
// ---------------------------------------------------------------------------

interface SelectSeparatorProps extends React.HTMLAttributes<HTMLElement> {}

const SelectSeparator = React.forwardRef<HTMLElement, SelectSeparatorProps>(
  ({ className, ...props }, ref) => (
    <Separator
      ref={ref}
      className={cn("bg-muted -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
);
SelectSeparator.displayName = "SelectSeparator";

// ---------------------------------------------------------------------------
// SelectScrollUpButton / SelectScrollDownButton
// React Aria handles scroll internally so these are no-op stubs kept for
// API surface compatibility.
// ---------------------------------------------------------------------------

const SelectScrollUpButton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  />
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  />
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
