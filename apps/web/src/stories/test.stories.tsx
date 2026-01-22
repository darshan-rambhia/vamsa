import type { Story } from "@ladle/react";
import { StoryDecorator } from "./decorators";
import { SMALL_FAMILY } from "@vamsa/lib";

export const TestSetup: Story = () => {
  return (
    <StoryDecorator>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Ladle Setup Test</h1>
        <p>If you can see this, Ladle is working!</p>
        <div>
          <h2 className="text-lg font-semibold">Mock Data Test:</h2>
          <pre className="bg-muted rounded p-4">
            {JSON.stringify(SMALL_FAMILY, null, 2)}
          </pre>
        </div>
      </div>
    </StoryDecorator>
  );
};
