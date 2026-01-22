import type { Story } from "@ladle/react";
import { DescendantChart } from "~/components/charts/DescendantChart";
import { StoryDecorator } from "~/stories/decorators";
import {
  SMALL_FAMILY,
  DEEP_ANCESTRY,
  SINGLE_PERSON,
  createMockNodes,
  createMockEdges,
  resetIdCounter,
} from "@vamsa/lib";
import { logger } from "@vamsa/lib/logger";

export default {
  title: "Charts/DescendantChart",
};

export const Default: Story = () => (
  <StoryDecorator>
    <DescendantChart
      nodes={SMALL_FAMILY.nodes}
      edges={SMALL_FAMILY.edges}
      onNodeClick={(id) =>
        logger.info({ nodeId: id }, "Node clicked in DescendantChart story")
      }
    />
  </StoryDecorator>
);
Default.storyName = "Default - 3 Generations";

export const ThreeGenerations: Story = () => {
  resetIdCounter();
  const nodes = createMockNodes(15, { generations: 3 });
  const edges = createMockEdges(nodes);

  return (
    <StoryDecorator>
      <DescendantChart
        nodes={nodes}
        edges={edges}
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in DescendantChart story")
        }
      />
    </StoryDecorator>
  );
};
ThreeGenerations.storyName = "Three Generations - Basic View";

export const TenGenerations: Story = () => (
  <StoryDecorator>
    <DescendantChart
      nodes={DEEP_ANCESTRY.nodes}
      edges={DEEP_ANCESTRY.edges}
      onNodeClick={(id) =>
        logger.info({ nodeId: id }, "Node clicked in DescendantChart story")
      }
    />
  </StoryDecorator>
);
TenGenerations.storyName = "Ten Generations - Many Generations";

export const NoChildren: Story = () => (
  <StoryDecorator>
    <DescendantChart
      nodes={SINGLE_PERSON.nodes}
      edges={SINGLE_PERSON.edges}
      onNodeClick={(id) =>
        logger.info({ nodeId: id }, "Node clicked in DescendantChart story")
      }
    />
  </StoryDecorator>
);
NoChildren.storyName = "No Children - Person with No Descendants";
