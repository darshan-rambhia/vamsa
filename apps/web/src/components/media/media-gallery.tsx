"use client";

import { useTranslation } from "react-i18next";
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
  onView: (mediaId: string) => void;
  onSetPrimary?: (mediaId: string) => void;
  onEdit?: (mediaId: string) => void;
  onDelete?: (mediaId: string) => void;
}

export function MediaGallery({
  media,
  isLoading,
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

  if (media.length === 0) {
    return (
      <div className="py-12 text-center">
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
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
