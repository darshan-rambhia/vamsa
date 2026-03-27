export type PersonSummary = {
  id: string;
  firstName: string;
  lastName: string;
  relation: string;
  birthYear?: number;
  city?: string;
};

export type RelationshipType = "PARENT" | "CHILD" | "SPOUSE" | "SIBLING";

export type RelationshipSummary = {
  id: string;
  personId: string;
  relatedPersonId: string;
  type: RelationshipType;
};

export const getDisplayName = (person: PersonSummary): string => {
  return `${person.firstName} ${person.lastName}`.trim();
};
