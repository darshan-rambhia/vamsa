import { z } from "zod";

export const genderEnum = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
]);

export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export const socialLinksSchema = z.object({
  facebook: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  linkedin: z.string().url().optional().or(z.literal("")),
  instagram: z.string().url().optional().or(z.literal("")),
  other: z.string().url().optional().or(z.literal("")),
});

export const personCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  maidenName: z.string().optional(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  dateOfPassing: z.coerce.date().optional().nullable(),
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
});

export const personUpdateSchema = personCreateSchema.partial();

export type PersonCreateInput = z.infer<typeof personCreateSchema>;
export type PersonUpdateInput = z.infer<typeof personUpdateSchema>;
export type Gender = z.infer<typeof genderEnum>;
export type Address = z.infer<typeof addressSchema>;
export type SocialLinks = z.infer<typeof socialLinksSchema>;
