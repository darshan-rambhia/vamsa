import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  generateCalendarToken,
  listCalendarTokens,
  revokeCalendarToken,
} from "~/server/calendar";
import {
  Container,
  PageHeader,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
} from "@vamsa/ui";
import { SubscriptionInstructions } from "~/components/calendar/subscription-instructions";

export const Route = createFileRoute("/_authenticated/subscribe")({
  component: SubscribeComponent,
});

function SubscribeComponent() {
  const [selectedType, setSelectedType] = useState<
    "birthdays" | "anniversaries" | "events" | "all"
  >("all");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const { data: tokens, refetch: refetchTokens } = useQuery({
    queryKey: ["calendar-tokens"],
    queryFn: () => listCalendarTokens(),
  });

  const generateMutation = useMutation({
    mutationFn: (type: "birthdays" | "anniversaries" | "events" | "all") =>
      generateCalendarToken({ data: { type, expiryDays: 365 } }),
    onSuccess: (data) => {
      setGeneratedToken(data.token);
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

  const handleGenerateToken = () => {
    generateMutation.mutate(selectedType);
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
              <Label htmlFor="calendar-type">Calendar Type</Label>
              <select
                id="calendar-type"
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(
                    e.target.value as
                      | "birthdays"
                      | "anniversaries"
                      | "events"
                      | "all"
                  )
                }
                className="border-input bg-background hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20 flex h-11 w-full rounded-md border-2 px-4 py-2 text-base transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="all">All Calendars</option>
                <option value="birthdays">Birthdays Only</option>
                <option value="anniversaries">Anniversaries Only</option>
                <option value="events">Events Only</option>
              </select>
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
                        <p className="text-sm font-medium capitalize">
                          {token.type}
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
            <div className="space-y-2">
              <Label htmlFor="birthdays-url">
                Birthday Calendar
                <Badge variant="secondary" className="ml-2">
                  Public
                </Badge>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="birthdays-url"
                  readOnly
                  value={getCalendarUrl("birthdays")}
                  onClick={(e) => e.currentTarget.select()}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(getCalendarUrl("birthdays"))}
                >
                  {copiedUrl === getCalendarUrl("birthdays")
                    ? "Copied!"
                    : "Copy"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anniversaries-url">
                Anniversary Calendar
                <Badge variant="secondary" className="ml-2">
                  Public
                </Badge>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="anniversaries-url"
                  readOnly
                  value={getCalendarUrl("anniversaries")}
                  onClick={(e) => e.currentTarget.select()}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  onClick={() =>
                    copyToClipboard(getCalendarUrl("anniversaries"))
                  }
                >
                  {copiedUrl === getCalendarUrl("anniversaries")
                    ? "Copied!"
                    : "Copy"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="events-url">
                Events Calendar
                <Badge variant="secondary" className="ml-2">
                  Public
                </Badge>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="events-url"
                  readOnly
                  value={getCalendarUrl("events")}
                  onClick={(e) => e.currentTarget.select()}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(getCalendarUrl("events"))}
                >
                  {copiedUrl === getCalendarUrl("events") ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rss-url">
                RSS Feed
                <Badge variant="secondary" className="ml-2">
                  Public
                </Badge>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="rss-url"
                  readOnly
                  value={getRssUrl()}
                  onClick={(e) => e.currentTarget.select()}
                  className="text-xs"
                />
                <Button size="sm" onClick={() => copyToClipboard(getRssUrl())}>
                  {copiedUrl === getRssUrl() ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-muted-foreground text-xs">
                <strong>Note:</strong> To use private calendars with token
                authentication, append <code>?token=YOUR_TOKEN</code> to any
                calendar URL above.
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
