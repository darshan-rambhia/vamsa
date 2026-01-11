"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui/primitives";
import { linkPersonToPlace, updatePlacePersonLink } from "~/server/places";
import { PersonPlaceType } from "@vamsa/schemas";
import { PlaceSearch } from "../place/place-search";

interface PlaceLinkFormModalProps {
  personId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLink?: {
    id: string;
    place: {
      id: string;
      name: string;
      placeType: string;
    };
    fromYear: number | null;
    toYear: number | null;
    type: string | null;
  } | null;
}

const PERSON_PLACE_TYPE_OPTIONS: Array<{
  value: PersonPlaceType;
  label: string;
}> = [
  { value: "BIRTH", label: "Birth Place" },
  { value: "MARRIAGE", label: "Marriage Place" },
  { value: "DEATH", label: "Death Place" },
  { value: "LIVED", label: "Lived" },
  { value: "WORKED", label: "Worked" },
  { value: "STUDIED", label: "Studied" },
  { value: "OTHER", label: "Other" },
];

export function PlaceLinkFormModal({
  personId,
  open,
  onOpenChange,
  existingLink,
}: PlaceLinkFormModalProps) {
  const isEditing = !!existingLink;
  const queryClient = useQueryClient();

  const [selectedPlace, setSelectedPlace] = useState<{
    id: string;
    name: string;
    placeType: string;
    parentName: string | null;
  } | null>(
    existingLink
      ? {
          id: existingLink.place.id,
          name: existingLink.place.name,
          placeType: existingLink.place.placeType,
          parentName: null,
        }
      : null
  );
  const [placeType, setPlaceType] = useState<PersonPlaceType | "">(
    (existingLink?.type as PersonPlaceType) || ""
  );
  const [fromYear, setFromYear] = useState(
    existingLink?.fromYear?.toString() || ""
  );
  const [toYear, setToYear] = useState(existingLink?.toYear?.toString() || "");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: linkPersonToPlace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personPlaces", personId] });
      handleClose();
    },
    onError: (err) => {
      setError(
        err instanceof Error ? err.message : "Failed to link place to person"
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: updatePlacePersonLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personPlaces", personId] });
      handleClose();
    },
    onError: (err) => {
      setError(
        err instanceof Error ? err.message : "Failed to update place link"
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEditing && !selectedPlace) {
      setError("Please select a place");
      return;
    }

    const fromYearNum = fromYear ? parseInt(fromYear, 10) : null;
    const toYearNum = toYear ? parseInt(toYear, 10) : null;

    if (fromYearNum !== null && isNaN(fromYearNum)) {
      setError("From Year must be a valid number");
      return;
    }

    if (toYearNum !== null && isNaN(toYearNum)) {
      setError("To Year must be a valid number");
      return;
    }

    if (fromYearNum !== null && toYearNum !== null && fromYearNum > toYearNum) {
      setError("From Year cannot be greater than To Year");
      return;
    }

    if (isEditing && existingLink) {
      await updateMutation.mutateAsync({
        data: {
          linkId: existingLink.id,
          fromYear: fromYearNum,
          toYear: toYearNum,
          type: placeType || null,
        },
      });
    } else if (selectedPlace) {
      await createMutation.mutateAsync({
        data: {
          personId,
          placeId: selectedPlace.id,
          fromYear: fromYearNum,
          toYear: toYearNum,
          type: placeType || null,
        },
      });
    }
  };

  const handleClose = () => {
    if (!createMutation.isPending && !updateMutation.isPending) {
      setSelectedPlace(null);
      setPlaceType("");
      setFromYear("");
      setToYear("");
      setError(null);
      onOpenChange(false);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="place-link-form-modal">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEditing ? "Edit Place Link" : "Add Place"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
              data-testid="place-link-form-error"
            >
              {error}
            </div>
          )}

          {/* Place Selection - Only for CREATE mode */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="place-search">Select Place</Label>
              {selectedPlace ? (
                <div className="border-border flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      {selectedPlace.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatPlaceType(selectedPlace.placeType)}
                      {selectedPlace.parentName &&
                        ` · ${selectedPlace.parentName}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPlace(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <PlaceSearch
                  onSelect={(place) => setSelectedPlace(place)}
                  placeholder="Search for a place..."
                />
              )}
            </div>
          )}

          {/* Place Type */}
          <div className="space-y-2">
            <Label htmlFor="place-type">Link Type (optional)</Label>
            <Select
              value={placeType}
              onValueChange={(value) => setPlaceType(value as PersonPlaceType)}
            >
              <SelectTrigger id="place-type" data-testid="place-type-select">
                <SelectValue placeholder="Select a type..." />
              </SelectTrigger>
              <SelectContent>
                {PERSON_PLACE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From Year */}
          <div className="space-y-2">
            <Label htmlFor="from-year">From Year (optional)</Label>
            <Input
              id="from-year"
              type="number"
              value={fromYear}
              onChange={(e) => setFromYear(e.target.value)}
              placeholder="e.g., 1950"
              data-testid="from-year-input"
            />
          </div>

          {/* To Year */}
          <div className="space-y-2">
            <Label htmlFor="to-year">To Year (optional)</Label>
            <Input
              id="to-year"
              type="number"
              value={toYear}
              onChange={(e) => setToYear(e.target.value)}
              placeholder="e.g., 1960"
              data-testid="to-year-input"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              data-testid="place-link-form-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (!isEditing && !selectedPlace)}
              data-testid="place-link-form-submit"
            >
              {isLoading
                ? isEditing
                  ? "Saving..."
                  : "Adding..."
                : isEditing
                  ? "Save Changes"
                  : "Add Place"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatPlaceType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
