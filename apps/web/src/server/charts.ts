/**
 * Chart Server Functions - Framework Wrappers
 *
 * This module contains thin `createServerFn` wrappers that call the business logic
 * functions from charts.server.ts. These wrappers handle:
 * - Input validation with Zod schemas
 * - Calling the corresponding server function
 * - Authentication (delegated to server layer via requireAuth)
 * - Error handling
 *
 * This layer is excluded from unit test coverage as it's framework integration code.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  exportChartAsPDF,
  exportChartAsSVG,
  getAncestorChartData,
  getBowtieChartData,
  getCompactTreeData,
  getDescendantChartData,
  getFanChartData,
  getHourglassChartData,
  getRelationshipMatrixData,
  getStatisticsData,
  getTimelineChartData,
  getTreeChartData,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";
import type {
  BowtieChartResult,
  BowtieNode,
  ChartEdge,
  ChartLayoutResult,
  ChartNode,
  CompactTreeResult,
  MatrixCell,
  MatrixPerson,
  RelationshipMatrixResult,
  StatisticsResult,
  TimelineChartResult,
  TimelineEntry,
} from "@vamsa/lib/server/business";

// Re-export types for use by stories and other client code
export type {
  ChartNode,
  ChartEdge,
  ChartLayoutResult,
  TimelineEntry,
  TimelineChartResult,
  MatrixCell,
  MatrixPerson,
  RelationshipMatrixResult,
  BowtieNode,
  BowtieChartResult,
  CompactTreeResult,
  StatisticsResult,
};

// Validation schemas
const ancestorChartSchema = z.object({
  personId: z.string(),
  generations: z.number().int().min(1).max(10).default(3),
});

const descendantChartSchema = z.object({
  personId: z.string(),
  generations: z.number().int().min(1).max(10).default(3),
});

const hourglassChartSchema = z.object({
  personId: z.string(),
  ancestorGenerations: z.number().int().min(1).max(10).default(2),
  descendantGenerations: z.number().int().min(1).max(10).default(2),
});

const fanChartSchema = z.object({
  personId: z.string(),
  generations: z.number().int().min(1).max(10).default(4),
});

const timelineChartSchema = z.object({
  startYear: z.number().int().optional(),
  endYear: z.number().int().optional(),
  sortBy: z.enum(["birth", "death", "name"]).default("birth"),
});

const relationshipMatrixSchema = z.object({
  personIds: z.array(z.string()).optional(),
  maxPeople: z.number().int().min(1).max(50).default(20),
});

const bowtieChartSchema = z.object({
  personId: z.string(),
  generations: z.number().int().min(1).max(10).default(3),
});

const compactTreeSchema = z.object({
  personId: z.string(),
  generations: z.number().int().min(1).max(10).default(5),
});

const statisticsSchema = z.object({
  includeDeceased: z.boolean().default(true),
});

const treeChartSchema = z.object({
  personId: z.string(),
  ancestorGenerations: z.number().int().min(1).max(10).default(2),
  descendantGenerations: z.number().int().min(1).max(10).default(2),
});

const exportChartSchema = z.object({
  chartType: z.string(),
  chartData: z.unknown(),
});

/**
 * Get ancestor chart - ancestors going back N generations
 */
export const getAncestorChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof ancestorChartSchema>) => {
    return ancestorChartSchema.parse(data);
  })
  .handler(async ({ data }): Promise<ChartLayoutResult> => {
    await requireAuth("VIEWER");

    const { personId, generations } = data;
    return getAncestorChartData(personId, generations);
  });

/**
 * Get descendant chart - descendants going forward N generations
 */
export const getDescendantChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof descendantChartSchema>) => {
    return descendantChartSchema.parse(data);
  })
  .handler(async ({ data }): Promise<ChartLayoutResult> => {
    await requireAuth("VIEWER");

    const { personId, generations } = data;
    return getDescendantChartData(personId, generations);
  });

/**
 * Get hourglass chart - both ancestors and descendants combined
 */
export const getHourglassChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof hourglassChartSchema>) => {
    return hourglassChartSchema.parse(data);
  })
  .handler(async ({ data }): Promise<ChartLayoutResult> => {
    await requireAuth("VIEWER");

    const { personId, ancestorGenerations, descendantGenerations } = data;
    return getHourglassChartData(
      personId,
      ancestorGenerations,
      descendantGenerations
    );
  });

/**
 * Get fan chart - ancestors in radial/fan layout pattern
 */
export const getFanChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof fanChartSchema>) => {
    return fanChartSchema.parse(data);
  })
  .handler(async ({ data }): Promise<ChartLayoutResult> => {
    await requireAuth("VIEWER");

    const { personId, generations } = data;
    return getFanChartData(personId, generations);
  });

/**
 * Get timeline chart - horizontal timeline showing lifespans
 */
export const getTimelineChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof timelineChartSchema>) => {
    return timelineChartSchema.parse(data);
  })
  .handler(async ({ data }): Promise<TimelineChartResult> => {
    await requireAuth("VIEWER");

    const { startYear, endYear, sortBy } = data;
    return getTimelineChartData(startYear, endYear, sortBy);
  });

/**
 * Get relationship matrix - grid showing relationships between people
 */
export const getRelationshipMatrix = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof relationshipMatrixSchema>) => {
    return relationshipMatrixSchema.parse(data);
  })
  .handler(async ({ data }): Promise<RelationshipMatrixResult> => {
    await requireAuth("VIEWER");

    const { personIds, maxPeople } = data;
    return getRelationshipMatrixData(personIds, maxPeople);
  });

/**
 * Get bowtie chart - dual ancestry showing paternal and maternal lines
 */
export const getBowtieChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof bowtieChartSchema>) => {
    return bowtieChartSchema.parse(data);
  })
  .handler(async ({ data }): Promise<BowtieChartResult> => {
    await requireAuth("VIEWER");

    const { personId, generations } = data;
    return getBowtieChartData(personId, generations);
  });

/**
 * Get compact tree - hierarchical tree structure for collapsible view
 */
export const getCompactTree = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof compactTreeSchema>) => {
    return compactTreeSchema.parse(data);
  })
  .handler(async ({ data }): Promise<CompactTreeResult> => {
    await requireAuth("VIEWER");

    const { personId, generations } = data;
    return getCompactTreeData(personId, generations);
  });

/**
 * Get statistics - aggregated demographic data for charts
 */
export const getStatistics = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof statisticsSchema>) => {
    return statisticsSchema.parse(data);
  })
  .handler(async ({ data }): Promise<StatisticsResult> => {
    await requireAuth("VIEWER");

    const { includeDeceased } = data;
    return getStatisticsData(includeDeceased);
  });

/**
 * Get tree chart - full family tree with both ancestors and descendants
 */
export const getTreeChart = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof treeChartSchema>) => {
    return treeChartSchema.parse(data);
  })
  .handler(async ({ data }): Promise<ChartLayoutResult> => {
    await requireAuth("VIEWER");

    const { personId, ancestorGenerations, descendantGenerations } = data;
    return getTreeChartData(
      personId,
      ancestorGenerations,
      descendantGenerations
    );
  });

/**
 * Export chart as PDF
 */
export const exportChartPDF = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof exportChartSchema>) => {
    return exportChartSchema.parse(data);
  })
  .handler(async ({ data }): Promise<Buffer> => {
    await requireAuth("VIEWER");

    const { chartType, chartData } = data;
    return exportChartAsPDF(chartType, chartData);
  });

/**
 * Export chart as SVG
 */
export const exportChartSVG = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof exportChartSchema>) => {
    return exportChartSchema.parse(data);
  })
  .handler(async ({ data }): Promise<string> => {
    await requireAuth("VIEWER");

    const { chartType, chartData } = data;
    return exportChartAsSVG(chartType, chartData);
  });

// Alias exports for backward compatibility
export {
  getCompactTree as getCompactTreeData,
  getStatistics as getStatisticsData,
};
