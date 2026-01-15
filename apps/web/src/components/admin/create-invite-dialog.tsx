import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui";
import { createInvite } from "~/server/invites";
import { getAvailablePersons } from "~/server/users";

interface CreateInviteFormData {
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  personId: string | null;
}

interface CreateInviteDialogProps {
  onInviteCreated: () => void;
}

export function CreateInviteDialog({
  onInviteCreated,
}: CreateInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    token: string;
    email: string;
  } | null>(null);
  const [persons, setPersons] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateInviteFormData>({
    defaultValues: {
      email: "",
      role: "MEMBER",
      personId: null,
    },
  });

  const searchPersons = async (search: string) => {
    if (!search || search.length < 2) {
      setPersons([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await getAvailablePersons({ data: { search } });
      setPersons(results);
    } catch (err) {
      console.error("Failed to search persons:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const onSubmit = async (data: CreateInviteFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createInvite({
        data: {
          email: data.email,
          role: data.role,
          personId: data.personId,
        },
      });

      setSuccess({ token: result.token, email: result.email });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create invite";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!success) return;
    const url = `${window.location.origin}/invite/${success.token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleClose = () => {
    if (success) {
      onInviteCreated();
    }
    setOpen(false);
    setError(null);
    setSuccess(null);
    setPersons([]);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="create-invite-button">
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {success ? "Invite Created" : "Send Invite"}
          </DialogTitle>
          <DialogDescription>
            {success
              ? "Share the invite link with the recipient"
              : "Invite a family member to join your family tree"}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              <p className="font-medium">Invite sent successfully</p>
              <p className="mt-1">
                An invite has been created for {success.email}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-link">Invite Link</Label>
              <div className="bg-muted flex items-center gap-2 overflow-hidden rounded-md p-2">
                <code id="invite-link" className="min-w-0 flex-1 truncate text-sm">
                  {`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${success.token}`}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyInviteLink}
                  data-testid="copy-new-invite-link"
                >
                  Copy
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                This link expires in 7 days
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} data-testid="close-invite-dialog">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border-2 px-4 py-3 text-sm"
                data-testid="create-invite-error"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid email address",
                  },
                })}
                placeholder="family@example.com"
                data-testid="invite-email-input"
              />
              {errors.email && (
                <p className="text-destructive text-sm">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="invite-role-select">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">
                        Viewer - Can only view
                      </SelectItem>
                      <SelectItem value="MEMBER">Member - Can edit</SelectItem>
                      <SelectItem value="ADMIN">Admin - Full access</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="personSearch">Link to Person (Optional)</Label>
              <Input
                id="personSearch"
                type="text"
                placeholder="Search by name..."
                onChange={(e) => searchPersons(e.target.value)}
                data-testid="invite-person-search"
              />
              {searchLoading && (
                <p className="text-muted-foreground text-sm">Searching...</p>
              )}
              {persons.length > 0 && (
                <Controller
                  name="personId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(val) =>
                        field.onChange(val === "none" ? null : val)
                      }
                    >
                      <SelectTrigger data-testid="invite-person-select">
                        <SelectValue placeholder="Select person to link" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No link</SelectItem>
                        {persons.map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.firstName} {person.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              <p className="text-muted-foreground text-xs">
                Optionally link this invite to an existing person in the tree
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="submit-invite-button"
              >
                {isLoading ? "Sending..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
