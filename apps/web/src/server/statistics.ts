import { createServerFn } from "@tanstack/react-start";
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { count, eq, gte, sql } from "drizzle-orm";
import { requireAuth } from "./middleware/require-auth";

/** Type for the database instance (for DI) */
export type StatisticsDb = typeof drizzleDb;

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
 * Extracts statistics data with dependency injection
 *
 * Aggregates statistics about people in the family tree:
 * - Total count
 * - Living vs deceased breakdown
 * - Gender distribution (Male/Female/Unknown)
 * - Recent additions (last 7 and 30 days)
 *
 * @param db - Database instance (injected, defaults to drizzleDb)
 * @returns People statistics
 */
export async function getPeopleStatisticsData(
  db: StatisticsDb = drizzleDb
): Promise<PeopleStatistics> {
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
    db.select({ count: count() }).from(drizzleSchema.persons),
    db
      .select({ count: count() })
      .from(drizzleSchema.persons)
      .where(eq(drizzleSchema.persons.isLiving, true)),
    db
      .select({ count: count() })
      .from(drizzleSchema.persons)
      .where(eq(drizzleSchema.persons.isLiving, false)),
    db
      .select({ count: count() })
      .from(drizzleSchema.persons)
      .where(eq(drizzleSchema.persons.gender, "MALE")),
    db
      .select({ count: count() })
      .from(drizzleSchema.persons)
      .where(eq(drizzleSchema.persons.gender, "FEMALE")),
    db
      .select({ count: count() })
      .from(drizzleSchema.persons)
      .where(
        sql`${drizzleSchema.persons.gender} IS NULL OR ${drizzleSchema.persons.gender} IN ('OTHER', 'PREFER_NOT_TO_SAY')`
      ),
    db
      .select({ count: count() })
      .from(drizzleSchema.persons)
      .where(gte(drizzleSchema.persons.createdAt, sevenDaysAgo)),
    db
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

/**
 * Server function: Get people statistics
 *
 * @returns People statistics
 * @requires VIEWER role or higher
 */
export const getPeopleStatistics = createServerFn({ method: "GET" }).handler(
  async (): Promise<PeopleStatistics> => {
    await requireAuth("VIEWER");
    return getPeopleStatisticsData();
  }
);
