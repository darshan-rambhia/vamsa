"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@vamsa/ui/primitives";
import { formatDateForInput } from "@vamsa/lib";
import type { EventType } from "@vamsa/schemas";
import { createEvent, updateEvent } from "~/server/events";

interface EventFormModalProps {
  personId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: {
    id: string;
    type: EventType;
    date: string | null;
    place: string | null;
    description: string | null;
  } | null;
}

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: "BIRTH", label: "Birth" },
  { value: "DEATH", label: "Death" },
  { value: "MARRIAGE", label: "Marriage" },
  { value: "DIVORCE", label: "Divorce" },
  { value: "BURIAL", label: "Burial" },
  { value: "GRADUATION", label: "Graduation" },
  { value: "ENGAGEMENT", label: "Engagement" },
  { value: "DIVORCE_FILED", label: "Divorce Filed" },
  { value: "ADOPTION", label: "Adoption" },
  { value: "CONFIRMATION", label: "Confirmation" },
  { value: "IMMIGRATION", label: "Immigration" },
  { value: "EMIGRATION", label: "Emigration" },
  { value: "NATURALIZATION", label: "Naturalization" },
  { value: "RESIDENCE", label: "Residence" },
  { value: "CUSTOM", label: "Custom Event" },
];

export function EventFormModal({
  personId,
  open,
  onOpenChange,
  event,
}: EventFormModalProps) {
  const isEditing = !!event;
  const queryClient = useQueryClient();

  const [eventType, setEventType] = useState<EventType>(event?.type || "BIRTH");
  const [date, setDate] = useState(
    event?.date ? formatDateForInput(event.date) : ""
  );
  const [place, setPlace] = useState(event?.place || "");
  const [description, setDescription] = useState(event?.description || "");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personEvents", personId] });
      handleClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create event");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personEvents", personId] });
      handleClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to update event");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const eventData = {
      type: eventType,
      date: date || null,
      place: place || undefined,
      description: description || undefined,
    };

    if (isEditing && event) {
      await updateMutation.mutateAsync({
        data: {
          id: event.id,
          ...eventData,
        },
      });
    } else {
      await createMutation.mutateAsync({
        data: {
          personId,
          ...eventData,
        },
      });
    }
  };

  const handleClose = () => {
    if (!createMutation.isPending && !updateMutation.isPending) {
      setEventType("BIRTH");
      setDate("");
      setPlace("");
      setDescription("");
      setError(null);
      onOpenChange(false);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="event-form-modal">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEditing ? "Edit Event" : "Add Event"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
              data-testid="event-form-error"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="event-type">Event Type</Label>
            <Select
              value={eventType}
              onValueChange={(value) => setEventType(value as EventType)}
            >
              <SelectTrigger id="event-type" data-testid="event-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-date">Date (optional)</Label>
            <Input
              id="event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="event-date-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-place">Place (optional)</Label>
            <Input
              id="event-place"
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="e.g., New York, NY"
              data-testid="event-place-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">Description (optional)</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about this event"
              rows={4}
              data-testid="event-description-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              data-testid="event-form-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              data-testid="event-form-submit"
            >
              {isLoading
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
