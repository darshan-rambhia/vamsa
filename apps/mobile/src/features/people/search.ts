import { getDisplayName } from "./types";
import type { PersonSummary } from "./types";

const normalize = (value: string) => value.toLowerCase().trim();

export const filterPeople = (
  people: Array<PersonSummary>,
  query: string
): Array<PersonSummary> => {
  const needle = normalize(query);
  if (!needle) return people;

  return people.filter((person) => {
    const haystack = [
      getDisplayName(person),
      person.relation,
      person.city ?? "",
      String(person.birthYear ?? ""),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(needle);
  });
};
