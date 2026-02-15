"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui/primitives";
import { SourceForm } from "./source-form";
import { CitationGenerator } from "./citation-generator";
import type { CitationFormat, Confidence, SourceType } from "@vamsa/schemas";
import { deleteSource, getSource, listSources } from "~/server/sources";

type SortOption = "title" | "date" | "type";

export function SourceManagement() {
  const { t } = useTranslation(["people", "common"]);
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
            {t("people:sourceManagement")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("people:manageSourcesDescription")}
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
          {t("people:addNewSource")}
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
                  <SelectValue placeholder={t("people:filterByType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("people:allTypes")}</SelectItem>
                  <SelectItem value="BOOK">{t("people:book")}</SelectItem>
                  <SelectItem value="ARTICLE">{t("people:article")}</SelectItem>
                  <SelectItem value="WEBSITE">{t("people:website")}</SelectItem>
                  <SelectItem value="ARCHIVE">{t("people:archive")}</SelectItem>
                  <SelectItem value="LETTER">{t("people:letter")}</SelectItem>
                  <SelectItem value="FAMILY_RECORD">
                    {t("people:familyRecord")}
                  </SelectItem>
                  <SelectItem value="CENSUS">{t("people:census")}</SelectItem>
                  <SelectItem value="VITAL_RECORD">
                    {t("people:vitalRecord")}
                  </SelectItem>
                  <SelectItem value="OTHER">{t("common:other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as SortOption)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("people:sortBy")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">
                    {t("people:newestFirst")}
                  </SelectItem>
                  <SelectItem value="title">{t("people:titleAZ")}</SelectItem>
                  <SelectItem value="type">{t("common:type")}</SelectItem>
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
              {t("people:noSourcesFound")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filterType
                ? t("people:noSourcesMatchFilter")
                : t("people:startByAddingSource")}
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              {t("people:addSource")}
            </Button>
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
                          {t("people:confidenceLabel")}
                        </Badge>
                      )}
                    </div>
                    {source.author && (
                      <p className="text-muted-foreground mb-1 text-sm">
                        {t("people:by")} {source.author}
                      </p>
                    )}
                    {source.publicationDate && (
                      <p className="text-muted-foreground font-mono text-xs">
                        {t("people:publicationDate")}: {source.publicationDate}
                      </p>
                    )}
                    <div className="text-muted-foreground mt-2 flex gap-4 text-xs">
                      <span>
                        {source.eventCount} {t("people:eventsCount")}
                      </span>
                      <span>
                        {source.researchNoteCount}{" "}
                        {t("people:researchNotesCount")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(source.id)}
                    >
                      {t("people:view")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowCitation(source.id)}
                    >
                      {t("people:citation")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(source.id)}
                    >
                      {t("common:edit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(source.id, source.title)}
                      className="text-destructive hover:text-destructive"
                    >
                      {t("common:delete")}
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
              {t("people:createNewSource")}
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
              {t("people:editSource")}
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
                sourceType:
                  (editingSource.sourceType as SourceType) ?? undefined,
                citationFormat:
                  (editingSource.citationFormat as CitationFormat) ?? undefined,
                doi: editingSource.doi ?? undefined,
                url: editingSource.url ?? undefined,
                isbn: editingSource.isbn ?? undefined,
                callNumber: editingSource.callNumber ?? undefined,
                accessDate: editingSource.accessDate ?? undefined,
                confidence:
                  (editingSource.confidence as Confidence) ?? undefined,
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
                    {t("people:author")}
                  </h4>
                  <p className="text-foreground">{viewingSource.author}</p>
                </div>
              )}
              {viewingSource.publicationDate && (
                <div>
                  <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                    {t("people:publicationDate")}
                  </h4>
                  <p className="text-foreground">
                    {viewingSource.publicationDate}
                  </p>
                </div>
              )}
              {viewingSource.description && (
                <div>
                  <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                    {t("people:description")}
                  </h4>
                  <p className="text-foreground whitespace-pre-wrap">
                    {viewingSource.description}
                  </p>
                </div>
              )}
              {viewingSource.repository && (
                <div>
                  <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                    {t("people:repository")}
                  </h4>
                  <p className="text-foreground">{viewingSource.repository}</p>
                </div>
              )}
              {viewingSource.url && (
                <div>
                  <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                    {t("people:url")}
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
                  {t("people:usage")}
                </h4>
                <p className="text-foreground">
                  {viewingSource.eventCount} {t("people:eventsCount")},{" "}
                  {viewingSource.researchNoteCount}{" "}
                  {t("people:researchNotesCount")}
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
              {t("people:generatedCitation")}
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
