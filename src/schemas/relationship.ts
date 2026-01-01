import { z } from "zod";

export const relationshipTypeEnum = z.enum([
  "PARENT",
  "CHILD",
  "SPOUSE",
  "SIBLING",
]);

export const relationshipCreateSchema = z.object({
  personId: z.string().min(1, "Person is required"),
  relatedPersonId: z.string().min(1, "Related person is required"),
  type: relationshipTypeEnum,
  marriageDate: z.coerce.date().optional().nullable(),
  divorceDate: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const relationshipUpdateSchema = relationshipCreateSchema.partial();

export type RelationshipType = z.infer<typeof relationshipTypeEnum>;
export type RelationshipCreateInput = z.infer<typeof relationshipCreateSchema>;
export type RelationshipUpdateInput = z.infer<typeof relationshipUpdateSchema>;
