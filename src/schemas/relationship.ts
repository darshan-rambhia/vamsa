import { z } from "zod";
import { parseDateString } from "@/lib/utils";

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
  });

export const relationshipCreateSchema = z.object({
  personId: z.string().min(1, "Person is required"),
  relatedPersonId: z.string().min(1, "Related person is required"),
  type: relationshipTypeEnum,
  marriageDate: dateSchema.optional().nullable(),
  divorceDate: dateSchema.optional().nullable(),
  isActive: z.boolean().default(true),
});

export const relationshipUpdateSchema = relationshipCreateSchema.partial();

export type RelationshipType = z.infer<typeof relationshipTypeEnum>;
export type RelationshipCreateInput = z.infer<typeof relationshipCreateSchema>;
export type RelationshipUpdateInput = z.infer<typeof relationshipUpdateSchema>;
