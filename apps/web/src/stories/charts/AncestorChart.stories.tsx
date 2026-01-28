import type { Story } from "@ladle/react";
import { AncestorChart } from "~/components/charts/AncestorChart";
import { StoryDecorator } from "~/stories/decorators";
import {
  SMALL_FAMILY,
  DEEP_ANCESTRY,
  SINGLE_PERSON,
  createMockNodes,
  createMockEdges,
  resetIdCounter,
} from "@vamsa/lib";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.api;

export default {
  title: "Charts/AncestorChart",
};

export const Default: Story = () => (
  <StoryDecorator>
    <AncestorChart
      nodes={SMALL_FAMILY.nodes}
      edges={SMALL_FAMILY.edges}
      onNodeClick={(id) =>
        log.info({ nodeId: id }, "Node clicked in AncestorChart story")
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
      <AncestorChart
        nodes={nodes}
        edges={edges}
        onNodeClick={(id) =>
          log.info({ nodeId: id }, "Node clicked in AncestorChart story")
        }
      />
    </StoryDecorator>
  );
};
ThreeGenerations.storyName = "Three Generations - Basic View";

export const TenGenerations: Story = () => (
  <StoryDecorator>
    <AncestorChart
      nodes={DEEP_ANCESTRY.nodes}
      edges={DEEP_ANCESTRY.edges}
      onNodeClick={(id) =>
        log.info({ nodeId: id }, "Node clicked in AncestorChart story")
      }
    />
  </StoryDecorator>
);
TenGenerations.storyName = "Ten Generations - Deep Ancestry";

export const WithSpouses: Story = () => {
  resetIdCounter();
  const nodes = createMockNodes(12, { generations: 3, includeSpouses: true });
  const edges = createMockEdges(nodes);

  return (
    <StoryDecorator>
      <AncestorChart
        nodes={nodes}
        edges={edges}
        onNodeClick={(id) =>
          log.info({ nodeId: id }, "Node clicked in AncestorChart story")
        }
      />
    </StoryDecorator>
  );
};
WithSpouses.storyName = "With Spouses - Include Relationships";

export const NoAncestors: Story = () => (
  <StoryDecorator>
    <AncestorChart
      nodes={SINGLE_PERSON.nodes}
      edges={SINGLE_PERSON.edges}
      onNodeClick={(id) =>
        log.info({ nodeId: id }, "Node clicked in AncestorChart story")
      }
    />
  </StoryDecorator>
);
NoAncestors.storyName = "No Ancestors - Single Person";
