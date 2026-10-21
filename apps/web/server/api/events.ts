import { OpenAPIHono, z } from "@hono/zod-openapi";
import { eventCreateSchema, eventUpdateSchema } from "@vamsa/schemas";
import {
  addEventParticipantData,
  createEventData,
  deleteEventData,
  getPersonEventsData,
  removeEventParticipantData,
  updateEventData,
} from "@vamsa/lib/server/business";
import {
  idParam,
  jsonBody,
  jsonRoute,
  onlyProvided,
  respond,
} from "./route-helpers";

const TAG = "Events";
const eventsRouter = new OpenAPIHono();

eventsRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/",
    tag: TAG,
    summary: "List a person's events",
    operationId: "listEvents",
    request: { query: z.object({ personId: z.string().min(1) }) },
  }),
  (c) =>
    respond(c, async () => {
      const items = await getPersonEventsData(c.req.valid("query").personId);
      return { items, total: items.length };
    })
);

eventsRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/",
    tag: TAG,
    summary: "Create an event",
    operationId: "createEvent",
    request: { body: jsonBody(eventCreateSchema) },
    status: 201,
  }),
  (c) => respond(c, () => createEventData(c.req.valid("json")), 201)
);

eventsRouter.openapi(
  jsonRoute({
    method: "put",
    path: "/{id}",
    tag: TAG,
    summary: "Update an event",
    operationId: "updateEvent",
    request: {
      params: idParam(),
      body: jsonBody(z.record(z.string(), z.unknown())),
    },
    description: "Body: any of type, date (YYYY-MM-DD), place, description.",
  }),
  (c) =>
    respond(c, () => {
      const id = c.req.valid("param").id;
      const raw = c.req.valid("json");
      const { id: _id, ...parsed } = eventUpdateSchema.parse({ ...raw, id });
      // Only fields the client sent; the schema turns an absent date into null
      return updateEventData(id, onlyProvided(parsed, raw));
    })
);

eventsRouter.openapi(
  jsonRoute({
    method: "delete",
    path: "/{id}",
    tag: TAG,
    summary: "Delete an event",
    operationId: "deleteEvent",
    request: { params: idParam() },
  }),
  (c) => respond(c, () => deleteEventData(c.req.valid("param").id))
);

eventsRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/{id}/participants",
    tag: TAG,
    summary: "Add a participant to an event",
    operationId: "addEventParticipant",
    request: {
      params: idParam(),
      body: jsonBody(
        z.object({ personId: z.string().min(1), role: z.string().optional() })
      ),
    },
    status: 201,
  }),
  (c) =>
    respond(
      c,
      () =>
        addEventParticipantData({
          eventId: c.req.valid("param").id,
          ...c.req.valid("json"),
        }),
      201
    )
);

eventsRouter.openapi(
  jsonRoute({
    method: "delete",
    path: "/{id}/participants/{personId}",
    tag: TAG,
    summary: "Remove a participant from an event",
    operationId: "removeEventParticipant",
    request: {
      params: z.object({ id: z.string().min(1), personId: z.string().min(1) }),
    },
  }),
  (c) => {
    const { id, personId } = c.req.valid("param");
    return respond(c, () =>
      removeEventParticipantData({ eventId: id, personId })
    );
  }
);

export default eventsRouter;
