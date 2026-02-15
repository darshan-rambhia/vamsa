"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Button,
  FormField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui/primitives";
import type {
  CitationFormat,
  Confidence,
  SourceCreateInput,
  SourceType,
  SourceUpdateInput,
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
  const { t } = useTranslation(["people", "common"]);
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
        <FormField
          label={t("people:mediaTitle")}
          error={errors.title?.message}
          required
        >
          <Input
            type="text"
            {...register("title")}
            placeholder={t("people:sourceTitle")}
            disabled={isLoading}
          />
        </FormField>

        {/* Author */}
        <div className="space-y-2">
          <Label htmlFor="author">{t("people:author")}</Label>
          <Input
            id="author"
            type="text"
            {...register("author")}
            placeholder={t("people:authorName")}
            disabled={isLoading}
          />
          {errors.author && (
            <p className="text-destructive text-sm">{errors.author.message}</p>
          )}
        </div>

        {/* Source Type */}
        <div className="space-y-2">
          <Label htmlFor="sourceType">{t("people:sourceType")}</Label>
          <Select
            value={sourceType || ""}
            onValueChange={(value) =>
              setValue("sourceType", value as SourceType)
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("people:selectSourceType")} />
            </SelectTrigger>
            <SelectContent>
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

        {/* Publication Date */}
        <div className="space-y-2">
          <Label htmlFor="publicationDate">{t("people:publicationDate")}</Label>
          <Input
            id="publicationDate"
            type="text"
            {...register("publicationDate")}
            placeholder={t("people:publicationDatePlaceholder")}
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
            <Label htmlFor="isbn">{t("people:isbn")}</Label>
            <Input
              id="isbn"
              type="text"
              {...register("isbn")}
              placeholder={t("people:isbnPlaceholder")}
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
              <Label htmlFor="url">{t("people:url")}</Label>
              <Input
                id="url"
                type="text"
                {...register("url")}
                placeholder={t("people:urlPlaceholder")}
                disabled={isLoading}
              />
              {errors.url && (
                <p className="text-destructive text-sm">{errors.url.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="doi">{t("people:doi")}</Label>
              <Input
                id="doi"
                type="text"
                {...register("doi")}
                placeholder={t("people:doiPlaceholder")}
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
            <Label htmlFor="callNumber">{t("people:callNumber")}</Label>
            <Input
              id="callNumber"
              type="text"
              {...register("callNumber")}
              placeholder={t("people:callNumberPlaceholder")}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Repository */}
        <div className="space-y-2">
          <Label htmlFor="repository">{t("people:repository")}</Label>
          <Input
            id="repository"
            type="text"
            {...register("repository")}
            placeholder={t("people:repositoryPlaceholder")}
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">{t("people:description")}</Label>
          <textarea
            id="description"
            {...register("description")}
            placeholder={t("people:describeSourceContent")}
            rows={4}
            disabled={isLoading}
            className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 hover:border-primary/50 placeholder:text-muted-foreground disabled:bg-muted flex w-full rounded-md border-2 px-4 py-2 text-base transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>

        {/* Citation Format */}
        <div className="space-y-2">
          <Label htmlFor="citationFormat">{t("people:citationFormat")}</Label>
          <Select
            value={watch("citationFormat") || ""}
            onValueChange={(value) =>
              setValue("citationFormat", value as CitationFormat)
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("people:selectCitationFormat")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MLA">{t("people:mla")}</SelectItem>
              <SelectItem value="APA">{t("people:apa")}</SelectItem>
              <SelectItem value="CHICAGO">{t("people:chicago")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Confidence */}
        <div className="space-y-2">
          <Label htmlFor="confidence">{t("people:confidenceLevel")}</Label>
          <Select
            value={watch("confidence") || ""}
            onValueChange={(value) =>
              setValue("confidence", value as Confidence)
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("people:selectCitationFormat")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HIGH">{t("people:high")}</SelectItem>
              <SelectItem value="MEDIUM">{t("people:medium")}</SelectItem>
              <SelectItem value="LOW">{t("people:low")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Access Date */}
        <div className="space-y-2">
          <Label htmlFor="accessDate">{t("people:accessDate")}</Label>
          <Input
            id="accessDate"
            type="date"
            {...register("accessDate")}
            disabled={isLoading}
          />
        </div>

        {/* Research Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">{t("people:researchNote")}</Label>
          <textarea
            id="notes"
            {...register("notes")}
            placeholder={t("people:yourResearchNotes")}
            rows={4}
            disabled={isLoading}
            className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 hover:border-primary/50 placeholder:text-muted-foreground disabled:bg-muted flex w-full rounded-md border-2 px-4 py-2 text-base transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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
              {t("common:cancel")}
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
                {t("common:saving")}
              </>
            ) : isEditing ? (
              t("people:updateSource")
            ) : (
              t("people:createSource")
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
              {isEditing
                ? t("people:sourceUpdated")
                : t("people:sourceCreated")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
