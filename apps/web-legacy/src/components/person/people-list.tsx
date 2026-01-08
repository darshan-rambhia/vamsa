"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  status?: string;
  gender?: string;
}

export function PeopleList({
  persons,
  total: _total,
  page,
  totalPages,
  search,
  status,
  gender,
}: PeopleListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      params.delete("page");
      router.push(`/people?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== search) {
        updateParams({ search: searchValue || null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, search, updateParams]);

  const clearFilters = () => {
    setSearchValue("");
    router.push("/people");
  };

  const hasFilters = search || status || gender;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/people?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={status || "all"}
            onValueChange={(v) =>
              updateParams({ status: v === "all" ? null : v })
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="living">Living</SelectItem>
              <SelectItem value="deceased">Deceased</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={gender || "all"}
            onValueChange={(v) =>
              updateParams({ gender: v === "all" ? null : v })
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {search && <Badge variant="secondary">Search: {search}</Badge>}
          {status && (
            <Badge variant="secondary">
              {status === "living" ? "Living" : "Deceased"}
            </Badge>
          )}
          {gender && (
            <Badge variant="secondary">
              {gender === "MALE"
                ? "Male"
                : gender === "FEMALE"
                  ? "Female"
                  : "Other"}
            </Badge>
          )}
        </div>
      )}

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
                          <span> • Age {calculateAge(person.dateOfBirth)}</span>
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
