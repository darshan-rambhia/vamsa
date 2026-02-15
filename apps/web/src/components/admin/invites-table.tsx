import { useState } from "react";
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
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vamsa/ui";
import { deleteInvite, resendInvite, revokeInvite } from "~/server/invites";

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
  invites: Array<Invite>;
  onInviteUpdated: () => void;
}

export function InvitesTable({ invites, onInviteUpdated }: InvitesTableProps) {
  const { t } = useTranslation(["admin", "common"]);
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

  const handleDelete = async (inviteId: string) => {
    setActionLoading(inviteId);
    setError(null);
    try {
      await deleteInvite({ data: { inviteId } });
      onInviteUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete invite");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: Invite["status"]) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">{t("admin:invitesPending")}</Badge>;
      case "ACCEPTED":
        return <Badge variant="secondary">{t("admin:invitesAccepted")}</Badge>;
      case "EXPIRED":
        return <Badge variant="secondary">{t("admin:invitesExpired")}</Badge>;
      case "REVOKED":
        return <Badge variant="destructive">{t("admin:invitesRevoked")}</Badge>;
    }
  };

  const getRoleBadge = (role: Invite["role"]) => {
    switch (role) {
      case "ADMIN":
        return <Badge>{t("admin:roleAdmin")}</Badge>;
      case "MEMBER":
        return <Badge variant="secondary">{t("admin:roleMember")}</Badge>;
      case "VIEWER":
        return <Badge variant="outline">{t("admin:roleViewer")}</Badge>;
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
          <p className="text-muted-foreground font-medium">
            {t("admin:invitesNoInvites")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("admin:invitesNoInvitesMessage")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin:invites")}</CardTitle>
        <CardDescription>
          {t("admin:invitesSentCount", { count: invites.length })}
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
                  {t("common:email")}
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  {t("common:role")}
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  {t("admin:invitesPerson")}
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  {t("common:status")}
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  {t("common:expires")}
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                  {t("common:actions")}
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
                            {copiedId === invite.id
                              ? t("admin:invitesCopied")
                              : t("admin:invitesCopyLink")}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading === invite.id}
                                data-testid={`revoke-invite-${invite.id}`}
                              >
                                {t("common:revoke")}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t("admin:invitesRevokeInviteTitle")}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("admin:invitesRevokeInviteConfirm", {
                                    email: invite.email,
                                  })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t("common:cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRevoke(invite.id)}
                                >
                                  {t("common:revoke")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {(invite.status === "EXPIRED" ||
                        invite.status === "REVOKED") && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResend(invite.id)}
                            disabled={actionLoading === invite.id}
                            data-testid={`resend-invite-${invite.id}`}
                          >
                            {actionLoading === invite.id
                              ? t("admin:invitesResending")
                              : t("admin:invitesResend")}
                          </Button>
                          {invite.status === "REVOKED" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={actionLoading === invite.id}
                                  data-testid={`delete-invite-${invite.id}`}
                                >
                                  {t("common:delete")}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {t("admin:invitesDeleteInvite")}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("admin:invitesDeleteInviteConfirm", {
                                      email: invite.email,
                                    })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    {t("common:cancel")}
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDelete(invite.id)}
                                  >
                                    {t("admin:invitesDeletePermanently")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </>
                      )}
                      {invite.status === "ACCEPTED" && (
                        <span className="text-muted-foreground text-xs">
                          {t("admin:invitesAcceptedOn")}{" "}
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
