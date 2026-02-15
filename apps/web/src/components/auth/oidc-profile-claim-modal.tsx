"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from "@vamsa/ui";
import { ProfileCard } from "./profile-card";
import {
  claimProfileOIDC,
  getOIDCClaimableProfiles,
  skipProfileClaim,
} from "~/server/claim.functions";

interface OIDCProfileClaimModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OIDCProfileClaimModal({
  open,
  onOpenChange,
}: OIDCProfileClaimModalProps) {
  const { t } = useTranslation(["auth", "common"]);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch claimable profiles
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["oidc-claimable-profiles"],
    queryFn: () => getOIDCClaimableProfiles(),
    enabled: open,
  });

  // Filter profiles based on search query
  const filteredProfiles = useMemo(() => {
    if (!profiles?.all) return [];
    if (!searchQuery.trim()) return profiles.all;

    const query = searchQuery.toLowerCase();
    return profiles.all.filter(
      (p) =>
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query)
    );
  }, [profiles?.all, searchQuery]);

  // Claim profile mutation
  const claimMutation = useMutation({
    mutationFn: (personId: string) => claimProfileOIDC({ data: { personId } }),
    onSuccess: () => {
      // Reload the page to refresh user session
      router.invalidate();
      window.location.reload();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to claim profile");
    },
  });

  // Skip profile claim mutation
  const skipMutation = useMutation({
    mutationFn: () => skipProfileClaim(),
    onSuccess: () => {
      onOpenChange?.(false);
      router.invalidate();
    },
    onError: (err) => {
      setError(
        err instanceof Error ? err.message : "Failed to skip profile claim"
      );
    },
  });

  const handleClaim = (personId: string) => {
    setError(null);
    claimMutation.mutate(personId);
  };

  const handleSkip = () => {
    setError(null);
    skipMutation.mutate();
  };

  const isDisabled =
    claimMutation.isPending || skipMutation.isPending || isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {t("welcomeToVamsa")}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t("areYouInThisFamilyTree")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto pr-2">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {/* Suggested Matches */}
          {profiles?.suggested && profiles.suggested.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold">
                {t("suggestedMatches")}
              </h3>
              <div className="space-y-2">
                {profiles.suggested.map((person) => (
                  <ProfileCard
                    key={person.id}
                    person={{
                      ...person,
                      dateOfBirth: person.dateOfBirth
                        ? new Date(person.dateOfBirth)
                        : null,
                    }}
                    onClaim={() => handleClaim(person.id)}
                    highlighted
                    disabled={isDisabled}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Living Profiles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-display text-lg font-semibold">
                {t("allLivingProfiles")}
              </h3>
              <Input
                type="search"
                placeholder={t("searchByNameOrEmail")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
                disabled={isDisabled}
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
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
            ) : filteredProfiles.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                {searchQuery ? t("noProfilesMatch") : t("noProfilesAvailable")}
              </div>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-2">
                {filteredProfiles.map((person) => (
                  <ProfileCard
                    key={person.id}
                    person={{
                      ...person,
                      dateOfBirth: person.dateOfBirth
                        ? new Date(person.dateOfBirth)
                        : null,
                    }}
                    onClaim={() => handleClaim(person.id)}
                    disabled={isDisabled}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isDisabled}
            className="min-w-[120px]"
          >
            {skipMutation.isPending ? (
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
            ) : null}
            {t("skipForNow")}
          </Button>
          <p className="text-muted-foreground text-sm">
            {t("claimProfileLaterInSettings")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
