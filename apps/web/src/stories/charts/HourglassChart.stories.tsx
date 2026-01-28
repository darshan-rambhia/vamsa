import type { Story } from "@ladle/react";
import { HourglassChart } from "~/components/charts/HourglassChart";
import { StoryDecorator } from "~/stories/decorators";
import type { ChartNode, ChartEdge } from "~/server/charts";
import { createMockEdges, resetIdCounter, createMockPerson } from "@vamsa/lib";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.api;

export default {
  title: "Charts/HourglassChart",
};

// Helper to create hourglass data (ancestors + root + descendants)
function createHourglassData(
  ancestorGens: number,
  descendantGens: number
): { nodes: ChartNode[]; edges: ChartEdge[]; rootId: string } {
  resetIdCounter();

  // Create root person
  const root = createMockPerson({
    firstName: "Center",
    lastName: "Person",
    generation: 0,
  });

  // Create ancestors (positive generations)
  const ancestors: ChartNode[] = [];
  for (let gen = 1; gen <= ancestorGens; gen++) {
    const peopleInGen = Math.pow(2, gen - 1);
    for (let i = 0; i < peopleInGen; i++) {
      ancestors.push(
        createMockPerson({
          firstName: `Ancestor${gen}`,
          lastName: `Gen${gen}`,
          generation: gen,
          isLiving: false,
        })
      );
    }
  }

  // Create descendants (negative generations)
  const descendants: ChartNode[] = [];
  for (let gen = 1; gen <= descendantGens; gen++) {
    const peopleInGen = Math.pow(2, gen - 1);
    for (let i = 0; i < peopleInGen; i++) {
      descendants.push(
        createMockPerson({
          firstName: `Descendant${gen}`,
          lastName: `Gen${gen}`,
          generation: -gen,
          isLiving: gen <= 2,
        })
      );
    }
  }

  const nodes = [root, ...ancestors, ...descendants];
  const edges = createMockEdges(nodes);

  return { nodes, edges, rootId: root.id };
}

export const Default: Story = () => {
  const { nodes, edges, rootId } = createHourglassData(3, 3);

  return (
    <StoryDecorator>
      <HourglassChart
        nodes={nodes}
        edges={edges}
        rootPersonId={rootId}
        onNodeClick={(id) =>
          log.info({ nodeId: id }, "Node clicked in HourglassChart story")
        }
      />
    </StoryDecorator>
  );
};
Default.storyName = "Default - Balanced Ancestors and Descendants";

export const Balanced: Story = () => {
  const { nodes, edges, rootId } = createHourglassData(4, 4);

  return (
    <StoryDecorator>
      <HourglassChart
        nodes={nodes}
        edges={edges}
        rootPersonId={rootId}
        onNodeClick={(id) =>
          log.info({ nodeId: id }, "Node clicked in HourglassChart story")
        }
      />
    </StoryDecorator>
  );
};
Balanced.storyName = "Balanced - Equal Generations Both Directions";

export const HeavyAncestors: Story = () => {
  const { nodes, edges, rootId } = createHourglassData(6, 2);

  return (
    <StoryDecorator>
      <HourglassChart
        nodes={nodes}
        edges={edges}
        rootPersonId={rootId}
        onNodeClick={(id) =>
          log.info({ nodeId: id }, "Node clicked in HourglassChart story")
        }
      />
    </StoryDecorator>
  );
};
HeavyAncestors.storyName = "Heavy Ancestors - More Ancestors than Descendants";

export const Asymmetric: Story = () => {
  const { nodes, edges, rootId } = createHourglassData(2, 5);

  return (
    <StoryDecorator>
      <HourglassChart
        nodes={nodes}
        edges={edges}
        rootPersonId={rootId}
        onNodeClick={(id) =>
          log.info({ nodeId: id }, "Node clicked in HourglassChart story")
        }
      />
    </StoryDecorator>
  );
};
Asymmetric.storyName = "Asymmetric - Uneven Distribution";
