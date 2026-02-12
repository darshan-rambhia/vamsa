"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Input, Label } from "@vamsa/ui";
import { createCalendarToken } from "~/server/calendar-tokens";

const getAppUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

interface CreateTokenFormProps {
  onSuccess: () => void;
}

type CalendarUrl = {
  label: string;
  description: string;
  url: string;
};

const rotationPolicies = [
  {
    value: "on_password_change",
    labelKey: "rotateOnPasswordChange",
    descKey: "rotateOnPasswordChangeDesc",
  },
  {
    value: "annual",
    labelKey: "rotateAnnually",
    descKey: "rotateAnnuallyDesc",
  },
  {
    value: "manual",
    labelKey: "manualRotationOnly",
    descKey: "manualRotationOnlyDesc",
  },
  {
    value: "never",
    labelKey: "neverRotate",
    descKey: "neverRotateDesc",
  },
];

export function CreateTokenForm({ onSuccess }: CreateTokenFormProps) {
  const { t } = useTranslation(["common"]);
  const [name, setName] = useState("");
  const [policy, setPolicy] = useState("annual");
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      createCalendarToken({
        data: {
          name: name.trim() || undefined,
          rotationPolicy: policy,
        },
      }),
    onSuccess: (data) => {
      setCreatedToken(data.token);
      setError(null);
      // Don't auto-close - let user copy URLs first
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to create token");
    },
  });

  const getCalendarUrls = (token: string): Array<CalendarUrl> => {
    const appUrl = getAppUrl();
    return [
      {
        label: t("birthdayCalendar"),
        description: t("subscribeToBirthdays"),
        url: `${appUrl}/api/v1/calendar/birthdays.ics?token=${token}`,
      },
      {
        label: t("anniversaryCalendar"),
        description: t("subscribeToAnniversaries"),
        url: `${appUrl}/api/v1/calendar/anniversaries.ics?token=${token}`,
      },
      {
        label: t("eventsCalendar"),
        description: t("subscribeToAllEvents"),
        url: `${appUrl}/api/v1/calendar/events.ics?token=${token}`,
      },
      {
        label: t("rssFeed"),
        description: t("subscribeToRss"),
        url: `${appUrl}/api/v1/calendar/rss.xml?token=${token}`,
      },
    ];
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  const handleDone = () => {
    onSuccess();
    setName("");
    setPolicy("annual");
    setCreatedToken(null);
    setCopiedUrl(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  };

  if (createdToken) {
    const calendarUrls = getCalendarUrls(createdToken);

    return (
      <div className="space-y-4">
        {/* Success Message */}
        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h4 className="font-display text-sm font-medium text-green-900 dark:text-green-100">
                {t("tokenCreatedSuccessfully")}
              </h4>
              <p className="mt-1 text-sm text-green-800 dark:text-green-200">
                {t("updateCalendarSubscriptions")}
              </p>
            </div>
          </div>
        </div>

        {/* Calendar URLs */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            {t("calendarSubscriptionUrls")}
          </h4>
          <div className="space-y-2">
            {calendarUrls.map((item) => (
              <div
                key={item.label}
                className="bg-muted/50 rounded-lg border p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{item.label}</span>
                    <p className="text-muted-foreground text-xs">
                      {item.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={copiedUrl === item.url ? "default" : "outline"}
                    onClick={() => copyToClipboard(item.url)}
                    data-testid={`copy-url-${item.label.toLowerCase()}`}
                  >
                    {copiedUrl === item.url ? (
                      <>
                        <svg
                          className="mr-1.5 h-3.5 w-3.5"
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
                        {t("copied")}
                      </>
                    ) : (
                      <>
                        <svg
                          className="mr-1.5 h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        {t("copyUrl")}
                      </>
                    )}
                  </Button>
                </div>
                <code className="text-muted-foreground block overflow-x-auto text-xs">
                  {item.url}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* Done Button */}
        <div className="flex justify-end pt-2">
          <Button type="button" onClick={handleDone} data-testid="token-done">
            {t("done")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
          data-testid="create-token-error"
        >
          {error}
        </div>
      )}

      {/* Token Name */}
      <div className="space-y-2">
        <Label htmlFor="token-name">{t("tokenNameOptional")}</Label>
        <Input
          id="token-name"
          type="text"
          placeholder={t("tokenNamePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={createMutation.isPending}
          data-testid="token-name-input"
        />
        <p className="text-muted-foreground text-xs">{t("giveTokenName")}</p>
      </div>

      {/* Rotation Policy */}
      <div className="space-y-3">
        <div className="text-sm font-medium">{t("rotationPolicy")}</div>
        <div className="space-y-2">
          {rotationPolicies.map((option) => (
            <label
              key={option.value}
              className={`border-border hover:border-primary flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${
                policy === option.value
                  ? "border-primary bg-primary/5"
                  : "bg-muted/30"
              }`}
            >
              <input
                type="radio"
                name="policy"
                value={option.value}
                checked={policy === option.value}
                onChange={(e) => setPolicy(e.target.value)}
                disabled={createMutation.isPending}
                className="text-primary mt-1 h-4 w-4"
                data-testid={`policy-${option.value}`}
              />
              <div className="flex-1">
                <div className="text-sm font-medium">{t(option.labelKey)}</div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {t(option.descKey)}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess()}
          disabled={createMutation.isPending}
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending}
          data-testid="create-token-submit"
        >
          {createMutation.isPending ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t("creating")}
            </>
          ) : (
            t("createToken")
          )}
        </Button>
      </div>
    </form>
  );
}
