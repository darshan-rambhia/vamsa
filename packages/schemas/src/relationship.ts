import { z } from "@hono/zod-openapi";
import { parseDateString } from "@vamsa/lib";

export const relationshipTypeEnum = z.enum([
  "PARENT",
  "CHILD",
  "SPOUSE",
  "SIBLING",
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

export const relationshipCreateSchema = z.object({
  personId: z.string().min(1, "Person is required"),
  relatedPersonId: z.string().min(1, "Related person is required"),
  type: relationshipTypeEnum,
  marriageDate: dateSchema.optional().nullable(),
  divorceDate: dateSchema.optional().nullable(),
  isActive: z.boolean().optional().default(true),
}).openapi({
  description: "Relationship creation data",
});

export const relationshipUpdateSchema = relationshipCreateSchema.partial();

export type RelationshipType = z.infer<typeof relationshipTypeEnum>;
export type RelationshipCreateInput = z.input<typeof relationshipCreateSchema>;
export type RelationshipUpdateInput = z.infer<typeof relationshipUpdateSchema>;
