"use client";

import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@vamsa/ui";
import type { MapMarker } from "./interactive-map";

interface MapPopupProps {
  marker: MapMarker;
  position: { x: number; y: number };
  onClose: () => void;
}

export function MapPopup({ marker, position, onClose }: MapPopupProps) {
  const { t } = useTranslation(["common"]);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Close popup on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="bg-background border-border fixed z-50 w-80 rounded-lg border shadow-lg"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 10}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{marker.name}</CardTitle>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground rounded-sm p-1 transition-colors"
              aria-label={t("close")}
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2">
            <Badge variant="secondary" className="text-xs">
              {marker.placeType}
            </Badge>
            {marker.eventTypes.map((type) => (
              <Badge key={type} variant="outline" className="text-xs">
                {formatEventType(type)}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {marker.description && (
            <p className="text-muted-foreground text-sm">
              {marker.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 border-t pt-3">
            <div>
              <p className="text-muted-foreground text-xs">{t("people")}</p>
              <p className="text-foreground text-lg font-semibold">
                {marker.personCount}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{t("events")}</p>
              <p className="text-foreground text-lg font-semibold">
                {marker.eventCount}
              </p>
            </div>
          </div>

          {(marker.timeRange.earliest || marker.timeRange.latest) && (
            <div className="border-t pt-3">
              <p className="text-muted-foreground text-xs">{t("timeRange")}</p>
              <p className="text-foreground text-sm font-medium">
                {marker.timeRange.earliest || "?"} -{" "}
                {marker.timeRange.latest || t("present")}
              </p>
            </div>
          )}

          <div className="border-t pt-3">
            <Link
              to="/people"
              search={{ place: marker.id }}
              className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm font-medium transition-colors"
            >
              {t("viewPeopleAtThisLocation")}
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
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatEventType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
