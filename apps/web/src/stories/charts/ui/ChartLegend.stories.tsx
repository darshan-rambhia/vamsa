import type { Story } from "@ladle/react";
import type { ChartType } from "~/components/charts/ChartControls";
import { ChartLegend } from "~/components/charts/ChartLegend";
import { ThemeDecorator } from "~/stories/decorators";

export default {
  title: "Charts/UI/ChartLegend",
};

export const Default: Story = () => (
  <ThemeDecorator>
    <div className="max-w-6xl space-y-4">
      <h2 className="font-display text-2xl font-semibold">
        Chart Legend - Default (Tree Chart)
      </h2>
      <ChartLegend chartType="tree" />
    </div>
  </ThemeDecorator>
);
Default.storyName = "Default - All Legend Items";

export const AllTypes: Story = () => {
  const chartTypes: Array<ChartType> = [
    "tree",
    "ancestor",
    "descendant",
    "hourglass",
    "fan",
    "compact",
    "timeline",
    "bowtie",
    "matrix",
    "statistics",
  ];

  return (
    <ThemeDecorator>
      <div className="max-w-6xl space-y-8">
        <h2 className="font-display text-2xl font-semibold">
          Chart Legend - All Chart Types
        </h2>
        {chartTypes.map((type) => (
          <div key={type} className="space-y-2">
            <h3 className="font-display text-lg font-medium capitalize">
              {type} Chart
            </h3>
            <ChartLegend chartType={type} />
            {(type === "matrix" || type === "statistics") && (
              <p className="text-muted-foreground text-sm italic">
                No legend (built-in legend in chart)
              </p>
            )}
          </div>
        ))}
      </div>
    </ThemeDecorator>
  );
};
AllTypes.storyName = "All Types - Every Chart Type Legend";

export const Interactive: Story = () => (
  <ThemeDecorator>
    <div className="max-w-6xl space-y-4">
      <h2 className="font-display text-2xl font-semibold">
        Chart Legend - Interactive Example
      </h2>
      <p className="text-muted-foreground">
        Hover over legend items to see interactive effects (note: actual
        interactivity would be implemented in the parent component)
      </p>
      <div className="cursor-pointer transition-opacity hover:opacity-75">
        <ChartLegend chartType="tree" />
      </div>
    </div>
  </ThemeDecorator>
);
Interactive.storyName = "Interactive - Clickable Items";

export const Minimal: Story = () => (
  <ThemeDecorator>
    <div className="max-w-6xl space-y-4">
      <h2 className="font-display text-2xl font-semibold">
        Chart Legend - Minimal (Ancestor Chart)
      </h2>
      <p className="text-muted-foreground text-sm">
        Ancestor chart legend shows only node and edge indicators
      </p>
      <ChartLegend chartType="ancestor" />
    </div>
  </ThemeDecorator>
);
Minimal.storyName = "Minimal - Few Items";

export const Timeline: Story = () => (
  <ThemeDecorator>
    <div className="max-w-6xl space-y-4">
      <h2 className="font-display text-2xl font-semibold">
        Chart Legend - Timeline Specific
      </h2>
      <p className="text-muted-foreground text-sm">
        Timeline chart has specialized legend items for bars and date markers
      </p>
      <ChartLegend chartType="timeline" />
    </div>
  </ThemeDecorator>
);
Timeline.storyName = "Timeline - Specialized Legend";

export const Bowtie: Story = () => (
  <ThemeDecorator>
    <div className="max-w-6xl space-y-4">
      <h2 className="font-display text-2xl font-semibold">
        Chart Legend - Bowtie Chart
      </h2>
      <p className="text-muted-foreground text-sm">
        Bowtie chart includes paternal/maternal side indicators
      </p>
      <ChartLegend chartType="bowtie" />
    </div>
  </ThemeDecorator>
);
Bowtie.storyName = "Bowtie - Paternal/Maternal Indicators";
