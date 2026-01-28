import type { Story } from "@ladle/react";
import { ChartTooltip } from "~/components/charts/ChartTooltip";
import { ThemeDecorator } from "~/stories/decorators";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.api;

export default {
  title: "Charts/UI/ChartTooltip",
};

const mockNode = {
  id: "person-1",
  firstName: "John",
  lastName: "Doe",
  dateOfBirth: "1980-05-15",
  dateOfPassing: null,
  isLiving: true,
  photoUrl: null,
  gender: "MALE",
};

const mockDeceasedNode = {
  id: "person-2",
  firstName: "Jane",
  lastName: "Smith",
  dateOfBirth: "1950-03-20",
  dateOfPassing: "2020-11-10",
  isLiving: false,
  photoUrl: null,
  gender: "FEMALE",
};

const mockLongNameNode = {
  id: "person-3",
  firstName: "Alexander Bartholomew Christopher",
  lastName: "Vanderbilt-Rothschild-Montgomery",
  dateOfBirth: "1975-08-25",
  dateOfPassing: null,
  isLiving: true,
  photoUrl: null,
  gender: "MALE",
};

export const Default: Story = () => (
  <ThemeDecorator>
    <div className="relative h-screen">
      <ChartTooltip
        node={mockNode}
        position={{ x: 200, y: 200 }}
        rootPersonId="person-root"
        onSetAsCenter={(id) =>
          log.info({ personId: id }, "Set as center in ChartTooltip story")
        }
        onViewProfile={(id) =>
          log.info({ personId: id }, "View profile in ChartTooltip story")
        }
        relationshipLabel="3 generations up"
      />
    </div>
  </ThemeDecorator>
);
Default.storyName = "Default - Standard Tooltip";

export const LongContent: Story = () => (
  <ThemeDecorator>
    <div className="relative h-screen">
      <ChartTooltip
        node={mockLongNameNode}
        position={{ x: 300, y: 300 }}
        rootPersonId="person-root"
        onSetAsCenter={(id) =>
          log.info({ personId: id }, "Set as center in ChartTooltip story")
        }
        onViewProfile={(id) =>
          log.info({ personId: id }, "View profile in ChartTooltip story")
        }
        relationshipLabel="2 generations down (grandson)"
      />
    </div>
  </ThemeDecorator>
);
LongContent.storyName = "Long Content - Long Name and Dates";

export const WithActions: Story = () => (
  <ThemeDecorator>
    <div className="relative h-screen">
      <ChartTooltip
        node={mockDeceasedNode}
        position={{ x: 400, y: 400 }}
        rootPersonId="person-root"
        onSetAsCenter={(id) => {
          log.info({ personId: id }, "Set as center in ChartTooltip story");
          alert(`Setting ${id} as center person`);
        }}
        onViewProfile={(id) => {
          log.info({ personId: id }, "View profile in ChartTooltip story");
          alert(`Viewing profile for ${id}`);
        }}
        relationshipLabel="Grandmother"
      />
    </div>
  </ThemeDecorator>
);
WithActions.storyName = "With Actions - Set as Center, View Profile";

export const RootPerson: Story = () => (
  <ThemeDecorator>
    <div className="relative h-screen">
      <ChartTooltip
        node={mockNode}
        position={{ x: 500, y: 200 }}
        rootPersonId="person-1"
        onSetAsCenter={(id) =>
          log.info({ personId: id }, "Set as center in ChartTooltip story")
        }
        onViewProfile={(id) =>
          log.info({ personId: id }, "View profile in ChartTooltip story")
        }
        relationshipLabel="Center"
      />
    </div>
  </ThemeDecorator>
);
RootPerson.storyName = "Root Person - No Set as Center Button";

export const EdgePositioning: Story = () => (
  <ThemeDecorator>
    <div className="relative h-screen">
      <div className="space-y-8">
        <div>
          <h3 className="font-display mb-2 text-lg font-semibold">
            Top-left corner
          </h3>
          <ChartTooltip
            node={mockNode}
            position={{ x: 10, y: 10 }}
            rootPersonId="person-root"
            onSetAsCenter={(id) =>
              log.info({ personId: id }, "Set as center in ChartTooltip story")
            }
            onViewProfile={(id) =>
              log.info({ personId: id }, "View profile in ChartTooltip story")
            }
          />
        </div>

        <div>
          <h3 className="font-display mb-2 text-lg font-semibold">
            Near bottom-right (should reposition)
          </h3>
          <ChartTooltip
            node={mockDeceasedNode}
            position={{
              x: window.innerWidth - 100,
              y: window.innerHeight - 100,
            }}
            rootPersonId="person-root"
            onSetAsCenter={(id) =>
              log.info({ personId: id }, "Set as center in ChartTooltip story")
            }
            onViewProfile={(id) =>
              log.info({ personId: id }, "View profile in ChartTooltip story")
            }
            relationshipLabel="Edge positioning test"
          />
        </div>
      </div>
    </div>
  </ThemeDecorator>
);
EdgePositioning.storyName = "Edge Positioning - Viewport Overflow Prevention";
