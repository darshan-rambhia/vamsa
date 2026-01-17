import type { Story } from "@ladle/react";
import { FanChart } from "~/components/charts/FanChart";
import { StoryDecorator } from "~/stories/decorators";
import {
  SMALL_FAMILY,
  SINGLE_PERSON,
  createMockNodes,
  createMockEdges,
  resetIdCounter,
} from "~/stories/mocks/chart-data";
import { logger } from "@vamsa/lib/logger";

export default {
  title: "Charts/FanChart",
};

export const Default: Story = () => (
  <StoryDecorator>
    <FanChart
      nodes={SMALL_FAMILY.nodes}
      edges={SMALL_FAMILY.edges}
      onNodeClick={(id) =>
        logger.info({ nodeId: id }, "Node clicked in FanChart story")
      }
    />
  </StoryDecorator>
);
Default.storyName = "Default - 4 Generations";

export const FourGenerations: Story = () => {
  resetIdCounter();
  const nodes = createMockNodes(20, { generations: 4 });
  const edges = createMockEdges(nodes);

  return (
    <StoryDecorator>
      <FanChart
        nodes={nodes}
        edges={edges}
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in FanChart story")
        }
      />
    </StoryDecorator>
  );
};
FourGenerations.storyName = "Four Generations - Standard Fan View";

export const EightGenerations: Story = () => {
  resetIdCounter();
  const nodes = createMockNodes(40, { generations: 8 });
  const edges = createMockEdges(nodes);

  return (
    <StoryDecorator>
      <FanChart
        nodes={nodes}
        edges={edges}
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in FanChart story")
        }
      />
    </StoryDecorator>
  );
};
EightGenerations.storyName = "Eight Generations - Deep Ancestry Fan";

export const SingleAncestor: Story = () => (
  <StoryDecorator>
    <FanChart
      nodes={SINGLE_PERSON.nodes}
      edges={SINGLE_PERSON.edges}
      onNodeClick={(id) =>
        logger.info({ nodeId: id }, "Node clicked in FanChart story")
      }
    />
  </StoryDecorator>
);
SingleAncestor.storyName = "Single Ancestor - Minimal Data";
