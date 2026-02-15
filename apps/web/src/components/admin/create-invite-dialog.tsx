import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
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
}: Readonly<CreateInviteDialogProps>) {
  const { t } = useTranslation(["admin", "common"]);
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
    const url = `${globalThis.location.origin}/invite/${success.token}`;
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
          {t("admin:invitesSendInviteButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {success
              ? t("admin:invitesCreatedSuccessTitle")
              : t("admin:invitesSendInviteButton")}
          </DialogTitle>
          <DialogDescription>
            {success
              ? t("admin:invitesShareLink")
              : t("admin:invitesInviteFamily")}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              <p className="font-medium">{t("common:success")}</p>
              <p className="mt-1">
                {t("admin:invitesSuccessMessage", { email: success.email })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-link">{t("admin:invitesLink")}</Label>
              <div className="bg-muted flex items-center gap-2 overflow-hidden rounded-md p-2">
                <code
                  id="invite-link"
                  className="min-w-0 flex-1 truncate text-sm"
                >
                  {`${globalThis.location.origin}/invite/${success.token}`}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyInviteLink}
                  data-testid="copy-new-invite-link"
                >
                  {t("common:copyUrl")}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("admin:invitesExpiresIn7Days")}
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} data-testid="close-invite-dialog">
                {t("common:done")}
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
              <Label htmlFor="email">{t("admin:invitesEmail")}</Label>
              <Input
                id="email"
                type="email"
                {...register("email", {
                  required: t("admin:invitesEmailRequired"),
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: t("admin:invitesInvalidEmail"),
                  },
                })}
                placeholder={t("admin:invitesEmailPlaceholder")}
                data-testid="invite-email-input"
              />
              {errors.email && (
                <p className="text-destructive text-sm">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t("common:role")}</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="invite-role-select">
                      <SelectValue placeholder={t("admin:invitesSelectRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">
                        {t("admin:invitesViewerDescription")}
                      </SelectItem>
                      <SelectItem value="MEMBER">
                        {t("admin:invitesMemberDescription")}
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        {t("admin:invitesAdminDescription")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="personSearch">
                {t("admin:invitesLinkToExisting")}
              </Label>
              <Input
                id="personSearch"
                type="text"
                placeholder={t("admin:invitesSearchByName")}
                onChange={(e) => searchPersons(e.target.value)}
                data-testid="invite-person-search"
              />
              {searchLoading && (
                <p className="text-muted-foreground text-sm">
                  {t("admin:invitesSearching")}
                </p>
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
                        <SelectValue
                          placeholder={t("admin:invitesSelectPersonToLink")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {t("admin:invitesNoLink")}
                        </SelectItem>
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
                {t("admin:invitesLinkOptional")}
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
