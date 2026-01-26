import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./middleware/require-auth";
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq, count, gte, sql } from "drizzle-orm";

/**
 * People statistics result interface
 */
export interface PeopleStatistics {
  total: number;
  living: number;
  deceased: number;
  male: number;
  female: number;
  unknown: number;
  recentAdditions: {
    last7Days: number;
    last30Days: number;
  };
}

/**
 * Server function: Get people statistics
 *
 * Aggregates statistics about people in the family tree:
 * - Total count
 * - Living vs deceased breakdown
 * - Gender distribution (Male/Female/Unknown)
 * - Recent additions (last 7 and 30 days)
 *
 * @returns People statistics
 * @requires VIEWER role or higher
 */
export const getPeopleStatistics = createServerFn({ method: "GET" }).handler(
  async (): Promise<PeopleStatistics> => {
    await requireAuth("VIEWER");

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalResult,
      livingResult,
      deceasedResult,
      maleResult,
      femaleResult,
      unknownResult,
      recent7DaysResult,
      recent30DaysResult,
    ] = await Promise.all([
      drizzleDb.select({ count: count() }).from(drizzleSchema.persons),
      drizzleDb
        .select({ count: count() })
        .from(drizzleSchema.persons)
        .where(eq(drizzleSchema.persons.isLiving, true)),
      drizzleDb
        .select({ count: count() })
        .from(drizzleSchema.persons)
        .where(eq(drizzleSchema.persons.isLiving, false)),
      drizzleDb
        .select({ count: count() })
        .from(drizzleSchema.persons)
        .where(eq(drizzleSchema.persons.gender, "MALE")),
      drizzleDb
        .select({ count: count() })
        .from(drizzleSchema.persons)
        .where(eq(drizzleSchema.persons.gender, "FEMALE")),
      drizzleDb
        .select({ count: count() })
        .from(drizzleSchema.persons)
        .where(
          sql`${drizzleSchema.persons.gender} IS NULL OR ${drizzleSchema.persons.gender} IN ('OTHER', 'PREFER_NOT_TO_SAY')`
        ),
      drizzleDb
        .select({ count: count() })
        .from(drizzleSchema.persons)
        .where(gte(drizzleSchema.persons.createdAt, sevenDaysAgo)),
      drizzleDb
        .select({ count: count() })
        .from(drizzleSchema.persons)
        .where(gte(drizzleSchema.persons.createdAt, thirtyDaysAgo)),
    ]);

    return {
      total: totalResult[0]?.count ?? 0,
      living: livingResult[0]?.count ?? 0,
      deceased: deceasedResult[0]?.count ?? 0,
      male: maleResult[0]?.count ?? 0,
      female: femaleResult[0]?.count ?? 0,
      unknown: unknownResult[0]?.count ?? 0,
      recentAdditions: {
        last7Days: recent7DaysResult[0]?.count ?? 0,
        last30Days: recent30DaysResult[0]?.count ?? 0,
      },
    };
  }
);
