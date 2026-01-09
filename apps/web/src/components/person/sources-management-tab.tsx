"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@vamsa/ui/primitives";
import {
  getPersonSources,
  getResearchNotes,
  deleteSource,
  deleteResearchNote,
  getSource,
} from "~/server/sources";
import { SourcesTab } from "./sources-tab";
import { ResearchNotesList } from "../source/research-notes-list";
import { SourceForm } from "../source/source-form";
import { ResearchNoteForm } from "../source/research-note-form";
import { ResearchNoteModal } from "../source/research-note-modal";
import { SourceDetailModal } from "./source-detail-modal";
import type { SourceWithEvents } from "~/server/sources";

interface SourcesManagementTabProps {
  personId: string;
}

type ModalType =
  | "createSource"
  | "editSource"
  | "createNote"
  | "editNote"
  | "viewNote"
  | "viewSource"
  | null;

interface ResearchNote {
  id: string;
  eventType: string;
  findings: string;
  methodology: string | null;
  limitations: string | null;
  relatedSources: string[];
  conclusionReliability: string | null;
  createdAt: string;
  updatedAt: string;
  source: {
    id: string;
    title: string;
    author: string | null;
    sourceType: string | null;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export function SourcesManagementTab({ personId }: SourcesManagementTabProps) {
  const queryClient = useQueryClient();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedSource, setSelectedSource] = useState<SourceWithEvents | null>(
    null
  );
  const [selectedNote, setSelectedNote] = useState<ResearchNote | null>(null);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);

  // Fetch sources for this person
  const { data: sources = {}, isLoading: isLoadingSources } = useQuery({
    queryKey: ["personSources", personId],
    queryFn: () => getPersonSources({ data: { id: personId } }),
  });

  // Fetch research notes for this person
  const { data: researchNotes = {}, isLoading: isLoadingNotes } = useQuery({
    queryKey: ["researchNotes", personId],
    queryFn: () => getResearchNotes({ data: { personId } }),
  });

  // Fetch source details when editing
  const { data: editingSource } = useQuery({
    queryKey: ["source", editingSourceId],
    queryFn: () => getSource({ data: { sourceId: editingSourceId! } }),
    enabled: Boolean(editingSourceId),
  });

  const deleteSourceMutation = useMutation({
    mutationFn: deleteSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personSources", personId] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteResearchNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researchNotes", personId] });
    },
  });

  const handleViewSource = (source: SourceWithEvents) => {
    setSelectedSource(source);
    setModalType("viewSource");
  };

  const handleEditSource = (source: SourceWithEvents) => {
    setEditingSourceId(source.id);
    setModalType("editSource");
  };

  const handleDeleteSource = (sourceId: string) => {
    if (window.confirm("Are you sure you want to delete this source?")) {
      deleteSourceMutation.mutate({ data: { sourceId } });
    }
  };

  const handleViewNote = (note: ResearchNote) => {
    setSelectedNote(note);
    setModalType("viewNote");
  };

  const handleEditNote = (note: ResearchNote) => {
    setSelectedNote(note);
    setModalType("editNote");
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNoteMutation.mutate({ data: { noteId } });
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedSource(null);
    setSelectedNote(null);
    setEditingSourceId(null);
  };

  const isLoading = isLoadingSources || isLoadingNotes;

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setModalType("createSource")}>
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
              Add Source
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalType("createNote")}
            >
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Add Research Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sources Section */}
      <div>
        <div className="mb-4">
          <h3 className="font-display text-foreground text-xl">
            Source Citations
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Sources documenting life events and facts
          </p>
        </div>
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex animate-pulse flex-col items-center gap-4">
                <div className="bg-muted h-12 w-12 rounded-full" />
                <div className="bg-muted h-4 w-32 rounded" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <SourcesTab sources={sources} />
        )}
      </div>

      {/* Research Notes Section */}
      <div>
        <div className="mb-4">
          <h3 className="font-display text-foreground text-xl">
            Research Notes
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Your research findings and analysis from various sources
          </p>
        </div>
        <ResearchNotesList
          notes={researchNotes}
          onViewNote={handleViewNote}
          onEditNote={handleEditNote}
          onDeleteNote={handleDeleteNote}
          isLoading={isLoading}
        />
      </div>

      {/* Create Source Modal */}
      <Dialog
        open={modalType === "createSource"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Add New Source
            </DialogTitle>
          </DialogHeader>
          <SourceForm onSuccess={closeModal} onCancel={closeModal} />
        </DialogContent>
      </Dialog>

      {/* Edit Source Modal */}
      <Dialog
        open={modalType === "editSource"}
        onOpenChange={(open) => !open && closeModal()}
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
              onSuccess={closeModal}
              onCancel={closeModal}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Source Modal */}
      <SourceDetailModal
        source={selectedSource}
        open={modalType === "viewSource"}
        onOpenChange={(open) => !open && closeModal()}
      />

      {/* Create Research Note Modal */}
      <Dialog
        open={modalType === "createNote"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Add Research Note
            </DialogTitle>
          </DialogHeader>
          <ResearchNoteForm
            personId={personId}
            onSuccess={closeModal}
            onCancel={closeModal}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Research Note Modal */}
      <Dialog
        open={modalType === "editNote"}
        onOpenChange={(open) => !open && closeModal()}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Edit Research Note
            </DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <ResearchNoteForm
              noteId={selectedNote.id}
              personId={personId}
              sourceId={selectedNote.source.id}
              initialData={{
                sourceId: selectedNote.source.id,
                eventType: selectedNote.eventType,
                findings: selectedNote.findings,
                methodology: selectedNote.methodology ?? undefined,
                limitations: selectedNote.limitations ?? undefined,
                relatedSources: selectedNote.relatedSources,
                conclusionReliability: selectedNote.conclusionReliability as any,
              }}
              onSuccess={closeModal}
              onCancel={closeModal}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Research Note Modal */}
      <ResearchNoteModal
        note={selectedNote}
        open={modalType === "viewNote"}
        onOpenChange={(open) => !open && closeModal()}
        onEdit={handleEditNote}
        onDelete={handleDeleteNote}
      />
    </div>
  );
}
