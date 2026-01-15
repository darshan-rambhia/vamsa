import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  PageHeader,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@vamsa/ui";
import { getCurrentUser } from "~/server/auth";
import {
  getAllCalendarTokens,
  rotateCalendarToken,
  revokeCalendarToken,
} from "~/server/calendar-tokens";
import { formatDateShort, formatRelativeTime } from "~/lib/format";
import { AdminRouteError } from "~/components/admin/route-error";

export const Route = createFileRoute("/_authenticated/admin/tokens")({
  loader: async () => {
    const currentUser = await getCurrentUser();
    return { currentUser };
  },
  component: AdminTokensPage,
  errorComponent: AdminRouteError,
});

type CalendarTokenWithUser = {
  id: string;
  token: string;
  name: string | null;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date | null;
  rotationPolicy: string;
  rotatedFrom: string | null;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

function AdminTokensPage() {
  const { currentUser } = Route.useLoaderData();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [policyFilter, setPolicyFilter] = useState<string>("all");
  const [revokeDialogToken, setRevokeDialogToken] =
    useState<CalendarTokenWithUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: tokens, isLoading } = useQuery({
    queryKey: ["admin-calendar-tokens"],
    queryFn: () => getAllCalendarTokens(),
  });

  const rotateMutation = useMutation({
    mutationFn: (tokenId: string) => rotateCalendarToken({ data: { tokenId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-calendar-tokens"] });
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to rotate token");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (tokenId: string) => revokeCalendarToken({ data: { tokenId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-calendar-tokens"] });
      setRevokeDialogToken(null);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to revoke token");
    },
  });

  // Filter tokens
  const filteredTokens = useMemo(() => {
    if (!tokens) return [];

    return tokens.filter((token) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesUser =
          token.user.email.toLowerCase().includes(query) ||
          token.user.name?.toLowerCase().includes(query);
        const matchesName = token.name?.toLowerCase().includes(query);
        if (!matchesUser && !matchesName) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const isActive =
          token.isActive && new Date(token.expiresAt) > new Date();
        if (statusFilter === "active" && !isActive) return false;
        if (statusFilter === "inactive" && isActive) return false;
      }

      // Policy filter
      if (policyFilter !== "all" && token.rotationPolicy !== policyFilter) {
        return false;
      }

      return true;
    });
  }, [tokens, searchQuery, statusFilter, policyFilter]);

  const formatPolicy = (policy: string): string => {
    const labels: Record<string, string> = {
      on_password_change: "Password change",
      annual: "Annual",
      manual: "Manual",
      never: "Never",
    };
    return labels[policy] || policy;
  };

  const isTokenActive = (token: CalendarTokenWithUser): boolean => {
    return token.isActive && new Date(token.expiresAt) > new Date();
  };

  const confirmRevoke = () => {
    if (revokeDialogToken) {
      revokeMutation.mutate(revokeDialogToken.id);
    }
  };

  // If not admin, show access denied
  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <Container>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive font-medium">Access Denied</p>
            <p className="text-muted-foreground mt-2 text-sm">
              You need admin privileges to view this page.
            </p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader
        title="Calendar Token Management"
        description="View and manage calendar tokens across all users"
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Tokens</CardTitle>
              <CardDescription>
                {filteredTokens.length} of {tokens?.length || 0} tokens
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                type="search"
                placeholder="Search by user or token name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
                data-testid="search-tokens"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={policyFilter} onValueChange={setPolicyFilter}>
                <SelectTrigger className="w-40" data-testid="filter-policy">
                  <SelectValue placeholder="Policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Policies</SelectItem>
                  <SelectItem value="on_password_change">
                    Password change
                  </SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          ) : filteredTokens.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              {searchQuery || statusFilter !== "all" || policyFilter !== "all"
                ? "No tokens match your filters"
                : "No calendar tokens found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-border border-b text-left">
                    <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                      User
                    </th>
                    <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                      Token Name
                    </th>
                    <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                      Created
                    </th>
                    <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                      Last Used
                    </th>
                    <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                      Expires
                    </th>
                    <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                      Policy
                    </th>
                    <th className="text-muted-foreground pr-4 pb-3 text-sm font-medium">
                      Status
                    </th>
                    <th className="text-muted-foreground pb-3 text-sm font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((token) => (
                    <tr
                      key={token.id}
                      className="border-border border-b last:border-0"
                      data-testid={`token-row-${token.id}`}
                    >
                      <td className="py-3 pr-4">
                        <div>
                          <div className="text-sm font-medium">
                            {token.user.name || token.user.email}
                          </div>
                          {token.user.name && (
                            <div className="text-muted-foreground text-xs">
                              {token.user.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-sm">
                          {token.name || (
                            <em className="text-muted-foreground">
                              Unnamed token
                            </em>
                          )}
                        </div>
                        {token.rotatedFrom && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            Rotated
                          </Badge>
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
                            Never
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
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rotateMutation.mutate(token.id)}
                            disabled={
                              rotateMutation.isPending || !isTokenActive(token)
                            }
                            data-testid={`rotate-token-${token.id}`}
                          >
                            Rotate
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRevokeDialogToken(token)}
                            disabled={
                              revokeMutation.isPending || !isTokenActive(token)
                            }
                            data-testid={`revoke-token-${token.id}`}
                          >
                            Revoke
                          </Button>
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

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!revokeDialogToken}
        onOpenChange={(open) => {
          if (!open) setRevokeDialogToken(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Calendar Token</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke{" "}
              <strong>
                {revokeDialogToken?.user.name || revokeDialogToken?.user.email}
              </strong>
              &apos;s token{" "}
              <strong>{revokeDialogToken?.name || "(unnamed)"}</strong>? Their
              calendar subscription will stop working immediately. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmRevoke}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? "Revoking..." : "Revoke Token"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
