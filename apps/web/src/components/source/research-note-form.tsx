"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from "@vamsa/ui/primitives";
import {
  type ResearchNoteCreateInput,
  type ResearchNoteUpdateInput,
  type Reliability,
} from "@vamsa/schemas";
import {
  createResearchNote,
  updateResearchNote,
  listSources,
} from "~/server/sources";

interface ResearchNoteFormProps {
  noteId?: string;
  personId: string;
  sourceId?: string;
  initialData?: Partial<ResearchNoteUpdateInput>;
  onSuccess?: (noteId: string) => void;
  onCancel?: () => void;
}

export function ResearchNoteForm({
  noteId,
  personId,
  sourceId: initialSourceId,
  initialData,
  onSuccess,
  onCancel,
}: ResearchNoteFormProps) {
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [relatedSourcesInput, setRelatedSourcesInput] = useState("");
  const [selectedRelatedSources, setSelectedRelatedSources] = useState<
    string[]
  >(initialData?.relatedSources || []);

  const isEditing = Boolean(noteId);

  // Fetch all sources for the source selector and related sources
  const { data: sourcesData } = useQuery({
    queryKey: ["sources"],
    queryFn: () => listSources({ data: {} }),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResearchNoteCreateInput>({
    defaultValues: {
      sourceId: initialSourceId || initialData?.sourceId || "",
      personId,
      eventType: initialData?.eventType || "",
      findings: initialData?.findings || "",
      methodology: initialData?.methodology || "",
      limitations: initialData?.limitations || "",
      conclusionReliability: initialData?.conclusionReliability || undefined,
    },
  });

  const selectedSourceId = watch("sourceId");

  const createMutation = useMutation({
    mutationFn: createResearchNote,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["researchNotes", personId] });
      queryClient.invalidateQueries({ queryKey: ["personSources", personId] });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.(data.id);
      }, 1500);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to create research note");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateResearchNote,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["researchNotes", personId] });
      queryClient.invalidateQueries({ queryKey: ["personSources", personId] });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.(data.id);
      }, 1500);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to update research note");
    },
  });

  const onSubmit = (data: ResearchNoteCreateInput) => {
    setErrorMessage(null);

    const payload = {
      ...data,
      relatedSources:
        selectedRelatedSources.length > 0 ? selectedRelatedSources : undefined,
    };

    if (isEditing && noteId) {
      updateMutation.mutate({
        data: {
          id: noteId,
          ...payload,
        } as ResearchNoteUpdateInput,
      });
    } else {
      createMutation.mutate({ data: payload as ResearchNoteCreateInput });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleAddRelatedSource = () => {
    if (
      relatedSourcesInput &&
      !selectedRelatedSources.includes(relatedSourcesInput)
    ) {
      setSelectedRelatedSources([
        ...selectedRelatedSources,
        relatedSourcesInput,
      ]);
      setRelatedSourcesInput("");
    }
  };

  const handleRemoveRelatedSource = (sourceId: string) => {
    setSelectedRelatedSources(
      selectedRelatedSources.filter((id) => id !== sourceId)
    );
  };

  const getSourceTitle = (sourceId: string) => {
    return (
      sourcesData?.items?.find((s) => s.id === sourceId)?.title || sourceId
    );
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Source Selection */}
        <div className="space-y-2">
          <Label htmlFor="sourceId">
            Source <span className="text-destructive">*</span>
          </Label>
          <Select
            value={selectedSourceId}
            onValueChange={(value) => setValue("sourceId", value)}
            disabled={isLoading || Boolean(initialSourceId)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a source..." />
            </SelectTrigger>
            <SelectContent>
              {sourcesData?.items?.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.title} {source.author && `- ${source.author}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sourceId && (
            <p className="text-destructive text-sm">
              {errors.sourceId.message}
            </p>
          )}
        </div>

        {/* Event Type */}
        <div className="space-y-2">
          <Label htmlFor="eventType">
            Event Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch("eventType")}
            onValueChange={(value) => setValue("eventType", value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select event type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BIRTH">Birth</SelectItem>
              <SelectItem value="DEATH">Death</SelectItem>
              <SelectItem value="MARRIAGE">Marriage</SelectItem>
              <SelectItem value="DIVORCE">Divorce</SelectItem>
              <SelectItem value="BURIAL">Burial</SelectItem>
              <SelectItem value="GRADUATION">Graduation</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
          {errors.eventType && (
            <p className="text-destructive text-sm">
              {errors.eventType.message}
            </p>
          )}
        </div>

        {/* Findings (Rich text) */}
        <div className="space-y-2">
          <Label htmlFor="findings">
            Findings <span className="text-destructive">*</span>
          </Label>
          <textarea
            id="findings"
            {...register("findings")}
            placeholder="What did you discover from this source? Include key facts, dates, names, and observations..."
            rows={6}
            disabled={isLoading}
            className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 hover:border-primary/50 placeholder:text-muted-foreground disabled:bg-muted flex w-full rounded-md border-2 px-4 py-2 text-base transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
          {errors.findings && (
            <p className="text-destructive text-sm">
              {errors.findings.message}
            </p>
          )}
        </div>

        {/* Methodology */}
        <div className="space-y-2">
          <Label htmlFor="methodology">Methodology</Label>
          <textarea
            id="methodology"
            {...register("methodology")}
            placeholder="Describe your research methodology, how you verified information, and what steps you took..."
            rows={4}
            disabled={isLoading}
            className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 hover:border-primary/50 placeholder:text-muted-foreground disabled:bg-muted flex w-full rounded-md border-2 px-4 py-2 text-base transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>

        {/* Limitations */}
        <div className="space-y-2">
          <Label htmlFor="limitations">Limitations</Label>
          <textarea
            id="limitations"
            {...register("limitations")}
            placeholder="Note any limitations, missing information, conflicting data, or areas requiring further research..."
            rows={4}
            disabled={isLoading}
            className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 hover:border-primary/50 placeholder:text-muted-foreground disabled:bg-muted flex w-full rounded-md border-2 px-4 py-2 text-base transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>

        {/* Related Sources */}
        <div className="space-y-2">
          <Label htmlFor="relatedSources">Related Sources</Label>
          <div className="flex gap-2">
            <Select
              value={relatedSourcesInput}
              onValueChange={setRelatedSourcesInput}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select related sources..." />
              </SelectTrigger>
              <SelectContent>
                {sourcesData?.items
                  ?.filter(
                    (source) =>
                      source.id !== selectedSourceId &&
                      !selectedRelatedSources.includes(source.id)
                  )
                  .map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddRelatedSource}
              disabled={!relatedSourcesInput || isLoading}
            >
              Add
            </Button>
          </div>
          {selectedRelatedSources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedRelatedSources.map((sourceId) => (
                <Badge key={sourceId} variant="secondary" className="gap-2">
                  {getSourceTitle(sourceId)}
                  <button
                    type="button"
                    onClick={() => handleRemoveRelatedSource(sourceId)}
                    className="hover:text-destructive ml-1"
                    disabled={isLoading}
                  >
                    <svg
                      className="h-3 w-3"
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
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Conclusion Reliability */}
        <div className="space-y-2">
          <Label htmlFor="conclusionReliability">Conclusion Reliability</Label>
          <Select
            value={watch("conclusionReliability") || ""}
            onValueChange={(value) =>
              setValue("conclusionReliability", value as Reliability)
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select reliability level..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CONCLUSIVE">Conclusive</SelectItem>
              <SelectItem value="PROBABLE">Probable</SelectItem>
              <SelectItem value="POSSIBLE">Possible</SelectItem>
              <SelectItem value="SPECULATIVE">Speculative</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-muted-foreground mt-1 text-xs">
            {watch("conclusionReliability") === "CONCLUSIVE" &&
              "Evidence is definitive and well-documented"}
            {watch("conclusionReliability") === "PROBABLE" &&
              "Strong evidence with minor gaps"}
            {watch("conclusionReliability") === "POSSIBLE" &&
              "Reasonable evidence but requires verification"}
            {watch("conclusionReliability") === "SPECULATIVE" &&
              "Hypothesis based on limited evidence"}
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-md border px-4 py-3">
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Saving...
              </>
            ) : isEditing ? (
              "Update Research Note"
            ) : (
              "Create Research Note"
            )}
          </Button>
        </div>
      </form>

      {/* Success overlay */}
      {showSuccess && (
        <div className="bg-card/95 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="h-8 w-8"
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
            </div>
            <p className="text-foreground font-display text-xl font-medium">
              {isEditing ? "Research note updated!" : "Research note created!"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
