import { useState } from "react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@vamsa/ui";
import { revokeInvite, resendInvite } from "~/server/invites";

interface Invite {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  token: string;
  personId: string | null;
  person: { id: string; firstName: string; lastName: string } | null;
  invitedBy: { id: string; name: string | null; email: string } | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

interface InvitesTableProps {
  invites: Invite[];
  onInviteUpdated: () => void;
}

export function InvitesTable({ invites, onInviteUpdated }: InvitesTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getInviteUrl = (token: string) => {
    // Use window.location.origin for the base URL
    if (typeof window !== "undefined") {
      return `${window.location.origin}/invite/${token}`;
    }
    return `/invite/${token}`;
  };

  const copyToClipboard = async (invite: Invite) => {
    try {
      await navigator.clipboard.writeText(getInviteUrl(invite.token));
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setActionLoading(inviteId);
    setError(null);
    try {
      await revokeInvite({ data: { inviteId } });
      onInviteUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResend = async (inviteId: string) => {
    setActionLoading(inviteId);
    setError(null);
    try {
      await resendInvite({ data: { inviteId } });
      onInviteUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend invite");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: Invite["status"]) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>;
      case "ACCEPTED":
        return <Badge variant="secondary">Accepted</Badge>;
      case "EXPIRED":
        return <Badge variant="secondary">Expired</Badge>;
      case "REVOKED":
        return <Badge variant="destructive">Revoked</Badge>;
    }
  };

  const getRoleBadge = (role: Invite["role"]) => {
    switch (role) {
      case "ADMIN":
        return <Badge>Admin</Badge>;
      case "MEMBER":
        return <Badge variant="secondary">Member</Badge>;
      case "VIEWER":
        return <Badge variant="outline">Viewer</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (invites.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <svg
            className="text-muted-foreground mx-auto mb-4 h-16 w-16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          <p className="text-muted-foreground font-medium">No invites yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Send invites to family members to join your tree
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invites</CardTitle>
        <CardDescription>
          {invites.length} invite{invites.length !== 1 ? "s" : ""} sent
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div
            className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-lg border-2 px-4 py-3 text-sm"
            data-testid="invites-error"
          >
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="invites-table">
            <thead>
              <tr className="border-border border-b">
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Email
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Role
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Person
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Status
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Expires
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr
                  key={invite.id}
                  className="border-border border-b last:border-0"
                  data-testid={`invite-row-${invite.id}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{invite.email}</span>
                  </td>
                  <td className="px-4 py-3">{getRoleBadge(invite.role)}</td>
                  <td className="px-4 py-3">
                    {invite.person ? (
                      <span>
                        {invite.person.firstName} {invite.person.lastName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(invite.status)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        invite.status === "PENDING" &&
                        isExpired(invite.expiresAt)
                          ? "text-destructive"
                          : ""
                      }
                    >
                      {formatDate(invite.expiresAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {invite.status === "PENDING" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(invite)}
                            disabled={actionLoading === invite.id}
                            data-testid={`copy-invite-${invite.id}`}
                          >
                            {copiedId === invite.id ? "Copied!" : "Copy Link"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading === invite.id}
                                data-testid={`revoke-invite-${invite.id}`}
                              >
                                Revoke
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Revoke Invite
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke this invite
                                  for <strong>{invite.email}</strong>? The
                                  invite link will no longer work.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRevoke(invite.id)}
                                >
                                  Revoke
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {(invite.status === "EXPIRED" ||
                        invite.status === "REVOKED") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResend(invite.id)}
                          disabled={actionLoading === invite.id}
                          data-testid={`resend-invite-${invite.id}`}
                        >
                          {actionLoading === invite.id
                            ? "Resending..."
                            : "Resend"}
                        </Button>
                      )}
                      {invite.status === "ACCEPTED" && (
                        <span className="text-muted-foreground text-xs">
                          Accepted{" "}
                          {invite.acceptedAt && formatDate(invite.acceptedAt)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
