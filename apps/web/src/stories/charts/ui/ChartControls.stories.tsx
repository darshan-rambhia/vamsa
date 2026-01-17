import type { Story } from "@ladle/react";
import { useState } from "react";
import {
  ChartControls,
  type ChartType,
} from "~/components/charts/ChartControls";
import { ThemeDecorator } from "~/stories/decorators";
import { logger } from "@vamsa/lib/logger";

export default {
  title: "Charts/UI/ChartControls",
};

export const Default: Story = () => {
  const [chartType, setChartType] = useState<ChartType>("tree");
  const [generations, setGenerations] = useState(3);
  const [ancestorGens, setAncestorGens] = useState(3);
  const [descendantGens, setDescendantGens] = useState(3);

  return (
    <ThemeDecorator>
      <div className="max-w-6xl space-y-4">
        <h2 className="font-display text-2xl font-semibold">
          Chart Controls - Default
        </h2>
        <ChartControls
          chartType={chartType}
          generations={generations}
          ancestorGenerations={ancestorGens}
          descendantGenerations={descendantGens}
          onChartTypeChange={setChartType}
          onGenerationsChange={setGenerations}
          onAncestorGenerationsChange={setAncestorGens}
          onDescendantGenerationsChange={setDescendantGens}
          onExportPDF={() =>
            logger.info("Export PDF clicked in ChartControls story")
          }
          onExportPNG={() =>
            logger.info("Export PNG clicked in ChartControls story")
          }
          onExportSVG={() =>
            logger.info("Export SVG clicked in ChartControls story")
          }
          onPrint={() => logger.info("Print clicked in ChartControls story")}
          onResetView={() =>
            logger.info("Reset view clicked in ChartControls story")
          }
        />
      </div>
    </ThemeDecorator>
  );
};
Default.storyName = "Default - All Controls Visible";

export const AllOptions: Story = () => {
  const [chartType, setChartType] = useState<ChartType>("hourglass");
  const [generations, setGenerations] = useState(5);
  const [ancestorGens, setAncestorGens] = useState(5);
  const [descendantGens, setDescendantGens] = useState(5);
  const [maxPeople, setMaxPeople] = useState(30);
  const [sortBy, setSortBy] = useState<"birth" | "death" | "name">("birth");

  return (
    <ThemeDecorator>
      <div className="max-w-6xl space-y-4">
        <h2 className="font-display text-2xl font-semibold">
          Chart Controls - All Options
        </h2>
        <ChartControls
          chartType={chartType}
          generations={generations}
          ancestorGenerations={ancestorGens}
          descendantGenerations={descendantGens}
          maxPeople={maxPeople}
          sortBy={sortBy}
          onChartTypeChange={setChartType}
          onGenerationsChange={setGenerations}
          onAncestorGenerationsChange={setAncestorGens}
          onDescendantGenerationsChange={setDescendantGens}
          onMaxPeopleChange={setMaxPeople}
          onSortByChange={setSortBy}
          onExportPDF={() =>
            logger.info("Export PDF clicked in ChartControls story")
          }
          onExportPNG={() =>
            logger.info("Export PNG clicked in ChartControls story")
          }
          onExportSVG={() =>
            logger.info("Export SVG clicked in ChartControls story")
          }
          onPrint={() => logger.info("Print clicked in ChartControls story")}
          onResetView={() =>
            logger.info("Reset view clicked in ChartControls story")
          }
          activeContextLabel="John Doe"
        />
      </div>
    </ThemeDecorator>
  );
};
AllOptions.storyName = "All Options - Every Option Enabled";

export const MinimalOptions: Story = () => {
  const [generations, setGenerations] = useState(3);
  const [ancestorGens, setAncestorGens] = useState(3);

  return (
    <ThemeDecorator>
      <div className="max-w-6xl space-y-4">
        <h2 className="font-display text-2xl font-semibold">
          Chart Controls - Minimal Options
        </h2>
        <ChartControls
          chartType="ancestor"
          generations={generations}
          ancestorGenerations={ancestorGens}
          hideChartTypeSelector={true}
          onGenerationsChange={setGenerations}
          onAncestorGenerationsChange={setAncestorGens}
          onResetView={() =>
            logger.info("Reset view clicked in ChartControls story")
          }
        />
      </div>
    </ThemeDecorator>
  );
};
MinimalOptions.storyName = "Minimal Options - Only Essential Controls";

export const Disabled: Story = () => {
  return (
    <ThemeDecorator>
      <div className="max-w-6xl space-y-4">
        <h2 className="font-display text-2xl font-semibold">
          Chart Controls - Disabled State
        </h2>
        <div className="pointer-events-none opacity-50">
          <ChartControls
            chartType="tree"
            generations={3}
            ancestorGenerations={3}
            descendantGenerations={3}
            onGenerationsChange={() => {}}
            onAncestorGenerationsChange={() => {}}
            onDescendantGenerationsChange={() => {}}
          />
        </div>
      </div>
    </ThemeDecorator>
  );
};
Disabled.storyName = "Disabled - All Controls Disabled";
