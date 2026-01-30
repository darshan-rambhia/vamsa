"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Input,
  Label,
} from "@vamsa/ui/primitives";
import { Link } from "@tanstack/react-router";
import { formatDate } from "@vamsa/lib";
import { EventFormModal } from "./event-form-modal";
import type { EventType } from "@vamsa/schemas";
import {
  addEventParticipant,
  deleteEvent,
  removeEventParticipant,
} from "~/server/events";
import { searchPersons } from "~/server/persons.functions";

interface EventDetailModalProps {
  event: {
    id: string;
    type: EventType;
    date: string | null;
    place: string | null;
    description: string | null;
    participants: Array<{
      id: string;
      personId: string;
      role: string | null;
      person: {
        id: string;
        firstName: string;
        lastName: string;
      };
    }>;
  };
  personId: string;
  onClose: () => void;
}

export function EventDetailModal({
  event,
  personId,
  onClose,
}: EventDetailModalProps) {
  const eventTypeConfig = getEventTypeConfig(event.type);
  const queryClient = useQueryClient();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
    }>
  >([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    string | null
  >(null);
  const [participantRole, setParticipantRole] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personEvents", personId] });
      onClose();
    },
    onError: (err) => {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete event"
      );
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: addEventParticipant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personEvents", personId] });
      setIsAddParticipantOpen(false);
      setParticipantSearch("");
      setSearchResults([]);
      setSelectedParticipantId(null);
      setParticipantRole("");
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: removeEventParticipant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personEvents", personId] });
    },
  });

  const handleDelete = async () => {
    setDeleteError(null);
    await deleteMutation.mutateAsync({ data: { eventId: event.id } });
  };

  const handleSearchParticipants = async (query: string) => {
    setParticipantSearch(query);
    if (query.length >= 2) {
      const results = await searchPersons({ data: { query } });
      // Filter out already added participants
      const participantIds = new Set(event.participants.map((p) => p.personId));
      setSearchResults(results.filter((r) => !participantIds.has(r.id)));
    } else {
      setSearchResults([]);
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedParticipantId) return;
    await addParticipantMutation.mutateAsync({
      data: {
        eventId: event.id,
        personId: selectedParticipantId,
        role: participantRole || undefined,
      },
    });
  };

  const handleRemoveParticipant = async (participantPersonId: string) => {
    if (
      window.confirm(
        "Are you sure you want to remove this participant from the event?"
      )
    ) {
      await removeParticipantMutation.mutateAsync({
        data: {
          eventId: event.id,
          personId: participantPersonId,
        },
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="bg-background/80 absolute inset-0 backdrop-blur-sm"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          role="button"
          tabIndex={0}
          aria-label="Close modal"
        />

        {/* Modal */}
        <div className="bg-card border-border relative z-10 mx-4 w-full max-w-2xl rounded-lg border-2 shadow-xl">
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-foreground text-2xl">
                Event Details
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                data-testid="edit-event-button"
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
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-muted-foreground hover:text-destructive"
                data-testid="delete-event-button"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="hover:bg-accent"
              >
                <svg
                  className="h-5 w-5"
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
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6">
            {/* Event Type */}
            <div>
              <div className="text-muted-foreground mb-2 text-sm">
                Event Type
              </div>
              <Badge className={eventTypeConfig.badgeClass} variant="outline">
                {eventTypeConfig.label}
              </Badge>
            </div>

            {/* Date */}
            {event.date && (
              <div>
                <div className="text-muted-foreground mb-2 text-sm">Date</div>
                <p className="text-foreground font-mono">
                  {formatDate(new Date(event.date))}
                </p>
              </div>
            )}

            {/* Place */}
            {event.place && (
              <div>
                <div className="text-muted-foreground mb-2 text-sm">Place</div>
                <p className="text-foreground">{event.place}</p>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div>
                <div className="text-muted-foreground mb-2 text-sm">
                  Description
                </div>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {/* Participants */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                  Participants
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddParticipantOpen(!isAddParticipantOpen)}
                  data-testid="add-participant-button"
                >
                  <svg
                    className="mr-1 h-3 w-3"
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
                  Add Participant
                </Button>
              </div>

              {isAddParticipantOpen && (
                <div className="border-border bg-accent/5 mb-3 space-y-3 rounded-md border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="participant-search">Search Person</Label>
                    <Input
                      id="participant-search"
                      type="text"
                      value={participantSearch}
                      onChange={(e) => handleSearchParticipants(e.target.value)}
                      placeholder="Search by name..."
                      data-testid="participant-search-input"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border-border max-h-40 space-y-1 overflow-y-auto rounded-md border">
                      {searchResults.map((person) => (
                        <button
                          key={person.id}
                          onClick={() => {
                            setSelectedParticipantId(person.id);
                            setParticipantSearch(
                              `${person.firstName} ${person.lastName}`
                            );
                            setSearchResults([]);
                          }}
                          className="hover:bg-accent w-full px-3 py-2 text-left text-sm transition-colors"
                          data-testid={`participant-search-result-${person.id}`}
                        >
                          {person.firstName} {person.lastName}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="participant-role">Role (optional)</Label>
                    <Input
                      id="participant-role"
                      type="text"
                      value={participantRole}
                      onChange={(e) => setParticipantRole(e.target.value)}
                      placeholder="e.g., Witness, Officiant"
                      data-testid="participant-role-input"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddParticipantOpen(false);
                        setParticipantSearch("");
                        setSearchResults([]);
                        setSelectedParticipantId(null);
                        setParticipantRole("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddParticipant}
                      disabled={
                        !selectedParticipantId ||
                        addParticipantMutation.isPending
                      }
                      data-testid="participant-add-confirm"
                    >
                      {addParticipantMutation.isPending ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>
              )}

              {event.participants.length > 0 ? (
                <div className="space-y-2">
                  {event.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="border-border bg-card hover:border-primary/30 group flex items-center justify-between rounded-md border-2 p-3 transition-all duration-200"
                    >
                      <Link
                        to="/people/$personId"
                        params={{ personId: participant.person.id }}
                        className="flex flex-1 items-center gap-3"
                      >
                        <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                          {participant.person.firstName[0]}
                          {participant.person.lastName[0]}
                        </div>
                        <div>
                          <div className="text-foreground group-hover:text-primary text-sm font-medium transition-colors">
                            {participant.person.firstName}{" "}
                            {participant.person.lastName}
                          </div>
                          {participant.role && (
                            <div className="text-muted-foreground text-xs">
                              {participant.role}
                            </div>
                          )}
                        </div>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveParticipant(participant.personId);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        data-testid={`remove-participant-${participant.personId}`}
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
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No participants added yet
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-border border-t px-6 py-4">
            <Button onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Event Modal */}
      <EventFormModal
        personId={personId}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        event={event}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent data-testid="delete-event-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div
              className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
              data-testid="delete-event-error"
            >
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-event-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="delete-event-confirm"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function getEventTypeConfig(type: EventType): {
  label: string;
  badgeClass: string;
} {
  switch (type) {
    case "BIRTH":
      return {
        label: "Birth",
        badgeClass:
          "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
      };
    case "DEATH":
      return {
        label: "Death",
        badgeClass:
          "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400",
      };
    case "MARRIAGE":
      return {
        label: "Marriage",
        badgeClass:
          "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
      };
    case "DIVORCE":
      return {
        label: "Divorce",
        badgeClass:
          "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400",
      };
    case "BURIAL":
      return {
        label: "Burial",
        badgeClass:
          "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400",
      };
    case "GRADUATION":
      return {
        label: "Graduation",
        badgeClass:
          "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400",
      };
    case "CUSTOM":
      return {
        label: "Event",
        badgeClass: "border-border bg-muted text-foreground",
      };
    default:
      return {
        label: "Event",
        badgeClass: "border-border bg-muted text-foreground",
      };
  }
}
