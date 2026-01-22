import type { Story } from "@ladle/react";
import { TreeChart } from "~/components/charts/TreeChart";
import { StoryDecorator } from "~/stories/decorators";
import {
  SMALL_FAMILY,
  EMPTY_DATA,
  LARGE_FAMILY,
  DEEP_ANCESTRY,
  LONG_NAMES,
} from "@vamsa/lib";
import { logger } from "@vamsa/lib/logger";

export default {
  title: "Charts/TreeChart",
};

export const Default: Story = () => (
  <StoryDecorator>
    <TreeChart
      nodes={SMALL_FAMILY.nodes}
      edges={SMALL_FAMILY.edges}
      onNodeClick={(id) =>
        logger.info({ nodeId: id }, "Node clicked in TreeChart story")
      }
    />
  </StoryDecorator>
);
Default.storyName = "Default - Small Family";

export const Empty: Story = () => (
  <StoryDecorator>
    <TreeChart
      nodes={EMPTY_DATA.nodes}
      edges={EMPTY_DATA.edges}
      onNodeClick={(id) =>
        logger.info({ nodeId: id }, "Node clicked in TreeChart story")
      }
    />
  </StoryDecorator>
);
Empty.storyName = "Empty - No Data";

export const LargeFamily: Story = () => (
  <StoryDecorator>
    <TreeChart
      nodes={LARGE_FAMILY.nodes}
      edges={LARGE_FAMILY.edges}
      onNodeClick={(id) =>
        logger.info({ nodeId: id }, "Node clicked in TreeChart story")
      }
    />
  </StoryDecorator>
);
LargeFamily.storyName = "Large Family - 50+ People";

export const DeepAncestryStory: Story = () => (
  <StoryDecorator>
    <TreeChart
      nodes={DEEP_ANCESTRY.nodes}
      edges={DEEP_ANCESTRY.edges}
      onNodeClick={(id) =>
        logger.info({ nodeId: id }, "Node clicked in TreeChart story")
      }
    />
  </StoryDecorator>
);
DeepAncestryStory.storyName = "Deep Ancestry - 10 Generations";

export const LongNamesStory: Story = () => (
  <StoryDecorator>
    <TreeChart
      nodes={LONG_NAMES.nodes}
      edges={LONG_NAMES.edges}
      onNodeClick={(id) =>
        logger.info({ nodeId: id }, "Node clicked in TreeChart story")
      }
    />
  </StoryDecorator>
);
LongNamesStory.storyName = "Long Names - Name Truncation Test";
