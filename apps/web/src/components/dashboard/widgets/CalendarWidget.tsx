"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, cn } from "@vamsa/ui";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
// Note: drizzleDb and drizzleSchema are dynamically imported inside the server function
// to prevent server-only modules from leaking into the client bundle
import { z } from "zod";
import { BaseWidget } from "./BaseWidget";
import type { WidgetProps } from "./types";

/**
 * Calendar widget settings schema
 */
const calendarSettingsSchema = z.object({
  showBirthdays: z.boolean().default(true),
  showAnniversaries: z.boolean().default(true),
  showDeaths: z.boolean().default(false),
  monthsAhead: z.number().int().min(1).max(12).default(3),
});

type CalendarSettings = z.infer<typeof calendarSettingsSchema>;

/**
 * Upcoming event representation
 */
interface UpcomingEvent {
  id: string;
  personId: string;
  personName: string;
  type: "BIRTH" | "DEATH" | "MARRIAGE";
  originalDate: string; // YYYY-MM-DD
  upcomingDate: string; // YYYY-MM-DD (this year or next)
  yearsAgo?: number; // For birthdays/anniversaries
}

/**
 * Server function to fetch upcoming events (birthdays, anniversaries, death anniversaries)
 */
const getUpcomingEvents = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const schema = z.object({
      showBirthdays: z.boolean(),
      showAnniversaries: z.boolean(),
      showDeaths: z.boolean(),
      monthsAhead: z.number(),
    });
    return schema.parse(data);
  })
  .handler(async ({ data }) => {
    // Dynamic imports to keep server-only modules out of client bundle
    const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
    const { eq } = await import("drizzle-orm");

    const { showBirthdays, showAnniversaries, showDeaths, monthsAhead } = data;

    const now = new Date();
    const endDate = addMonths(now, monthsAhead);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const upcomingEvents: Array<UpcomingEvent> = [];

    // Fetch events with person data using join
    const eventsWithPersons = await drizzleDb
      .select({
        eventId: drizzleSchema.events.id,
        eventType: drizzleSchema.events.type,
        eventDate: drizzleSchema.events.date,
        personId: drizzleSchema.persons.id,
        firstName: drizzleSchema.persons.firstName,
        lastName: drizzleSchema.persons.lastName,
      })
      .from(drizzleSchema.events)
      .innerJoin(
        drizzleSchema.persons,
        eq(drizzleSchema.events.personId, drizzleSchema.persons.id)
      );

    for (const row of eventsWithPersons) {
      if (!row.eventDate) continue;

      const fullName = `${row.firstName} ${row.lastName}`.trim();
      const eventDate = new Date(row.eventDate);
      const eventMonth = eventDate.getUTCMonth() + 1;
      const eventDay = eventDate.getUTCDate();
      const eventYear = eventDate.getUTCFullYear();

      // Check if this event type should be included
      if (row.eventType === "BIRTH" && !showBirthdays) continue;
      if (row.eventType === "MARRIAGE" && !showAnniversaries) continue;
      if (row.eventType === "DEATH" && !showDeaths) continue;

      // Skip if not a relevant event type
      if (
        row.eventType !== "BIRTH" &&
        row.eventType !== "MARRIAGE" &&
        row.eventType !== "DEATH"
      ) {
        continue;
      }

      // Calculate the next occurrence of this event
      let upcomingYear = currentYear;

      // If the event date has passed this year, use next year
      if (
        eventMonth < currentMonth ||
        (eventMonth === currentMonth && eventDay < currentDay)
      ) {
        upcomingYear = currentYear + 1;
      }

      // Create the upcoming date
      const upcomingDate = new Date(upcomingYear, eventMonth - 1, eventDay);

      // Check if within the monthsAhead range
      if (upcomingDate <= endDate) {
        upcomingEvents.push({
          id: row.eventId,
          personId: row.personId,
          personName: fullName,
          type: row.eventType,
          originalDate: format(eventDate, "yyyy-MM-dd"),
          upcomingDate: format(upcomingDate, "yyyy-MM-dd"),
          yearsAgo: upcomingYear - eventYear,
        });
      }
    }

    // Sort by upcoming date
    upcomingEvents.sort(
      (a, b) =>
        new Date(a.upcomingDate).getTime() - new Date(b.upcomingDate).getTime()
    );

    return upcomingEvents;
  });

/**
 * Calendar Widget Component
 * Shows a mini monthly calendar view with event indicators and upcoming events list
 */
export function CalendarWidget({
  config,
  onConfigChange,
  onRemove,
  className,
}: WidgetProps) {
  const { t } = useTranslation(["dashboard", "common"]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);

  // Parse settings with defaults
  const settings: CalendarSettings = calendarSettingsSchema.parse(
    config.settings || {}
  );

  // Fetch upcoming events
  const {
    data: upcomingEvents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["calendar-widget", settings],
    queryFn: () => getUpcomingEvents({ data: settings }),
  });

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // Map events by date for quick lookup
  const eventsByDate = new Map<string, Array<UpcomingEvent>>();
  upcomingEvents.forEach((event) => {
    const dateKey = event.upcomingDate;
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey)!.push(event);
  });

  // Get next 5-10 upcoming events
  const nextEvents = upcomingEvents.slice(0, 10);

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const getEventDot = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const events = eventsByDate.get(dateKey);
    if (!events || events.length === 0) return null;

    // Show different colors for different event types
    const hasBirthday = events.some((e) => e.type === "BIRTH");
    const hasAnniversary = events.some((e) => e.type === "MARRIAGE");
    const hasDeath = events.some((e) => e.type === "DEATH");

    return (
      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
        {hasBirthday && (
          <div
            className="bg-primary h-1.5 w-1.5 rounded-full"
            aria-label="Birthday"
          />
        )}
        {hasAnniversary && (
          <div
            className="bg-accent h-1.5 w-1.5 rounded-full"
            aria-label="Anniversary"
          />
        )}
        {hasDeath && (
          <div
            className="bg-muted-foreground h-1.5 w-1.5 rounded-full"
            aria-label="Memorial"
          />
        )}
      </div>
    );
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case "BIRTH":
        return t("dashboard:birthday");
      case "MARRIAGE":
        return t("dashboard:anniversary");
      case "DEATH":
        return t("dashboard:memorial");
      default:
        return type;
    }
  };

  return (
    <BaseWidget
      config={config}
      isLoading={isLoading}
      error={error ?? undefined}
      onSettings={() => setShowSettings(!showSettings)}
      onRemove={onRemove}
      onRefresh={() => refetch()}
      className={className}
    >
      <div className="flex h-full flex-col gap-4 p-1">
        {/* Settings Panel */}
        {showSettings && (
          <div className="border-border rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium">
              {t("dashboard:calendarSettings")}
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showBirthdays}
                  onChange={(e) =>
                    onConfigChange({
                      settings: {
                        ...settings,
                        showBirthdays: e.target.checked,
                      },
                    })
                  }
                  className="border-border rounded"
                />
                <span className="text-sm">{t("dashboard:showBirthdays")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showAnniversaries}
                  onChange={(e) =>
                    onConfigChange({
                      settings: {
                        ...settings,
                        showAnniversaries: e.target.checked,
                      },
                    })
                  }
                  className="border-border rounded"
                />
                <span className="text-sm">
                  {t("dashboard:showAnniversaries")}
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.showDeaths}
                  onChange={(e) =>
                    onConfigChange({
                      settings: {
                        ...settings,
                        showDeaths: e.target.checked,
                      },
                    })
                  }
                  className="border-border rounded"
                />
                <span className="text-sm">
                  {t("dashboard:showMemorialDates")}
                </span>
              </label>
              <div className="mt-3">
                <label className="text-sm">
                  {t("dashboard:lookAheadMonths")}
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={settings.monthsAhead}
                    onChange={(e) =>
                      onConfigChange({
                        settings: {
                          ...settings,
                          monthsAhead: parseInt(e.target.value),
                        },
                      })
                    }
                    className="border-border ml-2 w-16 rounded border px-2 py-1"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Mini Calendar */}
        <div className="shrink-0 border-b pb-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="font-display text-lg font-medium">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousMonth}
                aria-label={t("dashboard:previousMonth")}
                className="hover:bg-primary/10 hover:text-primary h-7 w-7 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="hover:bg-primary/10 hover:text-primary h-7 rounded-full px-3 text-xs"
              >
                {t("dashboard:today")}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                aria-label={t("dashboard:nextMonth")}
                className="hover:bg-primary/10 hover:text-primary h-7 w-7 rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="text-muted-foreground text-center text-[10px] font-medium tracking-wider uppercase"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateKey) || [];

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "hover:bg-primary/5 relative aspect-square cursor-pointer rounded-full p-1 text-center text-sm transition-all",
                    isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground/30",
                    isTodayDate &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-semibold",
                    !isTodayDate &&
                      dayEvents.length > 0 &&
                      "text-primary font-medium"
                  )}
                  title={
                    dayEvents.length > 0
                      ? dayEvents
                          .map(
                            (e) =>
                              `${e.personName} - ${getEventTypeLabel(e.type)}`
                          )
                          .join(", ")
                      : undefined
                  }
                >
                  <span className="relative z-10 flex h-full w-full items-center justify-center">
                    {format(day, "d")}
                  </span>
                  {/* Dots below name */}
                  {!isTodayDate && getEventDot(day)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events List */}
        <div className="flex-1 overflow-auto px-1">
          <h4 className="font-display text-muted-foreground mb-3 text-sm font-medium tracking-wider uppercase">
            {t("dashboard:comingUp")}
          </h4>
          {nextEvents.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8 text-center">
              <CalendarIcon className="h-8 w-8 opacity-20" />
              <p className="text-sm">{t("dashboard:calendarNoEvents")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nextEvents.slice(0, 3).map((event) => {
                const eventDate = parseISO(event.upcomingDate);
                return (
                  <div
                    key={event.id}
                    className="group bg-secondary/5 hover:bg-secondary/10 hover:border-secondary/20 flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all"
                  >
                    <div className="bg-background border-border/50 flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border shadow-sm">
                      <span className="text-primary text-[10px] leading-none font-bold uppercase">
                        {format(eventDate, "MMM")}
                      </span>
                      <span className="font-display text-base leading-none font-medium">
                        {format(eventDate, "d")}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="group-hover:text-primary truncate text-sm font-medium transition-colors">
                        {event.personName}
                      </p>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3" />
                        <span>{format(eventDate, "h:mm a")}</span>
                        <span className="text-accent-foreground/50">•</span>
                        <span>{getEventTypeLabel(event.type)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BaseWidget>
  );
}
