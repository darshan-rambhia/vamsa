"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Input,
  Label,
  Button,
} from "@vamsa/ui/primitives";
import { Link } from "@tanstack/react-router";
import { formatDate, formatDateForInput } from "@vamsa/lib";
import { updateRelationship, deleteRelationship } from "~/server/relationships";
import { AddRelationshipButton } from "./add-relationship-button";

interface Relationship {
  id: string;
  type: string;
  marriageDate?: string | null;
  divorceDate?: string | null;
  relatedPerson: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface RelationshipsTabProps {
  relationships: Relationship[];
  personId: string;
  personName: string;
  onRelationshipAdded?: () => void;
}

export function RelationshipsTab({
  relationships,
  personId,
  personName,
  onRelationshipAdded,
}: RelationshipsTabProps) {
  const [editingRel, setEditingRel] = useState<Relationship | null>(null);
  const [marriageDate, setMarriageDate] = useState("");
  const [divorceDate, setDivorceDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingRel, setDeletingRel] = useState<Relationship | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openEditDialog(rel: Relationship) {
    setEditingRel(rel);
    setMarriageDate(formatDateForInput(rel.marriageDate));
    setDivorceDate(formatDateForInput(rel.divorceDate));
    setError(null);
  }

  async function handleUpdate() {
    if (!editingRel) return;
    setIsLoading(true);
    setError(null);
    try {
      await updateRelationship({
        data: {
          id: editingRel.id,
          marriageDate: marriageDate ? new Date(marriageDate) : null,
          divorceDate: divorceDate ? new Date(divorceDate) : null,
        },
      });
      setEditingRel(null);
      onRelationshipAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  function openDeleteDialog(rel: Relationship) {
    setDeletingRel(rel);
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!deletingRel) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteRelationship({
        data: {
          id: deletingRel.id,
        },
      });
      setDeletingRel(null);
      onRelationshipAdded?.();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsDeleting(false);
    }
  }

  if (relationships.length === 0) {
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h3 className="font-display text-foreground mb-2 text-xl">
            No Relationships Yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Family relationships will appear here once added.
          </p>
          <AddRelationshipButton
            personId={personId}
            personName={personName}
            onSuccess={onRelationshipAdded}
          />
        </CardContent>
      </Card>
    );
  }

  // Group relationships by type
  const relationshipsByType = relationships.reduce(
    (acc, rel) => {
      const type = rel.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(rel);
      return acc;
    },
    {} as Record<string, Relationship[]>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <AddRelationshipButton
            personId={personId}
            personName={personName}
            onSuccess={onRelationshipAdded}
          />
        </div>
        {Object.entries(relationshipsByType).map(([type, rels]) => (
          <Card key={type}>
            <CardContent className="py-6">
              <h3 className="font-display text-foreground mb-4 text-lg">
                {formatRelationType(type)}
              </h3>
              <div className="space-y-3">
                {rels.map((rel) => (
                  <div
                    key={rel.id}
                    className="border-border bg-card hover:border-primary/30 hover:bg-accent/5 group flex items-center justify-between rounded-md border-2 p-4 transition-all duration-200"
                  >
                    <Link
                      to="/people/$personId"
                      params={{ personId: rel.relatedPerson.id }}
                      className="flex flex-1 items-center gap-3"
                    >
                      <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full font-medium">
                        {rel.relatedPerson.firstName[0]}
                        {rel.relatedPerson.lastName[0]}
                      </div>
                      <div>
                        <div className="text-foreground group-hover:text-primary font-medium transition-colors">
                          {rel.relatedPerson.firstName}{" "}
                          {rel.relatedPerson.lastName}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {formatRelationType(type, true)}
                        </div>
                        {rel.type === "SPOUSE" && rel.marriageDate && (
                          <div className="text-muted-foreground text-xs">
                            Married {formatDate(rel.marriageDate)}
                          </div>
                        )}
                        {rel.type === "SPOUSE" && rel.divorceDate && (
                          <div className="text-muted-foreground text-xs">
                            Divorced {formatDate(rel.divorceDate)}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      {rel.type === "SPOUSE" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEditDialog(rel);
                          }}
                          data-testid="edit-relationship-button"
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
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openDeleteDialog(rel);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        data-testid="delete-relationship-button"
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
                      <svg
                        className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!editingRel}
        onOpenChange={(open) => !open && setEditingRel(null)}
      >
        <DialogContent data-testid="edit-relationship-dialog">
          <DialogHeader>
            <DialogTitle>
              Edit Marriage Details
              {editingRel &&
                ` - ${editingRel.relatedPerson.firstName} ${editingRel.relatedPerson.lastName}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div
                className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
                data-testid="edit-relationship-error"
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="marriageDate">Marriage Date</Label>
              <Input
                id="marriageDate"
                type="date"
                value={marriageDate}
                onChange={(e) => setMarriageDate(e.target.value)}
                data-testid="edit-relationship-marriage-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="divorceDate">Divorce Date (if applicable)</Label>
              <Input
                id="divorceDate"
                type="date"
                value={divorceDate}
                onChange={(e) => setDivorceDate(e.target.value)}
                data-testid="edit-relationship-divorce-date"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingRel(null)}
                data-testid="edit-relationship-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={isLoading}
                data-testid="edit-relationship-save"
              >
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingRel}
        onOpenChange={(open) => !open && setDeletingRel(null)}
      >
        <AlertDialogContent data-testid="delete-relationship-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Relationship</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the{" "}
              <strong>
                {deletingRel &&
                  formatRelationType(deletingRel.type, true).toLowerCase()}
              </strong>{" "}
              relationship with{" "}
              <strong>
                {deletingRel?.relatedPerson.firstName}{" "}
                {deletingRel?.relatedPerson.lastName}
              </strong>
              ? This will remove the relationship in both directions and cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div
              className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
              data-testid="delete-relationship-error"
            >
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-relationship-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="delete-relationship-confirm"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatRelationType(type: string, singular = false): string {
  const formatted = type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  if (singular) {
    return formatted;
  }

  // Pluralize for section headers
  if (type === "CHILD") return "Children";
  if (type === "SPOUSE") return "Spouses";
  if (type === "SIBLING") return "Siblings";
  if (type === "PARENT") return "Parents";
  return formatted + "s";
}
