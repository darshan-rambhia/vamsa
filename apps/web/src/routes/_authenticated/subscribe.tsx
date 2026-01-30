import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  Input,
  Label,
  PageHeader,
} from "@vamsa/ui";
import {
  deleteCalendarToken,
  generateCalendarToken,
  listCalendarTokens,
  revokeCalendarToken,
} from "~/server/calendar";
import { SubscriptionInstructions } from "~/components/calendar/subscription-instructions";

export const Route = createFileRoute("/_authenticated/subscribe")({
  component: SubscribeComponent,
});

function SubscribeComponent() {
  const [tokenName, setTokenName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const { data: tokens, refetch: refetchTokens } = useQuery({
    queryKey: ["calendar-tokens"],
    queryFn: () => listCalendarTokens(),
  });

  const generateMutation = useMutation({
    mutationFn: (params: { name?: string }) =>
      generateCalendarToken({
        data: { name: params.name || undefined, expiryDays: 365 },
      }),
    onSuccess: (data) => {
      setGeneratedToken(data.token);
      setTokenName("");
      refetchTokens();
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (token: string) => revokeCalendarToken({ data: { token } }),
    onSuccess: () => {
      refetchTokens();
      if (generatedToken) {
        setGeneratedToken(null);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (token: string) => deleteCalendarToken({ data: { token } }),
    onSuccess: () => {
      refetchTokens();
    },
  });

  const handleGenerateToken = () => {
    generateMutation.mutate({ name: tokenName.trim() || undefined });
  };

  const getCalendarUrl = (
    type: "birthdays" | "anniversaries" | "events",
    token?: string
  ) => {
    const baseUrl = `${appUrl}/api/v1/calendar/${type}.ics`;
    return token ? `${baseUrl}?token=${token}` : baseUrl;
  };

  const getRssUrl = (token?: string) => {
    const baseUrl = `${appUrl}/api/v1/calendar/rss.xml`;
    return token ? `${baseUrl}?token=${token}` : baseUrl;
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const activeTokens = tokens?.filter((t) => t.isActive) || [];
  const revokedTokens = tokens?.filter((t) => !t.isActive) || [];

  // Get the selected token value (either newly generated or selected from list)
  const selectedToken = selectedTokenId
    ? activeTokens.find((t) => t.id === selectedTokenId)
    : null;
  const activeTokenValue = generatedToken || selectedToken?.token || null;

  return (
    <Container className="space-y-8">
      <PageHeader
        title="Calendar Subscriptions"
        description="Subscribe to family calendars and RSS feeds in your favorite apps"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Token Management */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Access Token</CardTitle>
            <CardDescription>
              Create a secure token to access private calendar feeds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Token Name (Optional)</Label>
              <Input
                id="token-name"
                type="text"
                placeholder="e.g., iPhone Calendar, Work Mac"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="w-full"
              />
              <p className="text-muted-foreground text-xs">
                Give your token a name to identify it later
              </p>
            </div>

            <Button
              onClick={handleGenerateToken}
              disabled={generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending
                ? "Generating..."
                : "Generate New Token"}
            </Button>

            {generatedToken && (
              <div className="border-primary/20 bg-primary/5 rounded-lg border-2 p-4">
                <p className="text-primary mb-2 text-sm font-medium">
                  Token generated successfully
                </p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={generatedToken}
                    onClick={(e) => e.currentTarget.select()}
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(generatedToken)}
                  >
                    {copiedUrl === generatedToken ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Save this token securely. You will not be able to view it
                  again.
                </p>
              </div>
            )}

            {/* Active Tokens List */}
            {activeTokens.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Active Tokens</p>
                <div className="space-y-2">
                  {activeTokens.map((token) => (
                    <div
                      key={token.id}
                      className="border-border flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {token.name || "Calendar Token"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Expires:{" "}
                          {new Date(token.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeMutation.mutate(token.id)}
                        disabled={revokeMutation.isPending}
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revoked Tokens List */}
            {revokedTokens.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">
                  Revoked Tokens
                </p>
                <div className="space-y-2">
                  {revokedTokens.map((token) => (
                    <div
                      key={token.id}
                      className="border-border bg-muted/30 flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">
                          {token.name || "Calendar Token"}
                        </p>
                        <p className="text-muted-foreground text-xs">Revoked</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(token.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Link to advanced token management */}
            <div className="border-border border-t pt-4">
              <Link
                to="/settings/calendar-tokens"
                className="text-primary hover:text-primary/80 text-sm underline-offset-4 hover:underline"
              >
                Manage Tokens
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Calendar URLs */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar URLs</CardTitle>
            <CardDescription>
              Copy these URLs to subscribe in your calendar app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Token Selector */}
            {(activeTokens.length > 0 || generatedToken) && (
              <div className="space-y-2">
                <Label htmlFor="token-select">Select Token</Label>
                <select
                  id="token-select"
                  value={generatedToken ? "__new__" : selectedTokenId || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__new__") {
                      // Keep using the generated token
                      setSelectedTokenId(null);
                    } else if (value === "") {
                      setGeneratedToken(null);
                      setSelectedTokenId(null);
                    } else {
                      setGeneratedToken(null);
                      setSelectedTokenId(value);
                    }
                  }}
                  className="border-input bg-background hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20 flex h-11 w-full rounded-md border-2 px-4 py-2 text-base transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                >
                  <option value="">Select a token...</option>
                  {generatedToken && (
                    <option value="__new__">
                      Newly Generated Token (copy this one!)
                    </option>
                  )}
                  {activeTokens.map((token) => (
                    <option key={token.id} value={token.id}>
                      {token.name || "Calendar Token"} - Expires{" "}
                      {new Date(token.expiresAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                {generatedToken && (
                  <p className="text-primary text-xs font-medium">
                    New token generated! Copy the URLs below to use it.
                  </p>
                )}
              </div>
            )}

            {!activeTokenValue && (
              <div className="rounded-lg border-2 border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>No token selected.</strong> Generate a new token or
                  select an existing one to get authenticated calendar URLs.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="birthdays-url">
                Birthday Calendar
                {activeTokenValue && (
                  <Badge variant="secondary" className="ml-2">
                    Authenticated
                  </Badge>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="birthdays-url"
                  readOnly
                  value={
                    activeTokenValue
                      ? getCalendarUrl("birthdays", activeTokenValue)
                      : "Generate or select a token to get URL"
                  }
                  onClick={(e) => activeTokenValue && e.currentTarget.select()}
                  className="text-xs"
                  disabled={!activeTokenValue}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      getCalendarUrl("birthdays", activeTokenValue || undefined)
                    )
                  }
                  disabled={!activeTokenValue}
                >
                  {copiedUrl ===
                  getCalendarUrl("birthdays", activeTokenValue || undefined)
                    ? "Copied!"
                    : "Copy"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anniversaries-url">
                Anniversary Calendar
                {activeTokenValue && (
                  <Badge variant="secondary" className="ml-2">
                    Authenticated
                  </Badge>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="anniversaries-url"
                  readOnly
                  value={
                    activeTokenValue
                      ? getCalendarUrl("anniversaries", activeTokenValue)
                      : "Generate or select a token to get URL"
                  }
                  onClick={(e) => activeTokenValue && e.currentTarget.select()}
                  className="text-xs"
                  disabled={!activeTokenValue}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      getCalendarUrl(
                        "anniversaries",
                        activeTokenValue || undefined
                      )
                    )
                  }
                  disabled={!activeTokenValue}
                >
                  {copiedUrl ===
                  getCalendarUrl("anniversaries", activeTokenValue || undefined)
                    ? "Copied!"
                    : "Copy"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="events-url">
                Events Calendar
                {activeTokenValue && (
                  <Badge variant="secondary" className="ml-2">
                    Authenticated
                  </Badge>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="events-url"
                  readOnly
                  value={
                    activeTokenValue
                      ? getCalendarUrl("events", activeTokenValue)
                      : "Generate or select a token to get URL"
                  }
                  onClick={(e) => activeTokenValue && e.currentTarget.select()}
                  className="text-xs"
                  disabled={!activeTokenValue}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      getCalendarUrl("events", activeTokenValue || undefined)
                    )
                  }
                  disabled={!activeTokenValue}
                >
                  {copiedUrl ===
                  getCalendarUrl("events", activeTokenValue || undefined)
                    ? "Copied!"
                    : "Copy"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rss-url">
                RSS Feed
                {activeTokenValue && (
                  <Badge variant="secondary" className="ml-2">
                    Authenticated
                  </Badge>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="rss-url"
                  readOnly
                  value={
                    activeTokenValue
                      ? getRssUrl(activeTokenValue)
                      : "Generate or select a token to get URL"
                  }
                  onClick={(e) => activeTokenValue && e.currentTarget.select()}
                  className="text-xs"
                  disabled={!activeTokenValue}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    copyToClipboard(getRssUrl(activeTokenValue || undefined))
                  }
                  disabled={!activeTokenValue}
                >
                  {copiedUrl === getRssUrl(activeTokenValue || undefined)
                    ? "Copied!"
                    : "Copy"}
                </Button>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-muted-foreground text-xs">
                {activeTokenValue ? (
                  <>
                    <strong>Note:</strong> URLs above include your token. Copy
                    them to subscribe in your calendar app.
                  </>
                ) : (
                  <>
                    <strong>Note:</strong> Generate a new token or select an
                    existing one to get authenticated calendar URLs.
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Instructions */}
      <SubscriptionInstructions />
    </Container>
  );
}
