import { z } from "zod";

export const mediaFormatEnum = z.enum([
  "JPEG",
  "PNG",
  "GIF",
  "WEBP",
  "PDF",
  "TIFF",
  "BMP",
  "SVG",
]);

export const mediaUploadSchema = z.object({
  personId: z.string().min(1, "Person ID is required"),
  file: z.object({
    name: z.string().min(1),
    size: z.number().positive("File size must be positive"),
    type: z.string().min(1),
  }),
  title: z.string().optional(),
  description: z.string().optional(),
  source: z.string().optional(),
});

export const mediaMetadataSchema = z.object({
  mediaId: z.string().min(1, "Media ID is required"),
  title: z.string().optional(),
  description: z.string().optional(),
  caption: z.string().optional(),
  source: z.string().optional(),
});

export const mediaReorderSchema = z.object({
  personId: z.string().min(1, "Person ID is required"),
  ordering: z.array(
    z.object({
      mediaId: z.string().min(1),
      order: z.number().int().nonnegative(),
    })
  ),
});

export const linkMediaToEventSchema = z.object({
  mediaId: z.string().min(1, "Media ID is required"),
  eventId: z.string().min(1, "Event ID is required"),
});

export const setPrimaryPhotoSchema = z.object({
  personId: z.string().min(1, "Person ID is required"),
  mediaId: z.string().min(1, "Media ID is required"),
});

export type MediaFormat = z.infer<typeof mediaFormatEnum>;
export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;
export type MediaMetadataInput = z.infer<typeof mediaMetadataSchema>;
export type MediaReorderInput = z.infer<typeof mediaReorderSchema>;
export type LinkMediaToEventInput = z.infer<typeof linkMediaToEventSchema>;
export type SetPrimaryPhotoInput = z.infer<typeof setPrimaryPhotoSchema>;
