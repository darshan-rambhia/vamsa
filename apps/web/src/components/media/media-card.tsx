"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@vamsa/ui/primitives";
import { ImagePlaceholder } from "../ui/image-placeholder";
import { ResponsiveImage } from "../ui/responsive-image";

interface MediaCardProps {
  media: {
    id: string;
    mediaId: string;
    title: string | null;
    thumbnailPath: string | null;
    filePath: string;
    isPrimary: boolean;
    webpPath?: string | null;
    thumb400Path?: string | null;
    thumb800Path?: string | null;
    thumb1200Path?: string | null;
  };
  onView: () => void;
  onSetPrimary?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MediaCard({
  media,
  onView,
  onSetPrimary,
  onEdit,
  onDelete,
}: MediaCardProps) {
  const { t } = useTranslation(["people", "common"]);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="border-border bg-card hover:border-primary/30 group relative aspect-square overflow-hidden rounded-lg border-2 shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Image */}
      <button
        type="button"
        className="bg-muted h-full w-full cursor-pointer overflow-hidden"
        onClick={onView}
        aria-label={`${t("people:viewPhoto")} ${media.title || t("people:photo")}`}
      >
        {media.thumbnailPath || media.filePath ? (
          <ResponsiveImage
            mediaId={media.mediaId}
            alt={media.title || t("people:photo")}
            webpPath={media.webpPath}
            thumb400Path={media.thumb400Path}
            thumb800Path={media.thumb800Path}
            thumb1200Path={media.thumb1200Path}
            filePath={media.thumbnailPath || media.filePath}
            sizes="(max-width: 640px) 200px, (max-width: 1024px) 300px, 400px"
            className="transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="text-muted-foreground/50 flex h-full w-full items-center justify-center">
            <ImagePlaceholder variant="landscape" className="h-16 w-16" />
          </div>
        )}
      </button>

      {/* Title overlay on hover */}
      {media.title && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="line-clamp-2 text-sm font-medium text-white">
            {media.title}
          </p>
        </div>
      )}

      {/* Primary badge */}
      {media.isPrimary && (
        <div className="absolute top-2 left-2">
          <Badge className="bg-primary/90 text-primary-foreground border-0">
            {t("people:primary")}
          </Badge>
        </div>
      )}

      {/* Menu button */}
      {(onSetPrimary || onEdit || onDelete) && (
        <div className="absolute top-2 right-2">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 hover:bg-black/70"
            >
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
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" ||
                      e.key === " " ||
                      e.key === "Escape"
                    ) {
                      setShowMenu(false);
                    }
                  }}
                  aria-label={t("people:closeModal")}
                />
                <div className="border-border bg-card absolute top-10 right-0 z-20 min-w-40 rounded-lg border-2 shadow-lg">
                  {onSetPrimary && !media.isPrimary && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onSetPrimary();
                      }}
                      className="text-foreground hover:bg-accent flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors"
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
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                      {t("people:setPrimary")}
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onEdit();
                      }}
                      className="text-foreground hover:bg-accent flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors"
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
                      {t("people:editDetails")}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onDelete();
                      }}
                      className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors"
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
                      {t("common:delete")}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
