import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  PageHeader,
} from "@vamsa/ui";
import { validateSession } from "~/server/auth.functions";
import { getOIDCClaimStatus } from "~/server/claim.functions";
import { OIDCProfileClaimModal } from "~/components/auth/oidc-profile-claim-modal";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  beforeLoad: async () => {
    const result = await validateSession();
    if (!result.valid) {
      throw new Error("Not authenticated");
    }
    return { user: result.user };
  },
  component: ProfileSettingsPage,
});

function ProfileSettingsPage() {
  const { t } = useTranslation(["common"]);
  const { user } = Route.useRouteContext();
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Fetch OIDC claim status
  const { data: claimStatus } = useQuery({
    queryKey: ["oidc-claim-status"],
    queryFn: () => getOIDCClaimStatus(),
    enabled: !!user?.oidcProvider,
  });

  const isOIDCUser = !!user?.oidcProvider;
  const hasClaimedProfile = !!claimStatus?.personId;

  return (
    <>
      <Container>
        <PageHeader
          title={t("profileSettings")}
          description={t("manageProfileSettings")}
        />

        <div className="max-w-3xl space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("accountInformation")}</CardTitle>
              <CardDescription>{t("accountDetails")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-muted-foreground text-sm font-medium">
                  {t("email")}
                </dt>
                <dd className="mt-1 text-sm">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm font-medium">
                  {t("name")}
                </dt>
                <dd className="mt-1 text-sm">{user?.name}</dd>
              </div>
              {isOIDCUser && (
                <div>
                  <dt className="text-muted-foreground text-sm font-medium">
                    {t("signInMethod")}
                  </dt>
                  <dd className="mt-1 text-sm capitalize">
                    {claimStatus?.oidcProvider} (SSO)
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground text-sm font-medium">
                  {t("role")}
                </dt>
                <dd className="mt-1 text-sm capitalize">
                  {user?.role?.toLowerCase()}
                </dd>
              </div>
            </CardContent>
          </Card>

          {/* Profile Link Section - Only for OIDC users */}
          {isOIDCUser && (
            <Card>
              <CardHeader>
                <CardTitle>{t("familyTreeProfile")}</CardTitle>
                <CardDescription>{t("linkAccountDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {hasClaimedProfile ? (
                  <div className="space-y-4">
                    <div className="bg-primary/5 border-primary/20 rounded-lg border-2 p-4">
                      <div className="flex items-start gap-3">
                        <svg
                          className="text-primary mt-0.5 h-5 w-5 flex-shrink-0"
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
                          <h4 className="font-display text-sm font-medium">
                            {t("profileLinked")}
                          </h4>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {t("yourAccountLinkedTo")}{" "}
                            <span className="text-foreground font-medium">
                              {claimStatus?.person?.firstName}{" "}
                              {claimStatus?.person?.lastName}
                            </span>
                          </p>
                          {claimStatus?.person?.email && (
                            <p className="text-muted-foreground mt-1 text-xs">
                              {claimStatus.person.email}
                            </p>
                          )}
                          {claimStatus?.profileClaimedAt && (
                            <p className="text-muted-foreground mt-2 text-xs">
                              {t("claimedOn")}{" "}
                              {new Date(
                                claimStatus.profileClaimedAt
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                      {t("haventLinkedProfile")}
                    </p>
                    <Button onClick={() => setShowClaimModal(true)}>
                      {t("claimYourProfile")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </Container>

      {/* Profile Claim Modal */}
      <OIDCProfileClaimModal
        open={showClaimModal}
        onOpenChange={setShowClaimModal}
      />
    </>
  );
}
