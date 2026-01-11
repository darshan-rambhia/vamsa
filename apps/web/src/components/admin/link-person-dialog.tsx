"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
} from "@vamsa/ui/primitives";
import { getAvailablePersons, linkUserToPerson } from "~/server/users";

interface LinkPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentPerson: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  onSuccess?: () => void;
}

export function LinkPersonDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentPerson,
  onSuccess,
}: LinkPersonDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
    currentPerson?.id ?? null
  );
  const [error, setError] = useState<string | null>(null);

  const { data: persons, isLoading } = useQuery({
    queryKey: ["availablePersons", search],
    queryFn: () =>
      getAvailablePersons({ data: { search: search || undefined } }),
    enabled: open,
  });

  const linkMutation = useMutation({
    mutationFn: (personId: string | null) =>
      linkUserToPerson({ data: { userId, personId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSave = () => {
    setError(null);
    linkMutation.mutate(selectedPersonId);
  };

  const handleUnlink = () => {
    setError(null);
    linkMutation.mutate(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link User to Person</DialogTitle>
          <DialogDescription>
            Link {userName} to a person in the family tree
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {currentPerson && (
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground text-sm">
                Currently linked to:
              </p>
              <p className="font-medium">
                {currentPerson.firstName} {currentPerson.lastName}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleUnlink}
                disabled={linkMutation.isPending}
              >
                Unlink
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="person-search">Search for a person</Label>
            <Input
              id="person-search"
              type="text"
              placeholder="Type to search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-60 space-y-1 overflow-auto rounded-md border p-2">
            {isLoading ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Loading...
              </p>
            ) : persons && persons.length > 0 ? (
              persons.map((person) => (
                <button
                  key={person.id}
                  className={`hover:bg-accent flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                    selectedPersonId === person.id
                      ? "bg-primary/10 border-primary border"
                      : ""
                  }`}
                  onClick={() => setSelectedPersonId(person.id)}
                >
                  <span>
                    {person.firstName} {person.lastName}
                  </span>
                  {selectedPersonId === person.id && (
                    <svg
                      className="text-primary h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <p className="text-muted-foreground py-4 text-center text-sm">
                {search
                  ? "No matching persons found"
                  : "All persons are already linked"}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={linkMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                linkMutation.isPending || selectedPersonId === currentPerson?.id
              }
            >
              {linkMutation.isPending ? "Saving..." : "Link Person"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
