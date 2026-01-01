"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, calculateAge, getInitials } from "@/lib/utils";
import type { Person, Relationship } from "@prisma/client";

type PersonWithRelations = Person & {
  relationshipsFrom: (Relationship & { relatedPerson: Person })[];
  relationshipsTo: (Relationship & { person: Person })[];
};

interface PeopleListProps {
  persons: PersonWithRelations[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
}

export function PeopleList({
  persons,
  total,
  page,
  totalPages,
  search,
}: PeopleListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchValue) {
      params.set("search", searchValue);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`/people?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/people?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {persons.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {search
            ? `No results found for "${search}"`
            : "No people in the family tree yet"}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {persons.map((person) => (
            <Link key={person.id} href={`/people/${person.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-16 w-16">
                    {person.photoUrl && <AvatarImage src={person.photoUrl} />}
                    <AvatarFallback>
                      {getInitials(person.firstName, person.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="truncate font-semibold">
                      {person.firstName} {person.lastName}
                      {person.maidenName && (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          (née {person.maidenName})
                        </span>
                      )}
                    </h3>
                    {person.dateOfBirth && (
                      <p className="text-sm text-muted-foreground">
                        {formatDate(person.dateOfBirth)}
                        {person.isLiving && person.dateOfBirth && (
                          <span>
                            {" "}
                            • Age {calculateAge(person.dateOfBirth)}
                          </span>
                        )}
                      </p>
                    )}
                    {!person.isLiving && (
                      <p className="text-sm text-muted-foreground">Deceased</p>
                    )}
                    {person.profession && (
                      <p className="truncate text-sm text-muted-foreground">
                        {person.profession}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
