import { useState } from "react";
import type { Story } from "@ladle/react";
import { PersonSelector } from "~/components/charts/PersonSelector";
import { ThemeDecorator } from "~/stories/decorators";
import { createMockNodes } from "~/stories/mocks/chart-data";

export default {
  title: "Charts/UI/PersonSelector",
};

const mockPeople = createMockNodes(20, { generations: 4 }).map((node) => ({
  id: node.id,
  firstName: node.firstName,
  lastName: node.lastName,
  dateOfBirth: node.dateOfBirth ? new Date(node.dateOfBirth) : null,
  isLiving: node.isLiving,
}));

export const Default: Story = () => {
  const [selectedId, setSelectedId] = useState<string | undefined>(
    mockPeople[0].id
  );

  return (
    <ThemeDecorator>
      <div className="p-8">
        <PersonSelector
          persons={mockPeople}
          selectedPersonId={selectedId}
          onPersonChange={setSelectedId}
        />
        <p className="text-muted-foreground mt-4 text-sm">
          Selected ID: {selectedId || "None"}
        </p>
      </div>
    </ThemeDecorator>
  );
};

Default.storyName = "Default - Standard selector";

export const Empty: Story = () => {
  const [selectedId, setSelectedId] = useState<string | undefined>();

  return (
    <ThemeDecorator>
      <div className="p-8">
        <PersonSelector
          persons={[]}
          selectedPersonId={selectedId}
          onPersonChange={setSelectedId}
        />
        <p className="text-muted-foreground mt-4 text-sm">
          No people available
        </p>
      </div>
    </ThemeDecorator>
  );
};

Empty.storyName = "Empty - No people available";

export const ManyPeople: Story = () => {
  const largeMockPeople = createMockNodes(100, { generations: 10 }).map(
    (node) => ({
      id: node.id,
      firstName: node.firstName,
      lastName: node.lastName,
      dateOfBirth: node.dateOfBirth ? new Date(node.dateOfBirth) : null,
      isLiving: node.isLiving,
    })
  );
  const [selectedId, setSelectedId] = useState<string | undefined>(
    largeMockPeople[0].id
  );

  return (
    <ThemeDecorator>
      <div className="p-8">
        <PersonSelector
          persons={largeMockPeople}
          selectedPersonId={selectedId}
          onPersonChange={setSelectedId}
        />
        <p className="text-muted-foreground mt-4 text-sm">
          {largeMockPeople.length} people in list
        </p>
      </div>
    </ThemeDecorator>
  );
};

ManyPeople.storyName = "Many People - Long list";

export const WithSearch: Story = () => {
  const [selectedId, setSelectedId] = useState<string | undefined>();

  return (
    <ThemeDecorator>
      <div className="p-8">
        <PersonSelector
          persons={mockPeople}
          selectedPersonId={selectedId}
          onPersonChange={setSelectedId}
          placeholder="Type to search..."
        />
        <p className="text-muted-foreground mt-4 text-sm">
          Try searching for "John", "Jane", or "Bob"
        </p>
      </div>
    </ThemeDecorator>
  );
};

WithSearch.storyName = "With Search - Search functionality";
