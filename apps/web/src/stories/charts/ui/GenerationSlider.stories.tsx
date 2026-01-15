import { useState } from "react";
import type { Story } from "@ladle/react";
import { GenerationSlider } from "~/components/charts/GenerationSlider";
import { ThemeDecorator } from "~/stories/decorators";

export default {
  title: "Charts/UI/GenerationSlider",
};

export const Default: Story = () => {
  const [value, setValue] = useState(3);

  return (
    <ThemeDecorator>
      <div className="p-8">
        <GenerationSlider
          label="Generations"
          value={value}
          onChange={setValue}
          min={1}
          max={10}
        />
        <p className="text-muted-foreground mt-4 text-sm">
          Current value: {value}
        </p>
      </div>
    </ThemeDecorator>
  );
};

Default.storyName = "Default - Standard slider";

export const MinMax: Story = () => {
  const [minValue, setMinValue] = useState(1);
  const [maxValue, setMaxValue] = useState(10);

  return (
    <ThemeDecorator>
      <div className="space-y-6 p-8">
        <GenerationSlider
          label="At Minimum"
          value={minValue}
          onChange={setMinValue}
          min={1}
          max={10}
        />
        <GenerationSlider
          label="At Maximum"
          value={maxValue}
          onChange={setMaxValue}
          min={1}
          max={10}
        />
        <p className="text-muted-foreground text-sm">
          Min: {minValue}, Max: {maxValue}
        </p>
      </div>
    </ThemeDecorator>
  );
};

MinMax.storyName = "Min/Max - At boundary values";

export const Disabled: Story = () => {
  const [value] = useState(5);

  return (
    <ThemeDecorator>
      <div className="p-8">
        <div className="opacity-50">
          <GenerationSlider
            label="Generations (Disabled)"
            value={value}
            onChange={() => {}}
            min={1}
            max={10}
          />
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          Slider is in disabled state
        </p>
      </div>
    </ThemeDecorator>
  );
};

Disabled.storyName = "Disabled - Disabled state";

export const CustomRange: Story = () => {
  const [value, setValue] = useState(15);

  return (
    <ThemeDecorator>
      <div className="p-8">
        <GenerationSlider
          label="Custom Range (5-25)"
          value={value}
          onChange={setValue}
          min={5}
          max={25}
          showNumberInput
        />
        <p className="text-muted-foreground mt-4 text-sm">
          Current value: {value} (non-default range)
        </p>
      </div>
    </ThemeDecorator>
  );
};

CustomRange.storyName = "Custom Range - Non-default range with number input";
