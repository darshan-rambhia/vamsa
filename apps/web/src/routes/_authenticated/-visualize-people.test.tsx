import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { Route } from "./visualize";
import type * as ReactI18next from "react-i18next";
import { PersonSelector } from "~/components/charts/PersonSelector";

const { listPersons } = vi.hoisted(() => ({ listPersons: vi.fn() }));
vi.mock("~/server/persons.functions", () => ({ listPersons }));
vi.mock("~/server/auth.functions", () => ({ getCurrentUser: vi.fn() }));
vi.mock("~/server/charts", () => ({}));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactI18next>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

const people = Array.from({ length: 251 }, (_, index) => ({
  id: `person-${index}`,
  firstName: index === 250 ? "Zara" : `Person ${index}`,
  lastName: "Example",
  dateOfBirth: null,
  isLiving: true,
}));

async function loadPeople() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const loader = Route.options.loader;
  if (typeof loader !== "function") throw new Error("Expected a route loader");
  await loader({ context: { queryClient } } as never);
  const result = queryClient.getQueryData<typeof people>([
    "persons",
    "visualize",
  ]);
  queryClient.clear();
  return result!;
}

describe("Visualization person selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    listPersons.mockImplementation(async ({ data }) => {
      const page = data.page ?? 1;
      const limit = data.limit ?? 50;
      return {
        items: people.slice((page - 1) * limit, page * limit),
        pagination: { totalPages: Math.ceil(people.length / limit) },
      };
    });
  });

  afterEach(cleanup);

  it("finds and selects a person beyond the first page", async () => {
    const persons = await loadPeople();
    const onPersonChange = vi.fn();
    const screen = render(
      <PersonSelector
        persons={persons}
        selectedPersonId={undefined}
        onPersonChange={onPersonChange}
      />
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Center On" }), {
      target: { value: "zar" },
    });
    fireEvent.click(screen.getByRole("option", { name: "Zara Example" }));

    expect(onPersonChange).toHaveBeenCalledWith("person-250");
    expect(persons).toHaveLength(251);
    expect(listPersons).toHaveBeenCalledTimes(3);
  });

  it("shows the selected person's name even when they are on a later page", async () => {
    const screen = render(
      <PersonSelector
        persons={await loadPeople()}
        selectedPersonId="person-250"
        onPersonChange={vi.fn()}
      />
    );

    expect(
      screen
        .getByRole("combobox", { name: "Center On" })
        .getAttribute("placeholder")
    ).toBe("Zara Example");
  });

  it("does not fetch additional pages for an empty family", async () => {
    listPersons.mockResolvedValue({
      items: [],
      pagination: { totalPages: 0 },
    });

    expect(await loadPeople()).toEqual([]);
    expect(listPersons).toHaveBeenCalledTimes(1);
  });
});
