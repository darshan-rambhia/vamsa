import type { Story } from "@ladle/react";
import { StatisticsCharts } from "~/components/charts/StatisticsCharts";
import { StoryDecorator } from "~/stories/decorators";
import { createStatisticsData } from "~/stories/mocks/chart-data";

export default {
  title: "Charts/StatisticsCharts",
};

export const Default: Story = () => {
  const data = createStatisticsData(false);

  return (
    <StoryDecorator>
      <StatisticsCharts data={data} />
    </StoryDecorator>
  );
};

Default.storyName = "Default - All statistics";

export const AllData: Story = () => {
  const data = createStatisticsData(false);

  return (
    <StoryDecorator>
      <StatisticsCharts data={data} />
    </StoryDecorator>
  );
};

AllData.storyName = "All Data - Complete data set";

export const PartialData: Story = () => {
  const data = createStatisticsData(true);

  return (
    <StoryDecorator>
      <StatisticsCharts data={data} />
    </StoryDecorator>
  );
};

PartialData.storyName = "Partial Data - Some missing fields";

export const NoData: Story = () => {
  const emptyData = {
    ...createStatisticsData(false),
    ageDistribution: [],
    generationSizes: [],
    genderDistribution: [],
    geographicDistribution: [],
    surnameFrequency: [],
    lifespanTrends: [],
    metadata: {
      ...createStatisticsData(false).metadata,
      totalPeople: 0,
      livingCount: 0,
      deceasedCount: 0,
      oldestPerson: null,
      youngestPerson: null,
    },
  };

  return (
    <StoryDecorator>
      <StatisticsCharts data={emptyData} />
    </StoryDecorator>
  );
};

NoData.storyName = "No Data - Empty state";

export const MissingDemographics: Story = () => {
  const data = {
    ...createStatisticsData(false),
    geographicDistribution: [],
    genderDistribution: [],
  };

  return (
    <StoryDecorator>
      <StatisticsCharts data={data} />
    </StoryDecorator>
  );
};

MissingDemographics.storyName =
  "Missing Demographics - No location/gender data";
