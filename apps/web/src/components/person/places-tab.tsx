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
  Card,
  CardContent,
} from "@vamsa/ui/primitives";
import { PlaceDetailModal } from "../place/place-detail-modal";
import { PlaceLinkFormModal } from "./place-link-form-modal";
import { unlinkPersonFromPlace } from "~/server/places";

interface PersonPlace {
  id: string;
  place: {
    id: string;
    name: string;
    placeType: string;
    latitude: number | null;
    longitude: number | null;
  };
  parentName: string | null;
  fromYear: number | null;
  toYear: number | null;
  type: string | null;
}

interface PlacesTabProps {
  places: Array<PersonPlace>;
  personId?: string;
}

export function PlacesTab({ places, personId }: PlacesTabProps) {
  const queryClient = useQueryClient();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PersonPlace | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: unlinkPersonFromPlace,
    onSuccess: () => {
      if (personId) {
        queryClient.invalidateQueries({ queryKey: ["personPlaces", personId] });
      }
      setLinkToDelete(null);
    },
  });

  const handleDeleteLink = async () => {
    if (linkToDelete) {
      await deleteMutation.mutateAsync({ data: { linkId: linkToDelete } });
    }
  };

  if (places.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-muted-foreground/50 mb-4">
            <svg
              className="mx-auto h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h3 className="font-display text-foreground mb-2 text-xl">
            No Places Recorded
          </h3>
          <p className="text-muted-foreground mb-4">
            Places where this person lived, worked, or visited will appear here
            once added.
          </p>
          {personId && (
            <Button onClick={() => setIsAddModalOpen(true)}>Add Place</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Group places by type
  const placesByType = places.reduce(
    (acc, place) => {
      const type = place.type || "OTHER";
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(place);
      return acc;
    },
    {} as Record<string, Array<PersonPlace>>
  );

  // Sort places chronologically (earliest first)
  const sortedPlaces = [...places].sort((a, b) => {
    if (!a.fromYear) return 1;
    if (!b.fromYear) return -1;
    return a.fromYear - b.fromYear;
  });

  return (
    <>
      <div className="space-y-6">
        {/* Timeline view */}
        <Card>
          <CardContent className="py-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-foreground text-lg">Timeline</h3>
              {personId && (
                <Button onClick={() => setIsAddModalOpen(true)}>
                  Add Place
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {sortedPlaces.map((place) => (
                <div
                  key={place.id}
                  className="border-border rounded-md border p-4 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Icon */}
                    <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
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
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>

                    {/* Content */}
                    <div
                      className="hover:bg-accent/5 flex-1 cursor-pointer space-y-2 rounded-md p-2 transition-colors"
                      onClick={() => setSelectedPlaceId(place.place.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedPlaceId(place.place.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-display text-foreground text-base">
                          {place.place.name}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {formatPlaceType(place.place.placeType)}
                        </Badge>
                        {place.type && (
                          <Badge
                            variant="outline"
                            className={getPlaceTypeColor(place.type)}
                          >
                            {formatPersonPlaceType(place.type)}
                          </Badge>
                        )}
                      </div>

                      {place.parentName && (
                        <p className="text-muted-foreground text-sm">
                          {place.parentName}
                        </p>
                      )}

                      {(place.fromYear || place.toYear) && (
                        <p className="text-muted-foreground font-mono text-sm">
                          {place.fromYear || "?"} — {place.toYear || "Present"}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {personId && (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLink(place);
                          }}
                          data-testid={`edit-place-${place.id}`}
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkToDelete(place.id);
                          }}
                          data-testid={`delete-place-${place.id}`}
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
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Grouped by type */}
        <div className="space-y-4">
          <h3 className="font-display text-foreground text-lg">By Type</h3>
          {Object.entries(placesByType).map(([type, typePlaces]) => (
            <Card key={type}>
              <CardContent className="py-4">
                <details open className="group">
                  <summary className="hover:text-primary flex cursor-pointer items-center justify-between transition-colors">
                    <h4 className="font-display text-foreground text-base">
                      {formatPersonPlaceTypePlural(type)} ({typePlaces.length})
                    </h4>
                    <svg
                      className="text-muted-foreground h-5 w-5 transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <div className="mt-4 space-y-2">
                    {typePlaces
                      .sort((a, b) => {
                        if (!a.fromYear) return 1;
                        if (!b.fromYear) return -1;
                        return a.fromYear - b.fromYear;
                      })
                      .map((place) => (
                        <div
                          key={place.id}
                          className="border-border rounded-md border p-3 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div
                              className="hover:bg-accent/5 flex-1 cursor-pointer space-y-1 rounded-md p-2 transition-colors"
                              onClick={() => setSelectedPlaceId(place.place.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedPlaceId(place.place.id);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="flex items-center gap-2">
                                <p className="text-foreground text-sm font-medium">
                                  {place.place.name}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {formatPlaceType(place.place.placeType)}
                                </Badge>
                              </div>
                              {place.parentName && (
                                <p className="text-muted-foreground text-xs">
                                  {place.parentName}
                                </p>
                              )}
                              {(place.fromYear || place.toYear) && (
                                <p className="text-muted-foreground font-mono text-xs">
                                  {place.fromYear || "?"} —{" "}
                                  {place.toYear || "Present"}
                                </p>
                              )}
                            </div>
                            {personId && (
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingLink(place);
                                  }}
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
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLinkToDelete(place.id);
                                  }}
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
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Place detail modal */}
      {selectedPlaceId && (
        <PlaceDetailModal
          placeId={selectedPlaceId}
          onClose={() => setSelectedPlaceId(null)}
        />
      )}

      {/* Add/Edit place link modal */}
      {personId && (
        <>
          <PlaceLinkFormModal
            personId={personId}
            open={isAddModalOpen}
            onOpenChange={setIsAddModalOpen}
          />
          <PlaceLinkFormModal
            personId={personId}
            open={!!editingLink}
            onOpenChange={(open) => !open && setEditingLink(null)}
            existingLink={editingLink}
          />
        </>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!linkToDelete}
        onOpenChange={(open) => !open && setLinkToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Place Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this place link? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLink}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatPlaceType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function formatPersonPlaceType(type: string): string {
  switch (type) {
    case "BIRTH":
      return "Birth";
    case "MARRIAGE":
      return "Marriage";
    case "DEATH":
      return "Death";
    case "LIVED":
      return "Lived";
    case "WORKED":
      return "Worked";
    case "STUDIED":
      return "Studied";
    case "OTHER":
      return "Other";
    default:
      return type;
  }
}

function formatPersonPlaceTypePlural(type: string): string {
  switch (type) {
    case "BIRTH":
      return "Birth Places";
    case "MARRIAGE":
      return "Marriage Places";
    case "DEATH":
      return "Death Places";
    case "LIVED":
      return "Places Lived";
    case "WORKED":
      return "Work Places";
    case "STUDIED":
      return "Places Studied";
    case "OTHER":
      return "Other Places";
    default:
      return "Places";
  }
}

function getPlaceTypeColor(type: string): string {
  switch (type) {
    case "BIRTH":
      return "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400";
    case "MARRIAGE":
      return "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "DEATH":
      return "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400";
    case "LIVED":
      return "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "WORKED":
      return "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "STUDIED":
      return "border-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400";
    default:
      return "border-border bg-muted text-foreground";
  }
}
