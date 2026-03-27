import { PEOPLE_FIXTURE, RELATIONSHIP_FIXTURE } from "./data";
import { filterPeople } from "./search";
import type {
  PersonSummary,
  RelationshipSummary,
  RelationshipType,
} from "./types";
import { getApiBaseUrl } from "@/src/lib/api-base-url";
import { getAuthCookie } from "@/src/features/auth/api";

type ApiPerson = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  birthPlace?: string | null;
};

type PersonsListResponse = {
  items: Array<ApiPerson>;
  nextCursor: string | null;
  hasMore: boolean;
};

type ApiRelationship = {
  id: string;
  personId: string;
  relatedPersonId: string;
  type: RelationshipType;
};

type RelationshipsListResponse = {
  items: Array<ApiRelationship>;
  nextCursor: string | null;
  hasMore: boolean;
};

export type PeopleDataSource = "api" | "fixture";

export type PeopleResult = {
  people: Array<PersonSummary>;
  source: PeopleDataSource;
  warning?: string;
};

export type CreatePersonResult = {
  id: string;
};

export type CreatePersonInput = {
  firstName: string;
  lastName: string;
  isLiving?: boolean;
};

export type UpdatePersonInput = {
  firstName?: string;
  lastName?: string;
  city?: string;
  birthYear?: number;
};

const mutationListeners = new Set<() => void>();
let mutationVersion = 0;

function emitPeopleMutation() {
  mutationVersion += 1;
  mutationListeners.forEach((listener) => listener());
}

export function subscribePeopleMutation(listener: () => void): () => void {
  mutationListeners.add(listener);
  return () => mutationListeners.delete(listener);
}

export function getPeopleMutationSnapshot(): number {
  return mutationVersion;
}

const mapApiPerson = (person: ApiPerson): PersonSummary => ({
  id: person.id,
  firstName: person.firstName,
  lastName: person.lastName,
  relation: "Family",
  birthYear: person.dateOfBirth
    ? Number(person.dateOfBirth.slice(0, 4))
    : undefined,
  city: person.birthPlace ?? undefined,
});

const mapApiRelationship = (item: ApiRelationship): RelationshipSummary => ({
  id: item.id,
  personId: item.personId,
  relatedPersonId: item.relatedPersonId,
  type: item.type,
});

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const cookie = getAuthCookie();

  const response = await fetch(url, {
    method: "GET",
    credentials: "omit",
    headers: {
      Accept: "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function createPerson(
  input: CreatePersonInput
): Promise<CreatePersonResult> {
  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();

  if (!firstName) {
    throw new Error("First name is required");
  }

  if (!lastName) {
    throw new Error("Last name is required");
  }

  const cookie = getAuthCookie();
  const response = await fetch(`${getApiBaseUrl()}/persons`, {
    method: "POST",
    credentials: "omit",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({
      ...input,
      firstName,
      lastName,
      isLiving: input.isLiving ?? true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Create failed (HTTP ${response.status})`);
  }

  const result = (await response.json()) as CreatePersonResult;
  emitPeopleMutation();
  return result;
}

export async function updatePerson(
  id: string,
  input: UpdatePersonInput
): Promise<CreatePersonResult> {
  if (!id) {
    throw new Error("Person id is required");
  }

  const payload: Record<string, unknown> = {};

  if (typeof input.firstName === "string") {
    const firstName = input.firstName.trim();
    if (!firstName) {
      throw new Error("First name cannot be empty");
    }
    payload.firstName = firstName;
  }

  if (typeof input.lastName === "string") {
    const lastName = input.lastName.trim();
    if (!lastName) {
      throw new Error("Last name cannot be empty");
    }
    payload.lastName = lastName;
  }

  if (typeof input.city === "string") {
    payload.birthPlace = input.city.trim() || null;
  }

  if (typeof input.birthYear === "number") {
    if (
      !Number.isInteger(input.birthYear) ||
      input.birthYear < 1000 ||
      input.birthYear > 9999
    ) {
      throw new Error("Birth year must be a valid 4-digit year");
    }
    payload.dateOfBirth = `${input.birthYear}-01-01`;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No profile changes to save");
  }

  const cookie = getAuthCookie();
  const response = await fetch(`${getApiBaseUrl()}/persons/${id}`, {
    method: "PUT",
    credentials: "omit",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Update failed (HTTP ${response.status})`);
  }

  const result = (await response.json()) as CreatePersonResult;
  emitPeopleMutation();
  return result;
}

export async function listPeople(
  signal?: AbortSignal,
  searchQuery?: string
): Promise<PeopleResult> {
  const query = searchQuery?.trim();
  const searchParam = query ? `&search=${encodeURIComponent(query)}` : "";
  const url = `${getApiBaseUrl()}/persons?limit=50${searchParam}`;

  try {
    const data = await fetchJson<PersonsListResponse>(url, signal);
    return {
      people: data.items.map(mapApiPerson),
      source: "api",
    };
  } catch (error) {
    const fixturePeople = query
      ? filterPeople(PEOPLE_FIXTURE, query)
      : PEOPLE_FIXTURE;
    const warning =
      error instanceof Error && error.message.includes("HTTP 401")
        ? "Using local fixture data (HTTP 401: login required - open Settings to sign in or set a session cookie)"
        : error instanceof Error
          ? `Using local fixture data (${error.message})`
          : "Using local fixture data (network unavailable)";

    return {
      people: fixturePeople,
      source: "fixture",
      warning,
    };
  }
}

export async function listRelationshipsForPerson(
  personId: string,
  signal?: AbortSignal
): Promise<{
  relationships: Array<RelationshipSummary>;
  source: PeopleDataSource;
  warning?: string;
}> {
  if (!personId) {
    return {
      relationships: [],
      source: "api",
    };
  }

  const url = `${getApiBaseUrl()}/relationships?personId=${encodeURIComponent(personId)}&limit=100`;

  try {
    const data = await fetchJson<RelationshipsListResponse>(url, signal);
    return {
      relationships: data.items.map(mapApiRelationship),
      source: "api",
    };
  } catch (error) {
    const warning =
      error instanceof Error && error.message.includes("HTTP 401")
        ? "Using local fixture relationships (HTTP 401: login required)"
        : error instanceof Error
          ? `Using local fixture relationships (${error.message})`
          : "Using local fixture relationships (network unavailable)";

    return {
      relationships: RELATIONSHIP_FIXTURE.filter(
        (item) => item.personId === personId
      ),
      source: "fixture",
      warning,
    };
  }
}

export async function getPersonById(
  id: string,
  signal?: AbortSignal
): Promise<PeopleResult & { person?: PersonSummary }> {
  const url = `${getApiBaseUrl()}/persons/${id}`;

  try {
    const data = await fetchJson<ApiPerson>(url, signal);
    const person = mapApiPerson(data);
    return {
      people: [person],
      person,
      source: "api",
    };
  } catch (error) {
    const person = PEOPLE_FIXTURE.find((item) => item.id === id);
    const warning =
      error instanceof Error && error.message.includes("HTTP 401")
        ? "Using local fixture data (HTTP 401: login required - open Settings to sign in or set a session cookie)"
        : error instanceof Error
          ? `Using local fixture data (${error.message})`
          : "Using local fixture data (network unavailable)";

    return {
      people: person ? [person] : PEOPLE_FIXTURE,
      person,
      source: "fixture",
      warning,
    };
  }
}
