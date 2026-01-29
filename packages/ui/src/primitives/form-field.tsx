import * as React from "react";
import { Label } from "./label";
import { cn } from "../lib/utils";

interface InputProps {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

interface FormFieldProps {
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactElement<InputProps>;
  className?: string;
}

/**
 * FormField - Accessible form field wrapper
 *
 * Provides ARIA-compliant form field behavior:
 * - Associates labels with inputs via unique IDs
 * - Links error messages to inputs with aria-describedby
 * - Marks invalid fields with aria-invalid
 * - Announces errors with role="alert" and aria-live="polite"
 *
 * Design: Source Sans 3 body text, forest green accents, autumn red errors
 *
 * @example
 * <FormField label="Email" error={errors.email} required>
 *   <Input type="email" {...register("email")} />
 * </FormField>
 */
export function FormField({
  label,
  error,
  description,
  required = false,
  children,
  className,
}: FormFieldProps) {
  const id = React.useId();
  const errorId = `${id}-error`;
  const descId = `${id}-desc`;

  // Build aria-describedby string, filtering empty values
  const ariaDescribedBy = [error && errorId, description && descId]
    .filter(Boolean)
    .join(" ");

  // Clone the child element and inject accessibility props
  const childWithProps = React.cloneElement(children, {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": ariaDescribedBy || undefined,
  });

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </Label>

      {childWithProps}

      {description && !error && (
        <p id={descId} className="text-muted-foreground text-sm">
          {description}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}
