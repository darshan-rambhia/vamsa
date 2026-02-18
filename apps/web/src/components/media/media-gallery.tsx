"use client";

import { useTranslation } from "react-i18next";
import { ErrorCard } from "../error";
import { ImagePlaceholder } from "../ui/image-placeholder";
import { MediaCard } from "./media-card";

interface MediaItem {
  id: string;
  mediaId: string;
  title: string | null;
  thumbnailPath: string | null;
  filePath: string;
  isPrimary: boolean;
  displayOrder: number | null;
  webpPath?: string | null;
  thumb400Path?: string | null;
  thumb800Path?: string | null;
  thumb1200Path?: string | null;
}

interface MediaGalleryProps {
  media: Array<MediaItem>;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onView: (mediaId: string) => void;
  onSetPrimary?: (mediaId: string) => void;
  onEdit?: (mediaId: string) => void;
  onDelete?: (mediaId: string) => void;
}

export function MediaGallery({
  media,
  isLoading,
  isError,
  onRetry,
  onView,
  onSetPrimary,
  onEdit,
  onDelete,
}: MediaGalleryProps) {
  const { t } = useTranslation(["people", "common"]);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="flex animate-pulse flex-col items-center gap-4">
          <div className="bg-muted h-12 w-12 rounded-full" />
          <div className="bg-muted h-4 w-32 rounded" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorCard
        variant="compact"
        title={t("people:mediaLoadErrorTitle")}
        message={t("people:mediaLoadError")}
        onRetry={onRetry}
      />
    );
  }

  if (media.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="text-muted-foreground/50 mb-4">
          <ImagePlaceholder variant="landscape" className="mx-auto h-16 w-16" />
        </div>
        <h3 className="font-display text-foreground mb-2 text-xl">
          {t("people:noPhotos")}
        </h3>
        <p className="text-muted-foreground">
          {t("people:uploadPhotosMessage")}
        </p>
      </div>
    );
  }

  // Sort media by display order (primary first, then by order, then by creation)
  const sortedMedia = [...media].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    if (a.displayOrder !== null && b.displayOrder !== null) {
      return a.displayOrder - b.displayOrder;
    }
    return 0;
  });

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {sortedMedia.map((item) => (
        <MediaCard
          key={item.id}
          media={item}
          onView={() => onView(item.mediaId)}
          onSetPrimary={
            onSetPrimary && !item.isPrimary
              ? () => onSetPrimary(item.mediaId)
              : undefined
          }
          onEdit={onEdit ? () => onEdit(item.mediaId) : undefined}
          onDelete={onDelete ? () => onDelete(item.mediaId) : undefined}
        />
      ))}
    </div>
  );
}
