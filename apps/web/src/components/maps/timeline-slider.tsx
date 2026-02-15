"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent } from "@vamsa/ui";

interface TimelineSliderProps {
  minYear: number;
  maxYear: number;
  onRangeChange: (startYear: number, endYear: number) => void;
  initialStartYear?: number;
  initialEndYear?: number;
}

export function TimelineSlider({
  minYear,
  maxYear,
  onRangeChange,
  initialStartYear,
  initialEndYear,
}: TimelineSliderProps) {
  const { t } = useTranslation(["common"]);
  const [startYear, setStartYear] = useState(initialStartYear || minYear);
  const [endYear, setEndYear] = useState(initialEndYear || maxYear);
  const [isPlaying, setIsPlaying] = useState(false);

  // Handle play animation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setStartYear((prev) => {
        const next = prev + 1;
        if (next >= endYear) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, endYear]);

  // Notify parent of changes
  useEffect(() => {
    onRangeChange(startYear, endYear);
  }, [startYear, endYear, onRangeChange]);

  const handleReset = () => {
    setStartYear(minYear);
    setEndYear(maxYear);
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <Card className="w-full">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t("timelineFilter")}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              className="h-8 w-8 p-0"
            >
              {isPlaying ? (
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
                    d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                  />
                </svg>
              ) : (
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
                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                  />
                </svg>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              {t("reset")}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2">
              <label
                htmlFor="start-year"
                className="text-muted-foreground text-xs"
              >
                {t("startYear")}
              </label>
              <span className="text-foreground text-sm font-semibold">
                {startYear}
              </span>
            </div>
            <input
              id="start-year"
              type="range"
              min={minYear}
              max={endYear}
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
              disabled={isPlaying}
            />
          </div>

          <div>
            <div className="flex items-center justify-between pb-2">
              <label
                htmlFor="end-year"
                className="text-muted-foreground text-xs"
              >
                {t("endYear")}
              </label>
              <span className="text-foreground text-sm font-semibold">
                {endYear}
              </span>
            </div>
            <input
              id="end-year"
              type="range"
              min={startYear}
              max={maxYear}
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
              disabled={isPlaying}
            />
          </div>
        </div>

        <div className="bg-secondary/50 rounded-md p-3">
          <p className="text-muted-foreground text-center text-xs">
            {t("showingEventsFrom")}{" "}
            <span className="text-foreground font-semibold">{startYear}</span>{" "}
            {t("to")}{" "}
            <span className="text-foreground font-semibold">{endYear}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
