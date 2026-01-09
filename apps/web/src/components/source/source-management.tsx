"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@vamsa/ui/primitives";
import { listSources, deleteSource, getSource } from "~/server/sources";
import { SourceForm } from "./source-form";
import { CitationGenerator } from "./citation-generator";

type SortOption = "title" | "date" | "type";

export function SourceManagement() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [viewingSourceId, setViewingSourceId] = useState<string | null>(null);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [citationSourceId, setCitationSourceId] = useState<string | null>(null);

  const { data: sourcesData, isLoading } = useQuery({
    queryKey: ["sources", filterType],
    queryFn: () => listSources({ data: { type: filterType } }),
  });

  const { data: editingSource } = useQuery({
    queryKey: ["source", editingSourceId],
    queryFn: () => getSource({ data: { sourceId: editingSourceId! } }),
    enabled: Boolean(editingSourceId),
  });

  const { data: viewingSource } = useQuery({
    queryKey: ["source", viewingSourceId],
    queryFn: () => getSource({ data: { sourceId: viewingSourceId! } }),
    enabled: Boolean(viewingSourceId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });

  const sortedSources = sourcesData?.items
    ? [...sourcesData.items].sort((a, b) => {
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === "type") {
          return (a.sourceType || "").localeCompare(b.sourceType || "");
        }
        // Default: date (newest first)
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
    : [];

  const handleDelete = (sourceId: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteMutation.mutate({ data: { sourceId } });
    }
  };

  const handleEdit = (sourceId: string) => {
    setEditingSourceId(sourceId);
  };

  const handleView = (sourceId: string) => {
    setViewingSourceId(sourceId);
  };

  const handleShowCitation = (sourceId: string) => {
    setCitationSourceId(sourceId);
    setShowCitationModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-foreground text-2xl">
            Source Management
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage all source citations and documentation
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
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
          Add New Source
        </Button>
      </div>

      {/* Filters and Sort */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Select
                value={filterType || "all"}
                onValueChange={(value) =>
                  setFilterType(value === "all" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BOOK">Book</SelectItem>
                  <SelectItem value="ARTICLE">Article</SelectItem>
                  <SelectItem value="WEBSITE">Website</SelectItem>
                  <SelectItem value="ARCHIVE">Archive</SelectItem>
                  <SelectItem value="LETTER">Letter</SelectItem>
                  <SelectItem value="FAMILY_RECORD">Family Record</SelectItem>
                  <SelectItem value="CENSUS">Census</SelectItem>
                  <SelectItem value="VITAL_RECORD">Vital Record</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as SortOption)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Newest First</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sources List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex animate-pulse flex-col items-center gap-4">
              <div className="bg-muted h-12 w-12 rounded-full" />
              <div className="bg-muted h-4 w-32 rounded" />
            </div>
          </CardContent>
        </Card>
      ) : sortedSources.length === 0 ? (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="font-display text-foreground mb-2 text-xl">
              No Sources Found
            </h3>
            <p className="text-muted-foreground mb-4">
              {filterType
                ? "No sources match the selected filter."
                : "Start by adding your first source."}
            </p>
            <Button onClick={() => setShowCreateModal(true)}>Add Source</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedSources.map((source) => (
            <Card key={source.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="text-foreground text-lg font-medium">
                        {source.title}
                      </h3>
                      {source.sourceType && (
                        <Badge variant="secondary">
                          {formatSourceType(source.sourceType)}
                        </Badge>
                      )}
                      {source.confidence && (
                        <Badge variant="outline">
                          {source.confidence.charAt(0) +
                            source.confidence.slice(1).toLowerCase()}{" "}
                          Confidence
                        </Badge>
                      )}
                    </div>
                    {source.author && (
                      <p className="text-muted-foreground mb-1 text-sm">
                        by {source.author}
                      </p>
                    )}
                    {source.publicationDate && (
                      <p className="text-muted-foreground font-mono text-xs">
                        Published: {source.publicationDate}
                      </p>
                    )}
                    <div className="text-muted-foreground mt-2 flex gap-4 text-xs">
                      <span>{source.eventCount} events</span>
                      <span>{source.researchNoteCount} research notes</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(source.id)}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowCitation(source.id)}
                    >
                      Citation
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(source.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(source.id, source.title)}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Source Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Create New Source
            </DialogTitle>
          </DialogHeader>
          <SourceForm
            onSuccess={() => setShowCreateModal(false)}
            onCancel={() => setShowCreateModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Source Modal */}
      <Dialog
        open={Boolean(editingSourceId)}
        onOpenChange={(open) => !open && setEditingSourceId(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Edit Source
            </DialogTitle>
          </DialogHeader>
          {editingSource && (
            <SourceForm
              sourceId={editingSourceId!}
              initialData={{
                id: editingSource.id,
                title: editingSource.title,
                author: editingSource.author ?? undefined,
                publicationDate: editingSource.publicationDate ?? undefined,
                description: editingSource.description ?? undefined,
                repository: editingSource.repository ?? undefined,
                notes: editingSource.notes ?? undefined,
                sourceType: (editingSource.sourceType as any) ?? undefined,
                citationFormat: (editingSource.citationFormat as any) ?? undefined,
                doi: editingSource.doi ?? undefined,
                url: editingSource.url ?? undefined,
                isbn: editingSource.isbn ?? undefined,
                callNumber: editingSource.callNumber ?? undefined,
                accessDate: editingSource.accessDate ?? undefined,
                confidence: (editingSource.confidence as any) ?? undefined,
              }}
              onSuccess={() => setEditingSourceId(null)}
              onCancel={() => setEditingSourceId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Source Modal */}
      <Dialog
        open={Boolean(viewingSourceId)}
        onOpenChange={(open) => !open && setViewingSourceId(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {viewingSource?.title}
            </DialogTitle>
          </DialogHeader>
          {viewingSource && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {viewingSource.sourceType && (
                  <Badge variant="secondary">
                    {formatSourceType(viewingSource.sourceType)}
                  </Badge>
                )}
                {viewingSource.confidence && (
                  <Badge variant="outline">
                    {viewingSource.confidence.charAt(0) +
                      viewingSource.confidence.slice(1).toLowerCase()}{" "}
                    Confidence
                  </Badge>
                )}
              </div>
              {viewingSource.author && (
                <div>
                  <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                    Author
                  </h4>
                  <p className="text-foreground">{viewingSource.author}</p>
                </div>
              )}
              {viewingSource.publicationDate && (
                <div>
                  <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                    Publication Date
                  </h4>
                  <p className="text-foreground">
                    {viewingSource.publicationDate}
                  </p>
                </div>
              )}
              {viewingSource.description && (
                <div>
                  <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                    Description
                  </h4>
                  <p className="text-foreground whitespace-pre-wrap">
                    {viewingSource.description}
                  </p>
                </div>
              )}
              {viewingSource.repository && (
                <div>
                  <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                    Repository
                  </h4>
                  <p className="text-foreground">{viewingSource.repository}</p>
                </div>
              )}
              {viewingSource.url && (
                <div>
                  <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                    URL
                  </h4>
                  <a
                    href={viewingSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {viewingSource.url}
                  </a>
                </div>
              )}
              <div>
                <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                  Usage
                </h4>
                <p className="text-foreground">
                  {viewingSource.eventCount} events,{" "}
                  {viewingSource.researchNoteCount} research notes
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Citation Modal */}
      <Dialog
        open={showCitationModal}
        onOpenChange={(open) => {
          setShowCitationModal(open);
          if (!open) setCitationSourceId(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Generate Citation
            </DialogTitle>
          </DialogHeader>
          {citationSourceId && (
            <CitationGenerator sourceId={citationSourceId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatSourceType(sourceType: string): string {
  return sourceType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
