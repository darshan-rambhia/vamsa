/**
 * OpenAPI 3.0 specification for Vamsa API
 * This file defines the complete REST API documentation
 */

// Schemas for OpenAPI components
const PersonSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string", description: "Unique identifier for the person" },
    firstName: { type: "string", description: "Person's first name" },
    lastName: { type: "string", description: "Person's last name" },
    maidenName: {
      type: "string",
      description: "Person's maiden name (if applicable)",
      nullable: true,
    },
    dateOfBirth: {
      type: "string",
      format: "date",
      description: "Person's date of birth (YYYY-MM-DD)",
      nullable: true,
    },
    dateOfPassing: {
      type: "string",
      format: "date",
      description: "Person's date of death (YYYY-MM-DD)",
      nullable: true,
    },
    birthPlace: {
      type: "string",
      description: "Place of birth",
      nullable: true,
    },
    nativePlace: {
      type: "string",
      description: "Native/hometown place",
      nullable: true,
    },
    gender: {
      type: "string",
      enum: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"],
      description: "Person's gender",
      nullable: true,
    },
    photoUrl: {
      type: "string",
      format: "uri",
      description: "URL to person's profile photo",
      nullable: true,
    },
    bio: {
      type: "string",
      description: "Person's biography or notes",
      nullable: true,
    },
    email: {
      type: "string",
      format: "email",
      description: "Person's email address",
      nullable: true,
    },
    phone: {
      type: "string",
      description: "Person's phone number",
      nullable: true,
    },
    profession: {
      type: "string",
      description: "Person's profession",
      nullable: true,
    },
    employer: {
      type: "string",
      description: "Person's employer",
      nullable: true,
    },
    isLiving: {
      type: "boolean",
      description: "Whether the person is currently living",
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "Timestamp when the person was created",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Timestamp when the person was last updated",
    },
  },
  required: [
    "id",
    "firstName",
    "lastName",
    "isLiving",
    "createdAt",
    "updatedAt",
  ],
};

const RelationshipSchema = {
  type: "object" as const,
  properties: {
    id: {
      type: "string",
      description: "Unique identifier for the relationship",
    },
    personId: { type: "string", description: "ID of the person" },
    relatedPersonId: {
      type: "string",
      description: "ID of the related person",
    },
    type: {
      type: "string",
      enum: ["PARENT", "CHILD", "SPOUSE", "SIBLING"],
      description: "Type of relationship",
    },
    isActive: {
      type: "boolean",
      description: "Whether the relationship is currently active",
    },
    marriageDate: {
      type: "string",
      format: "date",
      description: "Date of marriage (if applicable)",
      nullable: true,
    },
    divorceDate: {
      type: "string",
      format: "date",
      description: "Date of divorce (if applicable)",
      nullable: true,
    },
    relatedPerson: {
      type: "object" as const,
      properties: {
        id: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
      },
      required: ["id", "firstName", "lastName"],
    },
  },
  required: ["id", "personId", "relatedPersonId", "type", "isActive"],
};

const PaginationMetaSchema = {
  type: "object" as const,
  properties: {
    page: { type: "integer", description: "Current page number" },
    limit: { type: "integer", description: "Items per page" },
    total: { type: "integer", description: "Total number of items" },
    pages: { type: "integer", description: "Total number of pages" },
  },
  required: ["page", "limit", "total", "pages"],
};

const PersonListSchema = {
  type: "object" as const,
  properties: {
    items: {
      type: "array",
      items: PersonSchema,
      description: "Array of persons",
    },
    pagination: PaginationMetaSchema,
  },
  required: ["items", "pagination"],
};

const RelationshipListSchema = {
  type: "object" as const,
  properties: {
    items: {
      type: "array",
      items: RelationshipSchema,
      description: "Array of relationships",
    },
    pagination: PaginationMetaSchema,
  },
  required: ["items", "pagination"],
};

const ErrorSchema = {
  type: "object" as const,
  properties: {
    error: {
      type: "string",
      description: "Error type or message",
    },
    details: {
      type: "string",
      description: "Detailed error information",
      nullable: true,
    },
  },
  required: ["error"],
};

const UserSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string", description: "Unique identifier for the user" },
    email: { type: "string", format: "email", description: "User's email" },
    name: { type: "string", description: "User's display name" },
    role: {
      type: "string",
      enum: ["ADMIN", "MEMBER", "VIEWER"],
      description: "User's role",
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "When the account was created",
    },
  },
  required: ["id", "email", "name", "role", "createdAt"],
};

const LoginResponseSchema = {
  type: "object" as const,
  properties: {
    user: UserSchema,
    token: {
      type: "string",
      description: "Session token (stored in httpOnly cookie)",
    },
  },
  required: ["user", "token"],
};

export const openAPISpec = {
  openapi: "3.0.0",
  info: {
    title: "Vamsa API",
    version: "1.0.0",
    description:
      "REST API for Vamsa - Family genealogy application. Supports web and mobile clients.",
    contact: {
      name: "Vamsa Support",
      url: "https://vamsa.app",
    },
  },
  servers: [
    {
      url: "http://localhost:3000/api/v1",
      description: "Development server",
    },
    {
      url: "https://api.vamsa.app/api/v1",
      description: "Production server",
    },
  ],
  components: {
    schemas: {
      Person: PersonSchema,
      Relationship: RelationshipSchema,
      PaginationMeta: PaginationMetaSchema,
      PersonList: PersonListSchema,
      RelationshipList: RelationshipListSchema,
      User: UserSchema,
      Error: ErrorSchema,
      LoginResponse: LoginResponseSchema,
    },
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "vamsa-session",
        description: "HTTP-only session cookie",
      },
    },
  },
  paths: {
    "/persons": {
      get: {
        tags: ["Persons"],
        summary: "List all persons",
        description:
          "Retrieve a paginated list of all persons in the family tree",
        operationId: "listPersons",
        parameters: [
          {
            name: "page",
            in: "query",
            description: "Page number (starting from 1)",
            schema: { type: "integer", default: 1, minimum: 1 },
          },
          {
            name: "limit",
            in: "query",
            description: "Number of items per page",
            schema: { type: "integer", default: 50, minimum: 1, maximum: 100 },
          },
          {
            name: "search",
            in: "query",
            description: "Search by first or last name",
            schema: { type: "string" },
          },
          {
            name: "sortBy",
            in: "query",
            description: "Field to sort by",
            schema: {
              type: "string",
              enum: ["lastName", "firstName", "dateOfBirth", "createdAt"],
              default: "lastName",
            },
          },
          {
            name: "sortOrder",
            in: "query",
            description: "Sort order",
            schema: {
              type: "string",
              enum: ["asc", "desc"],
              default: "asc",
            },
          },
          {
            name: "isLiving",
            in: "query",
            description: "Filter by living status",
            schema: { type: "boolean" },
          },
        ],
        responses: {
          200: {
            description: "Successfully retrieved person list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PersonList" },
              },
            },
          },
          401: {
            description: "Unauthorized - authentication required",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        security: [{ sessionCookie: [] }],
      },
      post: {
        tags: ["Persons"],
        summary: "Create a new person",
        description: "Add a new person to the family tree",
        operationId: "createPerson",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  firstName: { type: "string", minLength: 1 },
                  lastName: { type: "string", minLength: 1 },
                  maidenName: { type: "string" },
                  dateOfBirth: { type: "string", format: "date" },
                  dateOfPassing: { type: "string", format: "date" },
                  birthPlace: { type: "string" },
                  nativePlace: { type: "string" },
                  gender: {
                    type: "string",
                    enum: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"],
                  },
                  bio: { type: "string" },
                  email: { type: "string", format: "email" },
                  phone: { type: "string" },
                  profession: { type: "string" },
                  employer: { type: "string" },
                  isLiving: { type: "boolean", default: true },
                },
                required: ["firstName", "lastName"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Person created successfully",
            content: {
              "application/json": {
                schema: PersonSchema,
              },
            },
          },
          400: {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        security: [{ sessionCookie: [] }],
      },
    },
    "/persons/{id}": {
      get: {
        tags: ["Persons"],
        summary: "Get a person by ID",
        description: "Retrieve detailed information about a specific person",
        operationId: "getPerson",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Person ID",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Person found",
            content: {
              "application/json": {
                schema: PersonSchema,
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Person not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        security: [{ sessionCookie: [] }],
      },
      put: {
        tags: ["Persons"],
        summary: "Update a person",
        description: "Update information about a person",
        operationId: "updatePerson",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Person ID",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  maidenName: { type: "string" },
                  dateOfBirth: { type: "string", format: "date" },
                  dateOfPassing: { type: "string", format: "date" },
                  birthPlace: { type: "string" },
                  nativePlace: { type: "string" },
                  gender: {
                    type: "string",
                    enum: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"],
                  },
                  bio: { type: "string" },
                  email: { type: "string", format: "email" },
                  phone: { type: "string" },
                  profession: { type: "string" },
                  employer: { type: "string" },
                  isLiving: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Person updated successfully",
            content: {
              "application/json": {
                schema: PersonSchema,
              },
            },
          },
          400: {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Person not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        security: [{ sessionCookie: [] }],
      },
      delete: {
        tags: ["Persons"],
        summary: "Delete a person",
        description: "Remove a person from the family tree",
        operationId: "deletePerson",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Person ID",
            schema: { type: "string" },
          },
        ],
        responses: {
          204: {
            description: "Person deleted successfully",
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Person not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        security: [{ sessionCookie: [] }],
      },
    },
    "/relationships": {
      get: {
        tags: ["Relationships"],
        summary: "List relationships",
        description: "Retrieve a paginated list of relationships",
        operationId: "listRelationships",
        parameters: [
          {
            name: "personId",
            in: "query",
            description: "Filter by person ID",
            schema: { type: "string" },
          },
          {
            name: "type",
            in: "query",
            description: "Filter by relationship type",
            schema: {
              type: "string",
              enum: ["PARENT", "CHILD", "SPOUSE", "SIBLING"],
            },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50 },
          },
        ],
        responses: {
          200: {
            description: "Relationships retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RelationshipList" },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        security: [{ sessionCookie: [] }],
      },
      post: {
        tags: ["Relationships"],
        summary: "Create a relationship",
        description: "Create a new relationship between two people",
        operationId: "createRelationship",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  personId: { type: "string", description: "ID of person A" },
                  relatedPersonId: {
                    type: "string",
                    description: "ID of person B",
                  },
                  type: {
                    type: "string",
                    enum: ["PARENT", "CHILD", "SPOUSE", "SIBLING"],
                  },
                  marriageDate: { type: "string", format: "date" },
                  divorceDate: { type: "string", format: "date" },
                },
                required: ["personId", "relatedPersonId", "type"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Relationship created successfully",
            content: {
              "application/json": {
                schema: RelationshipSchema,
              },
            },
          },
          400: {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        security: [{ sessionCookie: [] }],
      },
    },
    "/relationships/{id}": {
      get: {
        tags: ["Relationships"],
        summary: "Get a relationship by ID",
        operationId: "getRelationship",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Relationship ID",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Relationship found",
            content: {
              "application/json": {
                schema: RelationshipSchema,
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Relationship not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        security: [{ sessionCookie: [] }],
      },
      put: {
        tags: ["Relationships"],
        summary: "Update a relationship",
        operationId: "updateRelationship",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Relationship ID",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  marriageDate: { type: "string", format: "date" },
                  divorceDate: { type: "string", format: "date" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Relationship updated successfully",
            content: {
              "application/json": {
                schema: RelationshipSchema,
              },
            },
          },
          400: {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Relationship not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        security: [{ sessionCookie: [] }],
      },
      delete: {
        tags: ["Relationships"],
        summary: "Delete a relationship",
        operationId: "deleteRelationship",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Relationship ID",
            schema: { type: "string" },
          },
        ],
        responses: {
          204: {
            description: "Relationship deleted successfully",
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          404: {
            description: "Relationship not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        security: [{ sessionCookie: [] }],
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login with email and password",
        operationId: "login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 1 },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
            headers: {
              "Set-Cookie": {
                description: "HTTP-only session cookie",
                schema: { type: "string" },
              },
            },
          },
          400: {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          429: {
            description: "Too many login attempts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout",
        operationId: "logout",
        responses: {
          200: {
            description: "Logout successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
        security: [{ sessionCookie: [] }],
      },
    },
    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new account",
        operationId: "register",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  name: { type: "string", minLength: 1 },
                  password: {
                    type: "string",
                    minLength: 8,
                    description: "Password must be at least 8 characters",
                  },
                  confirmPassword: { type: "string" },
                },
                required: ["email", "name", "password", "confirmPassword"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Account created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          400: {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          409: {
            description: "Email already in use",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
    },
  },
};
