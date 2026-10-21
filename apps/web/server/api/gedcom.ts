import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { errorResponseSchema } from "@vamsa/schemas";
import {
  exportGedcomData,
  exportGedcomDataZip,
  importGedcomData,
  validateGedcomImport,
} from "@vamsa/lib/server/business";
import { jsonBody, jsonRoute, respond } from "./route-helpers";

const TAG = "GEDCOM";
const gedcomRouter = new OpenAPIHono();

/** GEDCOM upload: the file name (must end in .ged) and its text content. */
const fileBody = z
  .object({
    fileName: z.string().min(1).openapi({ example: "family.ged" }),
    content: z.string().min(1).openapi({ description: "GEDCOM file text" }),
  })
  .openapi("GedcomFile");

gedcomRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/validate",
    tag: TAG,
    summary: "Validate a GEDCOM file without importing",
    description: "Returns people/family counts and structural errors.",
    operationId: "validateGedcom",
    request: { body: jsonBody(fileBody) },
  }),
  (c) => {
    const { fileName, content } = c.req.valid("json");
    return respond(c, () => validateGedcomImport(fileName, content));
  }
);

gedcomRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/import",
    tag: TAG,
    summary: "Import a GEDCOM file",
    description:
      "Adds the file's people and relationships. Responds 200 with success=false and errors when the file is rejected.",
    operationId: "importGedcom",
    request: { body: jsonBody(fileBody) },
  }),
  (c) => {
    const { fileName, content } = c.req.valid("json");
    return respond(c, () =>
      importGedcomData(fileName, content, c.get("user").id)
    );
  }
);

const errors = {
  401: {
    description: "Not authenticated",
    content: { "application/json": { schema: errorResponseSchema } },
  },
  403: {
    description: "Requires ADMIN",
    content: { "application/json": { schema: errorResponseSchema } },
  },
  500: {
    description: "Export failed",
    content: { "application/json": { schema: errorResponseSchema } },
  },
};

const stamp = () => new Date().toISOString().slice(0, 10);

gedcomRouter.openapi(
  createRoute({
    method: "get",
    path: "/export",
    tags: [TAG],
    summary: "Export the family tree as a GEDCOM file",
    operationId: "exportGedcom",
    responses: {
      200: {
        description: "GEDCOM 5.5.1 text",
        content: { "text/plain": { schema: z.string() } },
      },
      ...errors,
    },
  }),
  async (c) => {
    const result = await exportGedcomData(c.get("user").id);
    if (!result.success || result.gedcomContent === undefined) {
      return c.json({ error: result.message }, 500);
    }
    return c.body(result.gedcomContent, 200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="vamsa-${stamp()}.ged"`,
    }) as never; // raw body, typed as text in the spec
  }
);

gedcomRouter.openapi(
  createRoute({
    method: "get",
    path: "/export.zip",
    tags: [TAG],
    summary: "Export as a GEDZip archive (GEDCOM plus media)",
    operationId: "exportGedcomZip",
    request: {
      query: z.object({
        media: z
          .enum(["true", "false"])
          .default("true")
          .openapi({ description: "Include media files" }),
      }),
    },
    responses: {
      200: {
        description: "ZIP archive",
        content: {
          "application/zip": {
            schema: z.string().openapi({ format: "binary" }),
          },
        },
      },
      ...errors,
    },
  }),
  async (c) => {
    const includeMedia = c.req.valid("query").media === "true";
    const result = await exportGedcomDataZip(c.get("user").id, includeMedia);
    if (!result.success || !result.zipBase64) {
      return c.json({ error: result.message }, 500);
    }
    const bytes = Buffer.from(result.zipBase64, "base64");
    return c.body(new Uint8Array(bytes), 200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="vamsa-${stamp()}.zip"`,
    }); // binary body
  }
);

export default gedcomRouter;
