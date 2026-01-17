import type { Story } from "@ladle/react";
import { RelationshipMatrix } from "~/components/charts/RelationshipMatrix";
import { StoryDecorator } from "~/stories/decorators";
import { createMatrixData } from "~/stories/mocks/chart-data";
import { logger } from "@vamsa/lib/logger";

export default {
  title: "Charts/RelationshipMatrix",
};

export const Default: Story = () => {
  const { people, matrix } = createMatrixData(10);

  return (
    <StoryDecorator>
      <RelationshipMatrix
        people={people}
        matrix={matrix}
        onNodeClick={(id) =>
          logger.info(
            { nodeId: id },
            "Node clicked in RelationshipMatrix story"
          )
        }
      />
    </StoryDecorator>
  );
};

Default.storyName = "Default - Standard matrix (10x10)";

export const Small: Story = () => {
  const { people, matrix } = createMatrixData(5);

  return (
    <StoryDecorator>
      <RelationshipMatrix
        people={people}
        matrix={matrix}
        onNodeClick={(id) =>
          logger.info(
            { nodeId: id },
            "Node clicked in RelationshipMatrix story"
          )
        }
      />
    </StoryDecorator>
  );
};

Small.storyName = "Small - Few people (5x5)";

export const Large: Story = () => {
  const { people, matrix } = createMatrixData(20);

  return (
    <StoryDecorator>
      <RelationshipMatrix
        people={people}
        matrix={matrix}
        onNodeClick={(id) =>
          logger.info(
            { nodeId: id },
            "Node clicked in RelationshipMatrix story"
          )
        }
      />
    </StoryDecorator>
  );
};

Large.storyName = "Large - Many people (20x20)";

export const DuplicateNames: Story = () => {
  const { people, matrix } = createMatrixData(8);
  const duplicatedPeople = people.map((p, idx) => ({
    ...p,
    firstName: idx % 3 === 0 ? "John" : idx % 3 === 1 ? "Jane" : "Bob",
    lastName: idx % 2 === 0 ? "Smith" : "Johnson",
  }));

  return (
    <StoryDecorator>
      <RelationshipMatrix
        people={duplicatedPeople}
        matrix={matrix}
        onNodeClick={(id) =>
          logger.info(
            { nodeId: id },
            "Node clicked in RelationshipMatrix story"
          )
        }
      />
    </StoryDecorator>
  );
};

DuplicateNames.storyName = "Duplicate Names - Same names, different people";

export const NoRelationships: Story = () => {
  const { people, matrix } = createMatrixData(6);
  const emptyMatrix = matrix.map((cell) => ({
    ...cell,
    relationshipType: cell.personId === cell.relatedPersonId ? "SELF" : null,
    strength: cell.personId === cell.relatedPersonId ? 1 : 0,
  }));

  return (
    <StoryDecorator>
      <RelationshipMatrix
        people={people}
        matrix={emptyMatrix}
        onNodeClick={(id) =>
          logger.info(
            { nodeId: id },
            "Node clicked in RelationshipMatrix story"
          )
        }
      />
    </StoryDecorator>
  );
};

NoRelationships.storyName = "No Relationships - Unconnected people";
