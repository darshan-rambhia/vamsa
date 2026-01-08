import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@vamsa/api/convex/_generated/api";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui";
import { Id } from "@vamsa/api/convex/_generated/dataModel";

export const Route = createFileRoute("/_authenticated/admin/invites")({
  component: InvitesPage,
});

function InvitesPage() {
  const { token } = Route.useRouteContext();
  const invites = useQuery(api.invites.list, { token });
  const persons = useQuery(api.persons.list, { token });
  const createInvite = useMutation(api.invites.create);
  const revokeInvite = useMutation(api.invites.revoke);
  const resendInvite = useMutation(api.invites.resend);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [personId, setPersonId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ email: string; token: string } | null>(null);

  const handleCreateInvite = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createInvite({
        token,
        email,
        role,
        personId: personId ? (personId as Id<"persons">) : undefined,
      });

      setSuccess({ email: result.email, token: result.token });
      setEmail("");
      setRole("MEMBER");
      setPersonId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (inviteId: Id<"invites">) => {
    try {
      await revokeInvite({ token, inviteId });
    } catch (err) {
      console.error("Failed to revoke invite:", err);
    }
  };

  const handleResend = async (inviteId: Id<"invites">) => {
    try {
      const result = await resendInvite({ token, inviteId });
      setSuccess({ email: result.email, token: result.token });
    } catch (err) {
      console.error("Failed to resend invite:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>;
      case "ACCEPTED":
        return <Badge variant="default">Accepted</Badge>;
      case "EXPIRED":
        return <Badge variant="muted">Expired</Badge>;
      case "REVOKED":
        return <Badge variant="destructive">Revoked</Badge>;
      default:
        return <Badge variant="muted">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="default">Admin</Badge>;
      case "MEMBER":
        return <Badge variant="outline">Member</Badge>;
      case "VIEWER":
        return <Badge variant="muted">Viewer</Badge>;
      default:
        return <Badge variant="muted">{role}</Badge>;
    }
  };

  if (invites === undefined) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "PENDING");
  const otherInvites = invites.filter((i) => i.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Family Invites</h2>
          <p className="text-sm text-muted-foreground">
            Invite family members to join and manage the family tree
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Send Invite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Family Member</DialogTitle>
              <DialogDescription>
                Send an email invitation to join your family tree
              </DialogDescription>
            </DialogHeader>

            {success ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-sm font-medium text-primary">
                    Invite created for {success.email}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Share this invite link:
                  </p>
                  <code className="mt-1 block break-all rounded bg-muted p-2 text-xs">
                    {window.location.origin}/invite/{success.token}
                  </code>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setSuccess(null);
                      setIsCreateOpen(false);
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="family@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">Viewer - Can view family tree</SelectItem>
                      <SelectItem value="MEMBER">Member - Can add and edit people</SelectItem>
                      <SelectItem value="ADMIN">Admin - Full access including settings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="person">Link to Person (Optional)</Label>
                  <Select value={personId} onValueChange={setPersonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a person..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No link</SelectItem>
                      {persons?.items.map((person) => (
                        <SelectItem key={person._id} value={person._id}>
                          {person.firstName} {person.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link this invite to an existing person in your family tree
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateInvite}
                    disabled={!email || isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send Invite"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{invite.email}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getRoleBadge(invite.role)}
                      {invite.person && (
                        <span>
                          linked to {invite.person.firstName} {invite.person.lastName}
                        </span>
                      )}
                      <span>·</span>
                      <span>
                        Expires{" "}
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResend(invite.id)}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(invite.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Invites History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite History</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No invites yet. Send your first invite to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{invite.email}</p>
                      {getStatusBadge(invite.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getRoleBadge(invite.role)}
                      {invite.person && (
                        <>
                          <span>·</span>
                          <span>
                            {invite.person.firstName} {invite.person.lastName}
                          </span>
                        </>
                      )}
                      {invite.invitedBy && (
                        <>
                          <span>·</span>
                          <span>by {invite.invitedBy.name || invite.invitedBy.email}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {invite.status === "PENDING" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResend(invite.id)}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(invite.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  )}
                  {invite.status === "EXPIRED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResend(invite.id)}
                    >
                      Resend
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
