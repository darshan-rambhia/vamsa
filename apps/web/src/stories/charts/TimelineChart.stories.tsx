import type { Story } from "@ladle/react";
import { TimelineChart } from "~/components/charts/TimelineChart";
import { StoryDecorator } from "~/stories/decorators";
import { createTimelineEntries } from "@vamsa/lib";
import { logger } from "@vamsa/lib/logger";

export default {
  title: "Charts/TimelineChart",
};

export const Default: Story = () => {
  const entries = createTimelineEntries(8);
  const years = entries
    .filter((e) => e.birthYear)
    .map((e) => e.birthYear as number);
  const minYear = Math.min(...years);
  const maxYear = Math.max(
    ...entries.map((e) => e.deathYear || new Date().getFullYear())
  );

  return (
    <StoryDecorator>
      <TimelineChart
        entries={entries}
        minYear={minYear}
        maxYear={maxYear}
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in TimelineChart story")
        }
      />
    </StoryDecorator>
  );
};

Default.storyName = "Default - Standard timeline";

export const Century: Story = () => {
  const entries = createTimelineEntries(10);
  const minYear = 1900;
  const maxYear = 2000;

  return (
    <StoryDecorator>
      <TimelineChart
        entries={entries.slice(0, 10)}
        minYear={minYear}
        maxYear={maxYear}
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in TimelineChart story")
        }
      />
    </StoryDecorator>
  );
};

Century.storyName = "Century - 100 years of data";

export const ThreeCenturies: Story = () => {
  const entries = createTimelineEntries(20);
  const minYear = 1700;
  const maxYear = 2000;

  return (
    <StoryDecorator>
      <TimelineChart
        entries={entries}
        minYear={minYear}
        maxYear={maxYear}
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in TimelineChart story")
        }
      />
    </StoryDecorator>
  );
};

ThreeCenturies.storyName = "Three Centuries - 300 years span";

export const NoDates: Story = () => {
  const entries = createTimelineEntries(5).map((e) => ({
    ...e,
    birthYear: null,
    deathYear: null,
  }));

  return (
    <StoryDecorator>
      <TimelineChart
        entries={entries}
        minYear={1900}
        maxYear={2000}
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in TimelineChart story")
        }
      />
    </StoryDecorator>
  );
};

NoDates.storyName = "No Dates - People without dates";

export const AllLiving: Story = () => {
  const currentYear = new Date().getFullYear();
  const entries = createTimelineEntries(8).map((e) => ({
    ...e,
    birthYear: e.birthYear || currentYear - 40,
    isLiving: true,
    deathYear: null,
  }));

  return (
    <StoryDecorator>
      <TimelineChart
        entries={entries}
        minYear={currentYear - 80}
        maxYear={currentYear}
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in TimelineChart story")
        }
      />
    </StoryDecorator>
  );
};

AllLiving.storyName = "All Living - Only living people";
