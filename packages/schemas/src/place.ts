import { z } from "zod";

export const placeTypeEnum = z.enum([
  "COUNTRY",
  "STATE",
  "COUNTY",
  "CITY",
  "TOWN",
  "VILLAGE",
  "PARISH",
  "DISTRICT",
  "REGION",
  "PROVINCE",
  "TERRITORY",
  "OTHER",
]);

export const personPlaceTypeEnum = z.enum([
  "BIRTH",
  "MARRIAGE",
  "DEATH",
  "LIVED",
  "WORKED",
  "STUDIED",
  "OTHER",
]);

export const placeCreateSchema = z.object({
  name: z.string().min(1, "Place name is required").max(255),
  placeType: placeTypeEnum,
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  parentId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  alternativeNames: z
    .array(z.string())
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
}) as z.ZodType<{
  name: string;
  placeType: z.infer<typeof placeTypeEnum>;
  latitude?: number | null;
  longitude?: number | null;
  parentId?: string | null;
  description?: string | null;
  alternativeNames?: Array<string> | null;
}>;

export const placeUpdateSchema = z.object({
  id: z.string().min(1, "Place ID is required"),
  name: z.string().min(1, "Place name is required").max(255).optional(),
  placeType: placeTypeEnum.optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  parentId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  alternativeNames: z
    .array(z.string())
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
}) as z.ZodType<{
  id: string;
  name?: string;
  placeType?: z.infer<typeof placeTypeEnum>;
  latitude?: number | null;
  longitude?: number | null;
  parentId?: string | null;
  description?: string | null;
  alternativeNames?: Array<string> | null;
}>;

export const placePersonLinkCreateSchema = z.object({
  personId: z.string().min(1, "Person ID is required"),
  placeId: z.string().min(1, "Place ID is required"),
  fromYear: z.number().int().optional().nullable(),
  toYear: z.number().int().optional().nullable(),
  type: personPlaceTypeEnum.optional().nullable(),
}) as z.ZodType<{
  personId: string;
  placeId: string;
  fromYear?: number | null;
  toYear?: number | null;
  type?: z.infer<typeof personPlaceTypeEnum> | null;
}>;

export type PlaceType = z.infer<typeof placeTypeEnum>;
export type PersonPlaceType = z.infer<typeof personPlaceTypeEnum>;
export type PlaceCreateInput = z.infer<typeof placeCreateSchema>;
export type PlaceCreateFormInput = z.input<typeof placeCreateSchema>;
export type PlaceUpdateInput = z.infer<typeof placeUpdateSchema>;
export type PlaceUpdateFormInput = z.input<typeof placeUpdateSchema>;
export type PlacePersonLinkCreateInput = z.infer<
  typeof placePersonLinkCreateSchema
>;
