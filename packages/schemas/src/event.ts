import { z } from "@hono/zod-openapi";
import { parseDateString } from "@vamsa/lib";

export const eventTypeEnum = z.enum([
  "BIRTH",
  "DEATH",
  "MARRIAGE",
  "DIVORCE",
  "BURIAL",
  "GRADUATION",
  "ENGAGEMENT",
  "DIVORCE_FILED",
  "ADOPTION",
  "CONFIRMATION",
  "IMMIGRATION",
  "EMIGRATION",
  "NATURALIZATION",
  "RESIDENCE",
  "CUSTOM",
]);

const dateSchema = z
  .union([z.string(), z.date(), z.null(), z.undefined()])
  .transform((val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    return parseDateString(val);
  })
  .openapi({
    type: "string",
    format: "date",
    description: "Date in ISO format (YYYY-MM-DD) or Date object",
  });

export const eventCreateSchema = z.object({
  personId: z.string().min(1, "Person is required"),
  type: eventTypeEnum,
  date: dateSchema.optional().nullable(),
  place: z.string().optional(),
  description: z.string().optional(),
}) as z.ZodType<{
  personId: string;
  type: z.infer<typeof eventTypeEnum>;
  date?: Date | null;
  place?: string;
  description?: string;
}>;

export const eventUpdateSchema = z.object({
  id: z.string().min(1, "Event ID is required"),
  type: eventTypeEnum.optional(),
  date: dateSchema.optional().nullable(),
  place: z.string().optional(),
  description: z.string().optional(),
}) as z.ZodType<{
  id: string;
  type?: z.infer<typeof eventTypeEnum>;
  date?: Date | null;
  place?: string;
  description?: string;
}>;

export const eventParticipantCreateSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  personId: z.string().min(1, "Person is required"),
  role: z.string().optional(),
}) as z.ZodType<{
  eventId: string;
  personId: string;
  role?: string;
}>;

export const eventParticipantRemoveSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  personId: z.string().min(1, "Person is required"),
}) as z.ZodType<{
  eventId: string;
  personId: string;
}>;

export type EventType = z.infer<typeof eventTypeEnum>;
export type EventCreateInput = z.input<typeof eventCreateSchema>;
export type EventCreateOutput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.input<typeof eventUpdateSchema>;
export type EventUpdateOutput = z.infer<typeof eventUpdateSchema>;
export type EventParticipantCreateInput = z.infer<
  typeof eventParticipantCreateSchema
>;
export type EventParticipantRemoveInput = z.infer<
  typeof eventParticipantRemoveSchema
>;
