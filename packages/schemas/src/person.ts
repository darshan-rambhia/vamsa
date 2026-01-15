import { z } from "@hono/zod-openapi";
import { parseDateString } from "@vamsa/lib";

export const genderEnum = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
]);

export const addressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .openapi({
    description: "Address information",
  });

export const socialLinksSchema = z
  .object({
    facebook: z.string().url().optional().or(z.literal("")),
    twitter: z.string().url().optional().or(z.literal("")),
    linkedin: z.string().url().optional().or(z.literal("")),
    instagram: z.string().url().optional().or(z.literal("")),
    other: z.string().url().optional().or(z.literal("")),
  })
  .openapi({
    description: "Social media links",
  });

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

export const personCreateSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    maidenName: z.string().optional(),
    dateOfBirth: dateSchema.optional().nullable(),
    dateOfPassing: dateSchema.optional().nullable(),
    birthPlace: z.string().optional(),
    nativePlace: z.string().optional(),
    gender: genderEnum.optional().nullable(),
    bio: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    currentAddress: addressSchema.optional().nullable(),
    workAddress: addressSchema.optional().nullable(),
    profession: z.string().optional(),
    employer: z.string().optional(),
    socialLinks: socialLinksSchema.optional().nullable(),
    isLiving: z.boolean().default(true),
  })
  .openapi({
    description: "Person creation data",
  });

export const personUpdateSchema = personCreateSchema.partial();

export type PersonCreateInput = z.infer<typeof personCreateSchema>;
export type PersonCreateFormInput = z.input<typeof personCreateSchema>;
export type PersonUpdateInput = z.infer<typeof personUpdateSchema>;
export type PersonUpdateFormInput = z.input<typeof personUpdateSchema>;
export type Gender = z.infer<typeof genderEnum>;
export type Address = z.infer<typeof addressSchema>;
export type SocialLinks = z.infer<typeof socialLinksSchema>;
