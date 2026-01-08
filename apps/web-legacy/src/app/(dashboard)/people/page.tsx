import { Suspense } from "react";
import { getPersons } from "@/actions/person";
import { PeopleList } from "@/components/person/people-list";
import { AddPersonButton } from "@/components/person/add-person-button";

interface PeoplePageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
    status?: string;
    gender?: string;
  }>;
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const status = params.status || "";
  const gender = params.gender || "";
  const page = parseInt(params.page || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const { persons, total } = await getPersons({
    search,
    status,
    gender,
    limit,
    offset,
  });
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">People</h1>
          <p className="text-muted-foreground">
            {total} {total === 1 ? "person" : "people"} in the family tree
          </p>
        </div>
        <AddPersonButton />
      </div>

      <Suspense fallback={<PeopleListSkeleton />}>
        <PeopleList
          persons={persons}
          total={total}
          page={page}
          totalPages={totalPages}
          search={search}
          status={status}
          gender={gender}
        />
      </Suspense>
    </div>
  );
}

function PeopleListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
