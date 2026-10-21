import { OpenAPIHono, z } from "@hono/zod-openapi";
import {
  personPlaceTypeEnum,
  placeCreateSchema,
  placeUpdateSchema,
} from "@vamsa/schemas";
import {
  createPlaceData,
  deletePlaceData,
  getPersonPlacesData,
  getPlaceChildrenData,
  getPlaceData,
  getPlaceHierarchyData,
  linkPersonToPlaceData,
  searchPlacesData,
  unlinkPersonFromPlaceData,
  updatePlaceData,
} from "@vamsa/lib/server/business";
import { idParam, jsonBody, jsonRoute, respond } from "./route-helpers";

const TAG = "Places";
const placesRouter = new OpenAPIHono();

placesRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/",
    tag: TAG,
    summary: "Search places by name, or list a person's places",
    description: "Pass `q` to search by name, or `personId` for linked places.",
    operationId: "listPlaces",
    request: {
      query: z.object({
        q: z.string().optional(),
        personId: z.string().optional(),
      }),
    },
  }),
  (c) =>
    respond(c, async () => {
      const { q, personId } = c.req.valid("query");
      const items = personId
        ? await getPersonPlacesData(personId)
        : await searchPlacesData(q ?? "");
      return { items, total: items.length };
    })
);

placesRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/{id}",
    tag: TAG,
    summary: "Get a place",
    operationId: "getPlace",
    request: { params: idParam() },
  }),
  (c) => respond(c, () => getPlaceData(c.req.valid("param").id))
);

placesRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/{id}/hierarchy",
    tag: TAG,
    summary: "Get a place's ancestors, root first",
    operationId: "getPlaceHierarchy",
    request: { params: idParam() },
  }),
  (c) =>
    respond(c, async () => {
      const items = await getPlaceHierarchyData(c.req.valid("param").id);
      return { items, total: items.length };
    })
);

placesRouter.openapi(
  jsonRoute({
    method: "get",
    path: "/{id}/children",
    tag: TAG,
    summary: "List a place's direct children",
    operationId: "getPlaceChildren",
    request: { params: idParam() },
  }),
  (c) =>
    respond(c, async () => {
      const items = await getPlaceChildrenData(c.req.valid("param").id);
      return { items, total: items.length };
    })
);

placesRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/",
    tag: TAG,
    summary: "Create a place",
    operationId: "createPlace",
    request: { body: jsonBody(placeCreateSchema) },
    status: 201,
  }),
  (c) => respond(c, () => createPlaceData(c.req.valid("json")), 201)
);

placesRouter.openapi(
  jsonRoute({
    method: "put",
    path: "/{id}",
    tag: TAG,
    summary: "Update a place",
    operationId: "updatePlace",
    request: {
      params: idParam(),
      body: jsonBody(z.record(z.string(), z.unknown())),
    },
    description:
      "Body: any of name, placeType, latitude, longitude, parentId, description, alternativeNames.",
  }),
  (c) =>
    respond(c, () => {
      const id = c.req.valid("param").id;
      const { id: _id, ...updates } = placeUpdateSchema.parse({
        ...c.req.valid("json"),
        id,
      });
      return updatePlaceData(id, updates);
    })
);

placesRouter.openapi(
  jsonRoute({
    method: "delete",
    path: "/{id}",
    tag: TAG,
    summary: "Delete a place",
    operationId: "deletePlace",
    request: { params: idParam() },
  }),
  (c) => respond(c, () => deletePlaceData(c.req.valid("param").id))
);

placesRouter.openapi(
  jsonRoute({
    method: "post",
    path: "/{id}/persons",
    tag: TAG,
    summary: "Link a person to a place",
    operationId: "linkPersonToPlace",
    request: {
      params: idParam(),
      body: jsonBody(
        z.object({
          personId: z.string().min(1),
          fromYear: z.number().int().optional().nullable(),
          toYear: z.number().int().optional().nullable(),
          type: personPlaceTypeEnum.optional().nullable(),
        })
      ),
    },
    status: 201,
  }),
  (c) =>
    respond(
      c,
      () =>
        linkPersonToPlaceData({
          placeId: c.req.valid("param").id,
          ...c.req.valid("json"),
        }),
      201
    )
);

placesRouter.openapi(
  jsonRoute({
    method: "delete",
    path: "/links/{id}",
    tag: TAG,
    summary: "Remove a person-place link",
    operationId: "unlinkPersonFromPlace",
    request: { params: idParam() },
  }),
  (c) => respond(c, () => unlinkPersonFromPlaceData(c.req.valid("param").id))
);

export default placesRouter;
