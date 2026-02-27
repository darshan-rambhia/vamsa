"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/utils";

type CheckedState = boolean | "indeterminate";

interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "checked" | "type"
> {
  checked?: CheckedState;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: CheckedState) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { className, checked, defaultChecked, onCheckedChange, disabled, ...props },
    ref
  ) => {
    const isControlled = checked !== undefined;
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(
      defaultChecked ?? false
    );

    const resolvedChecked = isControlled
      ? checked === true
      : uncontrolledChecked;
    const isChecked = resolvedChecked;
    const isIndeterminate = checked === "indeterminate";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setUncontrolledChecked(e.target.checked);
      }
      onCheckedChange?.(e.target.checked);
    };

    return (
      <span
        data-state={
          isIndeterminate
            ? "indeterminate"
            : isChecked
              ? "checked"
              : "unchecked"
        }
        data-disabled={disabled ? "" : undefined}
        className={cn(
          "border-primary ring-offset-background focus-within:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          {...(isControlled
            ? { checked: checked === true || isIndeterminate }
            : { defaultChecked })}
          disabled={disabled}
          onChange={handleChange}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
          {...props}
        />
        {(isChecked || isIndeterminate) && (
          <Check className="pointer-events-none h-4 w-4" aria-hidden />
        )}
      </span>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
