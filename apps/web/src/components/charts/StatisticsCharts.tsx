"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@vamsa/ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatisticsResult } from "~/server/charts";

interface StatisticsChartsProps {
  data: StatisticsResult;
}

// Color palette for charts - using Vamsa earth tones
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Gender colors using earth tones (forest greens, bark browns, warm creams)
// Avoiding bright pink/blue - using design-system appropriate colors
const GENDER_COLORS: Record<string, string> = {
  Male: "hsl(145, 45%, 38%)", // Forest green
  Female: "hsl(30, 55%, 45%)", // Warm amber/bark brown
  Other: "hsl(85, 35%, 45%)", // Sage/olive green
  "Not Specified": "hsl(40, 40%, 65%)", // Warm cream/beige
  Unknown: "hsl(30, 15%, 55%)", // Muted taupe
};

// Custom tooltip style
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  padding: "8px 12px",
  color: "hsl(var(--foreground))",
};

// Custom label renderer for pie chart
interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  gender: string;
  percentage: number;
}

const renderPieLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  gender,
  percentage,
}: PieLabelProps) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="hsl(var(--foreground))"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
    >
      {`${gender}: ${percentage}%`}
    </text>
  );
};

export function StatisticsCharts({ data }: StatisticsChartsProps) {
  const {
    ageDistribution,
    generationSizes,
    genderDistribution,
    geographicDistribution,
    surnameFrequency,
    lifespanTrends,
    metadata,
  } = data;

  // Convert genderDistribution to plain objects for Recharts
  const genderData = genderDistribution.map((d) => ({
    gender: d.gender,
    count: d.count,
    percentage: d.percentage,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-muted-foreground text-sm font-medium">
              Total People
            </div>
            <div className="font-display text-3xl font-bold">
              {metadata.totalPeople}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-muted-foreground text-sm font-medium">
              Living
            </div>
            <div className="font-display text-primary text-3xl font-bold">
              {metadata.livingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-muted-foreground text-sm font-medium">
              Deceased
            </div>
            <div className="text-muted-foreground font-display text-3xl font-bold">
              {metadata.deceasedCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-muted-foreground text-sm font-medium">
              Oldest Living
            </div>
            <div className="font-display text-xl font-bold">
              {metadata.oldestPerson
                ? `${metadata.oldestPerson.name} (${metadata.oldestPerson.age})`
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Age Distribution - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {ageDistribution.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageDistribution}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="bracket"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="count"
                    name="Count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-75 items-center justify-center">
                <p className="text-muted-foreground">No age data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gender Distribution - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey="count"
                    nameKey="gender"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={renderPieLabel as unknown as boolean}
                    labelLine={false}
                  >
                    {genderData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          GENDER_COLORS[entry.gender] ||
                          COLORS[index % COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-75 items-center justify-center">
                <p className="text-muted-foreground">
                  No gender data available
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generation Sizes - Stacked Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Generation Sizes</CardTitle>
          </CardHeader>
          <CardContent>
            {generationSizes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={generationSizes}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="generation"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `Gen ${value}`}
                  />
                  <YAxis
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    formatter={(value) =>
                      value === "livingCount" ? "Living" : "Deceased"
                    }
                  />
                  <Bar
                    dataKey="livingCount"
                    name="Living"
                    stackId="a"
                    fill="hsl(var(--primary))"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="deceasedCount"
                    name="Deceased"
                    stackId="a"
                    fill="hsl(var(--muted-foreground))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-75 items-center justify-center">
                <p className="text-muted-foreground">
                  No generation data available
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Surname Frequency - Horizontal Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Surnames</CardTitle>
          </CardHeader>
          <CardContent>
            {surnameFrequency.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={surnameFrequency.slice(0, 10)}
                  layout="vertical"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    type="number"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    dataKey="surname"
                    type="category"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, props) => {
                      const payload = props.payload as { percentage?: number };
                      return [
                        `${value} (${payload.percentage ?? 0}%)`,
                        "Count",
                      ];
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Count"
                    fill="hsl(var(--chart-2))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-75 items-center justify-center">
                <p className="text-muted-foreground">
                  No surname data available
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Geographic Distribution - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Birth Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {geographicDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={geographicDistribution} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    type="number"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    dataKey="location"
                    type="category"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, props) => {
                      const payload = props.payload as { percentage?: number };
                      return [
                        `${value} (${payload.percentage ?? 0}%)`,
                        "Count",
                      ];
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Count"
                    fill="hsl(var(--chart-3))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-75 items-center justify-center">
                <p className="text-muted-foreground">
                  No location data available
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lifespan Trends - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Lifespan Trends by Birth Decade</CardTitle>
          </CardHeader>
          <CardContent>
            {lifespanTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lifespanTrends}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="decade"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 12,
                    }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    domain={[0, 100]}
                    label={{
                      value: "Years",
                      angle: -90,
                      position: "insideLeft",
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, _name, props) => {
                      const payload = props.payload as { sampleSize?: number };
                      return [
                        `${value} years (n=${payload.sampleSize ?? 0})`,
                        "Average Lifespan",
                      ];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageLifespan"
                    name="Average Lifespan"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--chart-4))", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-75 items-center justify-center">
                <p className="text-muted-foreground">
                  No lifespan data available (requires deceased members with
                  birth and death dates)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
