import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  PageHeader,
} from "@vamsa/ui";
import { validateSession } from "~/server/auth.functions";
import {
  deleteCalendarToken,
  getCalendarTokens,
  revokeCalendarToken,
  rotateCalendarToken,
  updateTokenName,
} from "~/server/calendar-tokens";
import { formatDateShort, formatRelativeTime } from "~/lib/format";
import { CreateTokenForm } from "~/components/calendar/create-token-form";

export const Route = createFileRoute(
  "/_authenticated/settings/calendar-tokens"
)({
  beforeLoad: async () => {
    const result = await validateSession();
    if (!result.valid) {
      throw new Error("Not authenticated");
    }
    return { user: result.user };
  },
  component: CalendarTokensPage,
});

type CalendarToken = {
  id: string;
  token: string;
  name: string | null;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date | null;
  rotationPolicy: string;
};

const getAppUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

type CalendarUrl = {
  label: string;
  description: string;
  url: string;
};

const getCalendarUrls = (
  token: string,
  t: (key: string) => string
): Array<CalendarUrl> => {
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

function CalendarTokensPage() {
  const { t } = useTranslation(["common"]);
  const queryClient = useQueryClient();
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [revokeDialogToken, setRevokeDialogToken] =
    useState<CalendarToken | null>(null);
  const [deleteDialogToken, setDeleteDialogToken] =
    useState<CalendarToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotatedToken, setRotatedToken] = useState<CalendarToken | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const { data: tokens, isLoading } = useQuery({
    queryKey: ["calendar-tokens"],
    queryFn: () => getCalendarTokens(),
  });

  const rotateMutation = useMutation({
    mutationFn: (tokenId: string) => rotateCalendarToken({ data: { tokenId } }),
    onSuccess: (newToken) => {
      queryClient.invalidateQueries({ queryKey: ["calendar-tokens"] });
      setError(null);
      // Show the updated URLs dialog with the new token
      setRotatedToken(newToken as CalendarToken);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to rotate token");
    },
  });

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

  const revokeMutation = useMutation({
    mutationFn: (tokenId: string) => revokeCalendarToken({ data: { tokenId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-tokens"] });
      setRevokeDialogToken(null);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to revoke token");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tokenId: string) => deleteCalendarToken({ data: { tokenId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-tokens"] });
      setDeleteDialogToken(null);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to delete token");
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: ({ tokenId, name }: { tokenId: string; name: string }) =>
      updateTokenName({ data: { tokenId, name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-tokens"] });
      setEditingToken(null);
      setError(null);
    },
    onError: (err) => {
      setError(
        err instanceof Error ? err.message : "Failed to update token name"
      );
    },
  });

  const handleNameEdit = (tokenId: string, currentName: string | null) => {
    setEditingToken(tokenId);
    setNewName(currentName || "");
  };

  const handleNameSave = (tokenId: string) => {
    if (newName.trim()) {
      updateNameMutation.mutate({ tokenId, name: newName.trim() });
    } else {
      setEditingToken(null);
    }
  };

  const handleRevoke = (token: CalendarToken) => {
    setRevokeDialogToken(token);
  };

  const confirmRevoke = () => {
    if (revokeDialogToken) {
      revokeMutation.mutate(revokeDialogToken.id);
    }
  };

  const handleDelete = (token: CalendarToken) => {
    setDeleteDialogToken(token);
  };

  const confirmDelete = () => {
    if (deleteDialogToken) {
      deleteMutation.mutate(deleteDialogToken.id);
    }
  };

  const formatPolicy = (policy: string): string => {
    const labels: Record<string, string> = {
      on_password_change: t("rotateOnPasswordChange"),
      annual: t("rotateAnnually"),
      manual: t("manualRotationOnly"),
      never: t("neverRotate"),
    };
    return labels[policy] || policy;
  };

  const isTokenActive = (token: CalendarToken): boolean => {
    return token.isActive && new Date(token.expiresAt) > new Date();
  };

  return (
    <Container>
      <PageHeader
        title={t("calendarAccessTokens")}
        description={t("manageCalendarTokens")}
      />

      <div className="max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("yourTokens")}</CardTitle>
                <CardDescription>{t("createAndManageTokens")}</CardDescription>
              </div>
              <Dialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
              >
                <DialogTrigger asChild>
                  <Button>{t("createNewToken")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("createCalendarToken")}</DialogTitle>
                  </DialogHeader>
                  <CreateTokenForm
                    onSuccess={() => {
                      setShowCreateDialog(false);
                      queryClient.invalidateQueries({
                        queryKey: ["calendar-tokens"],
                      });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div
                className="bg-destructive/10 text-destructive mb-4 rounded-md p-3 text-sm"
                data-testid="tokens-error"
              >
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <svg
                  className="text-primary h-8 w-8 animate-spin"
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
              </div>
            ) : !tokens || tokens.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center">
                <p className="mb-4">{t("noCalendarTokens")}</p>
                <p className="text-sm">{t("createTokenToSubscribe")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-border border-b text-left">
                      <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                        {t("name")}
                      </th>
                      <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                        {t("created")}
                      </th>
                      <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                        {t("lastUsed")}
                      </th>
                      <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                        {t("expires")}
                      </th>
                      <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                        {t("policy")}
                      </th>
                      <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                        {t("status")}
                      </th>
                      <th className="text-muted-foreground pb-3 text-sm font-medium">
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token) => (
                      <tr
                        key={token.id}
                        className="border-border border-b last:border-0"
                        data-testid={`token-row-${token.id}`}
                      >
                        <td className="py-3 pr-4">
                          {editingToken === token.id ? (
                            <Input
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onBlur={() => handleNameSave(token.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleNameSave(token.id);
                                } else if (e.key === "Escape") {
                                  setEditingToken(null);
                                }
                              }}
                              placeholder={t("tokenNameInputPlaceholder")}
                              className="max-w-xs"
                              data-testid={`token-name-input-${token.id}`}
                            />
                          ) : (
                            <button
                              onClick={() =>
                                handleNameEdit(token.id, token.name)
                              }
                              className="hover:text-primary text-left transition-colors"
                              data-testid={`token-name-${token.id}`}
                            >
                              {token.name || (
                                <em className="text-muted-foreground">
                                  {t("unnamedToken")}
                                </em>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="text-muted-foreground py-3 pr-4 text-sm">
                          {formatDateShort(token.createdAt)}
                        </td>
                        <td className="text-muted-foreground py-3 pr-4 text-sm">
                          {token.lastUsedAt ? (
                            formatRelativeTime(
                              new Date(token.lastUsedAt).getTime()
                            )
                          ) : (
                            <span className="text-muted-foreground/60">
                              {t("never")}
                            </span>
                          )}
                        </td>
                        <td className="text-muted-foreground py-3 pr-4 text-sm">
                          {formatDateShort(token.expiresAt)}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className="text-xs">
                            {formatPolicy(token.rotationPolicy)}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {isTokenActive(token) ? (
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            >
                              {t("active")}
                            </Badge>
                          ) : !token.isActive ? (
                            <Badge variant="destructive">{t("revoked")}</Badge>
                          ) : (
                            <Badge variant="outline">{t("expired")}</Badge>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            {isTokenActive(token) ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    rotateMutation.mutate(token.id)
                                  }
                                  disabled={rotateMutation.isPending}
                                  data-testid={`rotate-token-${token.id}`}
                                >
                                  Rotate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRevoke(token)}
                                  disabled={revokeMutation.isPending}
                                  data-testid={`revoke-token-${token.id}`}
                                >
                                  Revoke
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(token)}
                                disabled={deleteMutation.isPending}
                                data-testid={`delete-token-${token.id}`}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              {t("aboutCalendarTokens")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>{t("calendarTokensAllowSubscribe")}</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>{t("rotationPoliciesHelp")}</li>
              <li>{t("whenTokenRotated")}</li>
              <li>{t("revokingTokenDisables")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!revokeDialogToken}
        onOpenChange={(open) => {
          if (!open) setRevokeDialogToken(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeCalendarToken")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmRevokeToken")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmRevoke}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? t("revoking") : t("revokeToken")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteDialogToken}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogToken(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCalendarToken")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteToken")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? t("deleting")
                : t("deletePermanently")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Token Rotated - Updated URLs Dialog */}
      <Dialog
        open={!!rotatedToken}
        onOpenChange={(open) => {
          if (!open) {
            setRotatedToken(null);
            setCopiedUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Token Rotated Successfully</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Success Message */}
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <div className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
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
                    {rotatedToken?.name || "Token"} Rotated
                  </h4>
                  <p className="mt-1 text-sm text-green-800 dark:text-green-200">
                    Your old token will remain valid for 30 days. Update your
                    calendar subscriptions with the new URLs below.
                  </p>
                </div>
              </div>
            </div>

            {/* Calendar URLs */}
            {rotatedToken && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">
                  {t("updatedCalendarUrls")}
                </h4>
                <div className="space-y-2">
                  {getCalendarUrls(rotatedToken.token, t).map((item) => (
                    <div
                      key={item.label}
                      className="bg-muted/50 rounded-lg border p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                          <p className="text-muted-foreground text-xs">
                            {item.description}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            copiedUrl === item.url ? "default" : "outline"
                          }
                          onClick={() => copyToClipboard(item.url)}
                          data-testid={`copy-rotated-url-${item.label.toLowerCase()}`}
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
            )}

            {/* Done Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => {
                  setRotatedToken(null);
                  setCopiedUrl(null);
                }}
                data-testid="rotated-token-done"
              >
                {t("done")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
