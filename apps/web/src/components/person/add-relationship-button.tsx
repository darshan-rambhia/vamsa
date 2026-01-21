"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui";
import { searchPersons } from "~/server/persons";
import { createRelationship } from "~/server/relationships";

interface AddRelationshipButtonProps {
  personId: string;
  personName: string;
  onSuccess?: () => void;
}

export function AddRelationshipButton({
  personId,
  personName,
  onSuccess,
}: AddRelationshipButtonProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"PARENT" | "CHILD" | "SPOUSE" | "SIBLING">(
    "PARENT"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      isLiving: boolean;
    }>
  >([]);
  const [selectedPerson, setSelectedPerson] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [marriageDate, setMarriageDate] = useState("");
  const [divorceDate, setDivorceDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const results = await searchPersons({
            data: { query: searchQuery, excludeId: personId },
          });
          setSearchResults(results);
        } catch (err) {
          console.error("Search failed:", err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, personId]);

  const resetForm = useCallback(() => {
    setType("PARENT");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPerson(null);
    setMarriageDate("");
    setDivorceDate("");
    setError(null);
  }, []);

  const handleSubmit = async () => {
    if (!selectedPerson) {
      setError("Please select a person");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await createRelationship({
        data: {
          personId,
          relatedPersonId: selectedPerson.id,
          type,
          marriageDate: marriageDate || undefined,
          divorceDate: divorceDate || undefined,
        },
      });
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create relationship"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" data-testid="add-relationship-button">
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="add-relationship-dialog">
        <DialogHeader>
          <DialogTitle>Add Relationship</DialogTitle>
          <DialogDescription>
            Add a family relationship for {personName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div
              data-testid="add-relationship-error"
              className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="relationship-type">Relationship Type</Label>
            <Select
              value={type}
              onValueChange={(value) =>
                setType(value as "PARENT" | "CHILD" | "SPOUSE" | "SIBLING")
              }
            >
              <SelectTrigger
                id="relationship-type"
                data-testid="add-relationship-type-select"
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARENT">Parent</SelectItem>
                <SelectItem value="CHILD">Child</SelectItem>
                <SelectItem value="SPOUSE">Spouse</SelectItem>
                <SelectItem value="SIBLING">Sibling</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="person-search">Search Person</Label>
            <Input
              id="person-search"
              data-testid="add-relationship-search-input"
              placeholder="Type a name (minimum 2 characters)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Clear selection when user starts typing again
                if (selectedPerson) {
                  setSelectedPerson(null);
                }
              }}
            />
            {isSearching && (
              <p className="text-muted-foreground text-sm">Searching...</p>
            )}
            {searchResults.length > 0 && !selectedPerson && (
              <div className="max-h-40 overflow-y-auto rounded-md border">
                {searchResults.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    data-testid={`add-relationship-search-result-${person.id}`}
                    className="hover:bg-muted w-full px-3 py-2 text-left transition-colors"
                    onClick={() => {
                      setSelectedPerson({
                        id: person.id,
                        name: `${person.firstName} ${person.lastName}`,
                      });
                      setSearchQuery(`${person.firstName} ${person.lastName}`);
                      setSearchResults([]);
                    }}
                  >
                    {person.firstName} {person.lastName}
                    {!person.isLiving && (
                      <span className="text-muted-foreground ml-2">
                        (Deceased)
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {selectedPerson && (
              <div
                data-testid="add-relationship-selected-person"
                className="bg-muted flex items-center justify-between rounded-md px-3 py-2"
              >
                <span className="text-sm font-medium">
                  {selectedPerson.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPerson(null);
                    setSearchQuery("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {type === "SPOUSE" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="marriage-date">Marriage Date</Label>
                <Input
                  id="marriage-date"
                  type="date"
                  data-testid="add-relationship-marriage-date"
                  value={marriageDate}
                  onChange={(e) => setMarriageDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="divorce-date">Divorce Date</Label>
                <Input
                  id="divorce-date"
                  type="date"
                  data-testid="add-relationship-divorce-date"
                  value={divorceDate}
                  onChange={(e) => setDivorceDate(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="add-relationship-cancel"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="add-relationship-submit"
              onClick={handleSubmit}
              disabled={isLoading || !selectedPerson}
            >
              {isLoading ? "Adding..." : "Add Relationship"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
