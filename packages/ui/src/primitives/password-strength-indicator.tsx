import { Check, X } from "lucide-react";
import { getPasswordStrength } from "@vamsa/schemas";
import { cn } from "../lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  className,
}: PasswordStrengthIndicatorProps) {
  // Only show when there's input
  if (!password) return null;

  const { score, checks } = getPasswordStrength(password);

  // Strength labels and colors
  const levels = [
    { label: "", color: "" }, // 0 = empty (won't render)
    { label: "Weak", color: "bg-destructive" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: "bg-emerald-500" },
    { label: "Strong", color: "bg-emerald-600" },
  ];

  const { label, color } = levels[score] || levels[1];

  return (
    <div
      className={cn("space-y-2", className)}
      data-testid="password-strength-indicator"
    >
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div
          className="flex flex-1 gap-1"
          aria-label={`Password strength: ${label}`}
        >
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                score >= level ? color : "bg-muted"
              )}
            />
          ))}
        </div>
        <span
          className={cn(
            "text-xs font-medium",
            score <= 1
              ? "text-destructive"
              : score === 2
                ? "text-amber-500"
                : "text-emerald-600"
          )}
        >
          {label}
        </span>
      </div>

      {/* Requirements checklist */}
      <ul className="text-muted-foreground space-y-0.5 text-xs">
        {[
          { key: "minLength", label: "At least 12 characters" },
          { key: "hasUppercase", label: "Uppercase letter" },
          { key: "hasLowercase", label: "Lowercase letter" },
          { key: "hasDigit", label: "Number" },
          { key: "hasSpecial", label: "Special character" },
        ].map(({ key, label }) => {
          const met = checks[key as keyof typeof checks];
          return (
            <li key={key} className="flex items-center gap-1.5">
              {met ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <X className="text-muted-foreground/50 h-3 w-3" />
              )}
              <span className={met ? "text-foreground/70" : ""}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
