"use client";

import { Button, Input, Label } from "@vamsa/ui";

export interface GenerationSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  id?: string;
  showNumberInput?: boolean;
}

/**
 * Slider component with +/- buttons for precise generation control.
 * Design: [-] [═══════●═══════════════] [+]  3
 */
export function GenerationSlider({
  label,
  value,
  min = 1,
  max = 10,
  onChange,
  id,
  showNumberInput = false,
}: GenerationSliderProps) {
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const sliderId = id || `slider-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={sliderId}>{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDecrease}
          disabled={value <= min}
          className="h-8 w-8 p-0"
          title={`Decrease ${label.toLowerCase()}`}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        </Button>

        <Input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="h-2 flex-1"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleIncrease}
          disabled={value >= max}
          className="h-8 w-8 p-0"
          title={`Increase ${label.toLowerCase()}`}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </Button>

        {showNumberInput ? (
          <Input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isNaN(next)) return;
              const clamped = Math.min(Math.max(next, min), max);
              onChange(clamped);
            }}
            className="w-16"
            aria-label={`${label} numeric input`}
          />
        ) : (
          <span className="text-muted-foreground w-6 text-center font-mono text-sm">
            {value}
          </span>
        )}
      </div>
    </div>
  );
}
