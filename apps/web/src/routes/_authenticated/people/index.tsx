import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Container,
  Input,
  PageHeader,
} from "@vamsa/ui";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { listPersons } from "~/server/persons.functions";
import { CompactRouteError } from "~/components/error";

type SortBy = "lastName" | "firstName" | "dateOfBirth" | "createdAt";
type SortOrder = "asc" | "desc";

interface PeopleSearch {
  page?: number;
  search?: string;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  place?: string;
}

export const Route = createFileRoute("/_authenticated/people/")({
  component: PeopleListComponent,
  errorComponent: CompactRouteError,
  validateSearch: (search: Record<string, unknown>): PeopleSearch => ({
    page:
      typeof search.page === "number" && search.page >= 1
        ? Math.floor(search.page)
        : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
    sortBy:
      typeof search.sortBy === "string" &&
      ["lastName", "firstName", "dateOfBirth", "createdAt"].includes(
        search.sortBy
      )
        ? (search.sortBy as SortBy)
        : undefined,
    sortOrder:
      typeof search.sortOrder === "string" &&
      ["asc", "desc"].includes(search.sortOrder)
        ? (search.sortOrder as SortOrder)
        : undefined,
    place: typeof search.place === "string" ? search.place : undefined,
  }),
});

function PeopleListComponent() {
  const navigate = useNavigate();
  const {
    page = 1,
    search = "",
    sortBy = "lastName",
    sortOrder = "asc",
  } = Route.useSearch();

  const [searchInput, setSearchInput] = useState(search);

  // Sync local input when URL search param changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Debounced search: update URL param after 300ms of no typing
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search) return;
    const timer = setTimeout(() => {
      navigate({
        to: ".",
        search: {
          search: trimmed || undefined,
          sortBy,
          sortOrder,
        },
        replace: true,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, sortBy, sortOrder, navigate]);

  const { data: persons, isLoading } = useQuery({
    queryKey: ["persons", { page, search, sortBy, sortOrder }],
    queryFn: () => listPersons({ data: { page, search, sortBy, sortOrder } }),
  });

  const toggleSort = useCallback(
    (column: SortBy) => {
      const newOrder =
        sortBy === column && sortOrder === "asc" ? "desc" : "asc";
      navigate({
        to: ".",
        search: {
          sortBy: column,
          sortOrder: newOrder,
          search: search || undefined,
        },
        replace: true,
      });
    },
    [navigate, sortBy, sortOrder, search]
  );

  const goToPage = useCallback(
    (newPage: number) => {
      navigate({
        to: ".",
        search: {
          page: newPage === 1 ? undefined : newPage,
          search: search || undefined,
          sortBy,
          sortOrder,
        },
        replace: true,
      });
    },
    [navigate, search, sortBy, sortOrder]
  );

  const totalPages = persons?.pagination.totalPages ?? 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  if (isLoading || !persons) {
    return (
      <Container>
        <div className="flex items-center justify-center py-24">
          <div className="space-y-4 text-center">
            <div className="bg-primary/20 mx-auto h-12 w-12 animate-pulse rounded-full" />
            <p className="text-muted-foreground">Loading your family...</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="animate-fade-in space-y-8">
      <PageHeader
        title="People"
        description="Everyone in your family tree"
        actions={
          <Button asChild>
            <Link to="/people/new">Add Person</Link>
          </Button>
        }
      />

      {/* Search bar */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {persons.items.length === 0 && !search ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <div className="bg-primary/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
              <svg
                className="text-primary h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <h3 className="font-display text-xl font-medium">No people yet</h3>
            <p className="text-muted-foreground mx-auto mt-2 max-w-sm">
              Start building your family tree by adding the first person.
            </p>
            <Button asChild className="mt-6">
              <Link to="/people/new">Add the first person</Link>
            </Button>
          </CardContent>
        </Card>
      ) : persons.items.length === 0 && search ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              No results for &ldquo;{search}&rdquo;
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-border bg-muted/50 border-b">
                  <SortableHeader
                    label="Name"
                    column="lastName"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onToggle={toggleSort}
                  />
                  <SortableHeader
                    label="Gender"
                    column="firstName"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onToggle={toggleSort}
                    className="hidden sm:table-cell"
                    sortable={false}
                  />
                  <th className="text-muted-foreground hidden px-4 py-3 text-left text-sm font-medium md:table-cell">
                    Profession
                  </th>
                  <SortableHeader
                    label="Birth Date"
                    column="dateOfBirth"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onToggle={toggleSort}
                    className="hidden lg:table-cell"
                  />
                  <th className="text-muted-foreground px-4 py-3 text-left text-sm font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {persons.items.map((person) => (
                  <tr
                    key={person.id}
                    className="hover:bg-muted/30 group transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to="/people/$personId"
                        params={{ personId: person.id }}
                        className="flex items-center gap-3"
                      >
                        <Avatar
                          alt={`${person.firstName} ${person.lastName}`}
                          fallback={`${person.firstName.charAt(0)}${person.lastName.charAt(0)}`}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-foreground group-hover:text-primary truncate font-medium transition-colors">
                            {person.firstName} {person.lastName}
                          </p>
                          {person.maidenName && (
                            <p className="text-muted-foreground truncate text-xs">
                              née {person.maidenName}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {person.gender ? (
                        <span className="text-muted-foreground text-sm">
                          {person.gender.charAt(0) +
                            person.gender.slice(1).toLowerCase()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-sm">
                          —
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {person.profession ? (
                        <span className="text-muted-foreground block max-w-50 truncate text-sm">
                          {person.profession}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-sm">
                          —
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {person.dateOfBirth ? (
                        <span className="text-muted-foreground font-mono text-sm">
                          {formatDate(person.dateOfBirth)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50 text-sm">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {person.isLiving ? (
                        <Badge variant="secondary">Living</Badge>
                      ) : (
                        <Badge variant="outline">Deceased</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-border flex items-center justify-between border-t px-4 py-3">
            <span className="text-muted-foreground text-sm">
              {persons.pagination.total}{" "}
              {persons.pagination.total === 1 ? "person" : "people"} in your
              family tree
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPage(page - 1)}
                  disabled={!hasPrev}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => goToPage(page + 1)}
                  disabled={!hasNext}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </Container>
  );
}

function SortableHeader({
  label,
  column,
  currentSort,
  currentOrder,
  onToggle,
  className = "",
  sortable = true,
}: {
  label: string;
  column: SortBy;
  currentSort: SortBy;
  currentOrder: SortOrder;
  onToggle: (column: SortBy) => void;
  className?: string;
  sortable?: boolean;
}) {
  if (!sortable) {
    return (
      <th
        className={`text-muted-foreground px-4 py-3 text-left text-sm font-medium ${className}`}
      >
        {label}
      </th>
    );
  }

  const isActive = currentSort === column;
  const Icon = isActive
    ? currentOrder === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <th className={`px-4 py-3 text-left text-sm font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onToggle(column)}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${isActive ? "text-foreground" : ""}`} />
      </button>
    </th>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}
