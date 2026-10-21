import { z } from "@hono/zod-openapi";
import {
  citationFormatEnum,
  confidenceEnum,
  sourceCreateSchema,
  sourceUpdateSchema,
} from "@vamsa/schemas";
import {
  createSourceData,
  deleteSourceData,
  generateCitationData,
  getSourceData,
  linkSourceToEventData,
  listSourcesData,
  updateSourceData,
} from "@vamsa/lib/server/business";
import {
  createRouter,
  idParam,
  jsonBody,
  jsonRoute,
  respond,
} from "./route-helpers";

const TAG = "Sources";

// The shared schema's accessDate union (with z.undefined) can't be rendered
// to OpenAPI; accept an ISO date string instead, which the business layer takes.
const accessDate = z
  .union([z.string().date(), z.string().datetime({ offset: true })])
  .nullable()
  .optional()
  .openapi({
    type: "string",
    description: "ISO date (YYYY-MM-DD) or ISO date-time",
    example: "2024-05-01",
  });
const createBody = sourceCreateSchema.extend({ accessDate });
const updateBody = sourceUpdateSchema.omit({ id: true }).extend({ accessDate });

const sourcesRouter = createRouter();

sourcesRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/",
    tag: TAG,
    summary: "List sources",
    operationId: "listSources",
    request: {
      query: z.object({
        type: z.string().optional(),
        personId: z.string().optional(),
      }),
    },
  }),
  (c) => {
    const { type, personId } = c.req.valid("query");
    return respond(c, () => listSourcesData(type, personId));
  }
);

sourcesRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/{id}",
    tag: TAG,
    summary: "Get a source",
    operationId: "getSource",
    request: { params: idParam() },
  }),
  (c) => respond(c, () => getSourceData(c.req.valid("param").id))
);

sourcesRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/",
    tag: TAG,
    summary: "Create a source",
    operationId: "createSource",
    request: { body: jsonBody(createBody) },
    status: 201,
  }),
  (c) => respond(c, () => createSourceData(c.req.valid("json")), 201)
);

sourcesRouter.openapi(
  jsonRoute({
    method: "put",
    path: "/{id}",
    tag: TAG,
    summary: "Update a source",
    operationId: "updateSource",
    request: {
      params: idParam(),
      body: jsonBody(updateBody),
    },
  }),
  (c) =>
    respond(c, () =>
      updateSourceData(c.req.valid("param").id, c.req.valid("json"))
    )
);

sourcesRouter.openapi(
  jsonRoute({
    method: "delete",
    path: "/{id}",
    tag: TAG,
    summary: "Delete a source",
    operationId: "deleteSource",
    request: { params: idParam() },
  }),
  (c) => respond(c, () => deleteSourceData(c.req.valid("param").id))
);

sourcesRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/{id}/events",
    tag: TAG,
    summary: "Cite a source on a person's event",
    operationId: "linkSourceToEvent",
    request: {
      params: idParam(),
      body: jsonBody(
        z.object({
          personId: z.string().min(1),
          eventType: z.string().min(1),
          confidence: confidenceEnum.optional(),
          sourceNotes: z.string().optional(),
        })
      ),
    },
    status: 201,
  }),
  (c) =>
    respond(
      c,
      () =>
        linkSourceToEventData({
          sourceId: c.req.valid("param").id,
          ...c.req.valid("json"),
        }),
      201
    )
);

sourcesRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/{id}/citation",
    tag: TAG,
    summary: "Format a citation for a source",
    operationId: "getSourceCitation",
    request: {
      params: idParam(),
      query: z.object({ format: citationFormatEnum.default("MLA") }),
    },
  }),
  (c) =>
    respond(c, () =>
      generateCitationData(c.req.valid("param").id, c.req.valid("query").format)
    )
);

export default sourcesRouter;
