import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { validateSession } from "~/server/auth";
import { getOIDCClaimStatus } from "~/server/claim";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Container,
  PageHeader,
} from "@vamsa/ui";
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
          title="Profile Settings"
          description="Manage your profile and account settings"
        />

        <div className="max-w-3xl space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your account details and authentication method
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-muted-foreground text-sm font-medium">
                  Email
                </dt>
                <dd className="mt-1 text-sm">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm font-medium">
                  Name
                </dt>
                <dd className="mt-1 text-sm">{user?.name}</dd>
              </div>
              {isOIDCUser && (
                <div>
                  <dt className="text-muted-foreground text-sm font-medium">
                    Sign-in Method
                  </dt>
                  <dd className="mt-1 text-sm capitalize">
                    {claimStatus?.oidcProvider} (SSO)
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground text-sm font-medium">
                  Role
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
                <CardTitle>Family Tree Profile</CardTitle>
                <CardDescription>
                  Link your account to your person record in the family tree
                </CardDescription>
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
                            Profile Linked
                          </h4>
                          <p className="text-muted-foreground mt-1 text-sm">
                            Your account is linked to{" "}
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
                              Claimed on{" "}
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
                      You haven&apos;t linked your account to a person profile
                      yet. Linking your profile allows you to edit your
                      information and contribute to the family history.
                    </p>
                    <Button onClick={() => setShowClaimModal(true)}>
                      Claim Your Profile
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
