import type { Story } from "@ladle/react";
import { CompactTree } from "~/components/charts/CompactTree";
import { StoryDecorator } from "~/stories/decorators";
import { createCompactTreeData } from "~/stories/mocks/chart-data";
import { logger } from "@vamsa/lib/logger";

export default {
  title: "Charts/CompactTree",
};

export const Default: Story = () => {
  const data = createCompactTreeData(3, 3);

  return (
    <StoryDecorator>
      <CompactTree
        data={data}
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in CompactTree story")
        }
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
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in CompactTree story")
        }
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
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in CompactTree story")
        }
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
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in CompactTree story")
        }
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
        onNodeClick={(id) =>
          logger.info({ nodeId: id }, "Node clicked in CompactTree story")
        }
      />
    </StoryDecorator>
  );
};

ManySiblings.storyName = "Many Siblings - Wide family";
