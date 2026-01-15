import type { Story } from "@ladle/react";
import { CompactTree } from "~/components/charts/CompactTree";
import { StoryDecorator } from "~/stories/decorators";
import { createCompactTreeData } from "~/stories/mocks/chart-data";

export default {
  title: "Charts/CompactTree",
};

export const Default: Story = () => {
  const data = createCompactTreeData(3, 3);

  return (
    <StoryDecorator>
      <CompactTree
        data={data}
        onNodeClick={(id) => console.log("Clicked:", id)}
      />
    </StoryDecorator>
  );
};

Default.storyName = "Default - Standard tree view";

export const Collapsed: Story = () => {
  const data = createCompactTreeData(2, 2);

  return (
    <StoryDecorator>
      <CompactTree
        data={data}
        onNodeClick={(id) => console.log("Clicked:", id)}
      />
    </StoryDecorator>
  );
};

Collapsed.storyName = "Collapsed - Small tree (few nodes)";

export const Expanded: Story = () => {
  const data = createCompactTreeData(4, 4);

  return (
    <StoryDecorator>
      <CompactTree
        data={data}
        onNodeClick={(id) => console.log("Clicked:", id)}
      />
    </StoryDecorator>
  );
};

Expanded.storyName = "Expanded - All nodes expanded";

export const DeepNesting: Story = () => {
  const data = createCompactTreeData(10, 2);

  return (
    <StoryDecorator>
      <CompactTree
        data={data}
        onNodeClick={(id) => console.log("Clicked:", id)}
      />
    </StoryDecorator>
  );
};

DeepNesting.storyName = "Deep Nesting - Many generations deep";

export const ManySiblings: Story = () => {
  const data = createCompactTreeData(3, 8);

  return (
    <StoryDecorator>
      <CompactTree
        data={data}
        onNodeClick={(id) => console.log("Clicked:", id)}
      />
    </StoryDecorator>
  );
};

ManySiblings.storyName = "Many Siblings - Wide family";
