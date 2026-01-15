import type { Story } from "@ladle/react";
import { ChartSkeleton } from "~/components/charts/ChartSkeleton";
import { StoryDecorator } from "~/stories/decorators";

export default {
  title: "Charts/UI/ChartSkeleton",
};

export const Default: Story = () => {
  return (
    <StoryDecorator>
      <ChartSkeleton />
    </StoryDecorator>
  );
};

Default.storyName = "Default - Standard loading state";

export const Loading: Story = () => {
  return (
    <StoryDecorator>
      <ChartSkeleton />
    </StoryDecorator>
  );
};

Loading.storyName = "Loading - Basic skeleton";

export const WithMessage: Story = () => {
  return (
    <StoryDecorator>
      <ChartSkeleton
        message="Loading family tree data..."
        estimatedTime="~3 seconds"
      />
    </StoryDecorator>
  );
};

WithMessage.storyName = "With Message - Custom loading message";

export const LongLoad: Story = () => {
  return (
    <StoryDecorator>
      <ChartSkeleton
        message="Processing large family tree"
        estimatedTime="~15 seconds"
      />
    </StoryDecorator>
  );
};

LongLoad.storyName = "Long Load - Extended loading state";
