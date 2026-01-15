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
} from "~/stories/mocks/chart-data";

export default {
  title: "Charts/DescendantChart",
};

export const Default: Story = () => (
  <StoryDecorator>
    <DescendantChart
      nodes={SMALL_FAMILY.nodes}
      edges={SMALL_FAMILY.edges}
      onNodeClick={(id) => console.log("Clicked:", id)}
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
        onNodeClick={(id) => console.log("Clicked:", id)}
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
      onNodeClick={(id) => console.log("Clicked:", id)}
    />
  </StoryDecorator>
);
TenGenerations.storyName = "Ten Generations - Many Generations";

export const NoChildren: Story = () => (
  <StoryDecorator>
    <DescendantChart
      nodes={SINGLE_PERSON.nodes}
      edges={SINGLE_PERSON.edges}
      onNodeClick={(id) => console.log("Clicked:", id)}
    />
  </StoryDecorator>
);
NoChildren.storyName = "No Children - Person with No Descendants";
