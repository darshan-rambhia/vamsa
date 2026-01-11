"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui/primitives";
import {
  type SourceCreateInput,
  type SourceUpdateInput,
  type SourceType,
  type CitationFormat,
  type Confidence,
} from "@vamsa/schemas";
import { createSource, updateSource } from "~/server/sources";

interface SourceFormProps {
  sourceId?: string;
  initialData?: Partial<SourceUpdateInput>;
  onSuccess?: (sourceId: string) => void;
  onCancel?: () => void;
}

export function SourceForm({
  sourceId,
  initialData,
  onSuccess,
  onCancel,
}: SourceFormProps) {
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = Boolean(sourceId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SourceCreateInput>({
    defaultValues: {
      title: initialData?.title || "",
      author: initialData?.author || "",
      publicationDate: initialData?.publicationDate || "",
      description: initialData?.description || "",
      repository: initialData?.repository || "",
      notes: initialData?.notes || "",
      sourceType: initialData?.sourceType || undefined,
      citationFormat: initialData?.citationFormat || undefined,
      doi: initialData?.doi || "",
      url: initialData?.url || "",
      isbn: initialData?.isbn || "",
      callNumber: initialData?.callNumber || "",
      accessDate: initialData?.accessDate
        ? new Date(initialData.accessDate)
        : undefined,
      confidence: initialData?.confidence || undefined,
    },
  });

  const sourceType = watch("sourceType");

  const createMutation = useMutation({
    mutationFn: createSource,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.(data.id);
      }, 1500);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to create source");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateSource,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["source", sourceId] });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.(data.id);
      }, 1500);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to update source");
    },
  });

  const onSubmit = (data: SourceCreateInput) => {
    setErrorMessage(null);

    if (isEditing && sourceId) {
      updateMutation.mutate({
        data: {
          id: sourceId,
          ...data,
        } as SourceUpdateInput,
      });
    } else {
      createMutation.mutate({ data });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="relative">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            type="text"
            {...register("title")}
            placeholder="Source title..."
            disabled={isLoading}
          />
          {errors.title && (
            <p className="text-destructive text-sm">{errors.title.message}</p>
          )}
        </div>

        {/* Author */}
        <div className="space-y-2">
          <Label htmlFor="author">Author</Label>
          <Input
            id="author"
            type="text"
            {...register("author")}
            placeholder="Author name..."
            disabled={isLoading}
          />
          {errors.author && (
            <p className="text-destructive text-sm">{errors.author.message}</p>
          )}
        </div>

        {/* Source Type */}
        <div className="space-y-2">
          <Label htmlFor="sourceType">Source Type</Label>
          <Select
            value={sourceType || ""}
            onValueChange={(value) => setValue("sourceType", value as SourceType)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source type..." />
            </SelectTrigger>
            <SelectContent>
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

        {/* Publication Date */}
        <div className="space-y-2">
          <Label htmlFor="publicationDate">Publication Date</Label>
          <Input
            id="publicationDate"
            type="text"
            {...register("publicationDate")}
            placeholder="e.g., 1995, June 2010, 15 March 1892..."
            disabled={isLoading}
          />
          {errors.publicationDate && (
            <p className="text-destructive text-sm">
              {errors.publicationDate.message}
            </p>
          )}
        </div>

        {/* Conditional fields based on source type */}
        {sourceType === "BOOK" && (
          <div className="space-y-2">
            <Label htmlFor="isbn">ISBN</Label>
            <Input
              id="isbn"
              type="text"
              {...register("isbn")}
              placeholder="10 or 13 digit ISBN..."
              disabled={isLoading}
            />
            {errors.isbn && (
              <p className="text-destructive text-sm">{errors.isbn.message}</p>
            )}
          </div>
        )}

        {(sourceType === "ARTICLE" || sourceType === "WEBSITE") && (
          <>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="text"
                {...register("url")}
                placeholder="https://..."
                disabled={isLoading}
              />
              {errors.url && (
                <p className="text-destructive text-sm">{errors.url.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="doi">DOI</Label>
              <Input
                id="doi"
                type="text"
                {...register("doi")}
                placeholder="e.g., 10.1234/example"
                disabled={isLoading}
              />
              {errors.doi && (
                <p className="text-destructive text-sm">{errors.doi.message}</p>
              )}
            </div>
          </>
        )}

        {(sourceType === "ARCHIVE" || sourceType === "BOOK") && (
          <div className="space-y-2">
            <Label htmlFor="callNumber">Call Number</Label>
            <Input
              id="callNumber"
              type="text"
              {...register("callNumber")}
              placeholder="Library or archive call number..."
              disabled={isLoading}
            />
          </div>
        )}

        {/* Repository */}
        <div className="space-y-2">
          <Label htmlFor="repository">Repository</Label>
          <Input
            id="repository"
            type="text"
            {...register("repository")}
            placeholder="Where is this source located or housed..."
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            {...register("description")}
            placeholder="Describe the source content..."
            rows={4}
            disabled={isLoading}
            className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 hover:border-primary/50 placeholder:text-muted-foreground disabled:bg-muted flex w-full rounded-md border-2 px-4 py-2 text-base transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>

        {/* Citation Format */}
        <div className="space-y-2">
          <Label htmlFor="citationFormat">Citation Format</Label>
          <Select
            value={watch("citationFormat") || ""}
            onValueChange={(value) => setValue("citationFormat", value as CitationFormat)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select citation format..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MLA">MLA</SelectItem>
              <SelectItem value="APA">APA</SelectItem>
              <SelectItem value="CHICAGO">Chicago</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Confidence */}
        <div className="space-y-2">
          <Label htmlFor="confidence">Confidence Level</Label>
          <Select
            value={watch("confidence") || ""}
            onValueChange={(value) => setValue("confidence", value as Confidence)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select confidence level..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Access Date */}
        <div className="space-y-2">
          <Label htmlFor="accessDate">Access Date</Label>
          <Input
            id="accessDate"
            type="date"
            {...register("accessDate")}
            disabled={isLoading}
          />
        </div>

        {/* Research Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Research Notes</Label>
          <textarea
            id="notes"
            {...register("notes")}
            placeholder="Your research notes about this source..."
            rows={4}
            disabled={isLoading}
            className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 hover:border-primary/50 placeholder:text-muted-foreground disabled:bg-muted flex w-full rounded-md border-2 px-4 py-2 text-base transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
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
              "Update Source"
            ) : (
              "Create Source"
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
              {isEditing ? "Source updated!" : "Source created!"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
