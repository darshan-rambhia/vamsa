import type { Story } from "@ladle/react";
import { BowtieChart } from "~/components/charts/BowtieChart";
import { StoryDecorator } from "~/stories/decorators";
import { createMockPerson, createBowtieNodes } from "@vamsa/lib";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.api;

export default {
  title: "Charts/BowtieChart",
};

const rootPerson = createMockPerson({
  id: "root-1",
  firstName: "John",
  lastName: "Center",
  gender: "MALE",
  isLiving: true,
  generation: 0,
  dateOfBirth: "1980-01-01",
});

export const Default: Story = () => {
  const { nodes, edges } = createBowtieNodes(rootPerson, 6, 6);

  return (
    <StoryDecorator>
      <BowtieChart
        nodes={nodes}
        edges={edges}
        rootPersonId={rootPerson.id}
        onNodeClick={(id) =>
          log.info({ nodeId: id }, "Node clicked in BowtieChart story")
        }
      />
    </StoryDecorator>
  );
};

Default.storyName = "Default - Balanced paternal/maternal";

export const PaternalOnly: Story = () => {
  const { nodes, edges } = createBowtieNodes(rootPerson, 8, 0);

  return (
    <StoryDecorator>
      <BowtieChart
        nodes={nodes}
        edges={edges}
        rootPersonId={rootPerson.id}
        onNodeClick={(id) =>
          log.info({ nodeId: id }, "Node clicked in BowtieChart story")
        }
      />
    </StoryDecorator>
  );
};

PaternalOnly.storyName = "Paternal Only - Only father's side";

export const MaternalOnly: Story = () => {
  const { nodes, edges } = createBowtieNodes(rootPerson, 0, 8);

  return (
    <StoryDecorator>
      <BowtieChart
        nodes={nodes}
        edges={edges}
        rootPersonId={rootPerson.id}
        onNodeClick={(id) =>
          log.info({ nodeId: id }, "Node clicked in BowtieChart story")
        }
      />
    </StoryDecorator>
  );
};

MaternalOnly.storyName = "Maternal Only - Only mother's side";

export const SingleParent: Story = () => {
  const { nodes, edges } = createBowtieNodes(rootPerson, 4, 0);

  return (
    <StoryDecorator>
      <BowtieChart
        nodes={nodes}
        edges={edges}
        rootPersonId={rootPerson.id}
        onNodeClick={(id) =>
          log.info({ nodeId: id }, "Node clicked in BowtieChart story")
        }
      />
    </StoryDecorator>
  );
};

SingleParent.storyName = "Single Parent - One parent known";
