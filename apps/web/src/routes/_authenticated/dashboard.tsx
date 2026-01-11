import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getDashboardStats, getPendingSuggestions } from "~/server/dashboard";
import {
  Container,
  PageHeader,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
} from "@vamsa/ui";
import { formatRelativeTime } from "~/lib/format";
import type { SupportedLocale } from "~/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardComponent,
});

function DashboardComponent() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as SupportedLocale;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  const { data: pendingSuggestions } = useQuery({
    queryKey: ["pending-suggestions"],
    queryFn: () => getPendingSuggestions(),
  });

  return (
    <Container className="space-y-8">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.welcome")}
        actions={
          <Button asChild>
            <Link to="/people/new">{t("people.addPerson")}</Link>
          </Button>
        }
      />

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.totalPeople")}
          value={stats?.totalPeople ?? 0}
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          }
          loading={isLoading}
          href="/people"
        />
        <StatCard
          title={t("people.living")}
          value={stats?.livingPeople ?? 0}
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          }
          loading={isLoading}
          variant="success"
        />
        <StatCard
          title={t("people.deceased")}
          value={stats?.deceasedPeople ?? 0}
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
          }
          loading={isLoading}
          variant="muted"
        />
        <StatCard
          title={t("people.relationships")}
          value={stats?.totalRelationships ?? 0}
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          }
          loading={isLoading}
        />
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Additions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("dashboard.recentActivity")}</span>
              <Link
                to="/people"
                className="text-primary text-sm font-normal hover:underline"
              >
                {t("common.search")}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex animate-pulse items-center gap-3"
                  >
                    <div className="bg-muted h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="bg-muted h-4 w-32 rounded" />
                      <div className="bg-muted h-3 w-24 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !stats?.recentAdditions.length ? (
              <p className="text-muted-foreground py-8 text-center">
                {t("dashboard.noActivity")}
              </p>
            ) : (
              <div className="space-y-3">
                {stats?.recentAdditions.map((person) => (
                  <Link
                    key={person.id}
                    to="/people/$personId"
                    params={{ personId: person.id }}
                    className="hover:bg-accent -mx-2 flex items-center gap-3 rounded-lg p-2 transition-colors"
                  >
                    <Avatar
                      fallback={`${person.firstName[0]}${person.lastName[0]}`}
                      alt={`${person.firstName} ${person.lastName}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {person.firstName} {person.lastName}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {t("common.add")}{" "}
                        {formatRelativeTime(person.createdAt, locale)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t("admin.pendingApprovals")}</span>
              <Link
                to="/admin"
                className="text-primary text-sm font-normal hover:underline"
              >
                {t("common.search")}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingSuggestions === undefined ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex animate-pulse items-center gap-3"
                  >
                    <div className="bg-muted h-8 w-8 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="bg-muted h-4 w-40 rounded" />
                      <div className="bg-muted h-3 w-24 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingSuggestions.length === 0 ? (
              <div className="py-8 text-center">
                <div className="bg-secondary/50 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                  <svg
                    className="text-secondary-foreground h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-muted-foreground">
                  {t("dashboard.noActivity")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSuggestions.slice(0, 5).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="-mx-2 flex items-start gap-3 rounded-lg p-2"
                  >
                    <div className="bg-primary/10 text-primary mt-0.5 flex h-8 w-8 items-center justify-center rounded">
                      <SuggestionIcon type={suggestion.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {getSuggestionLabel(suggestion.type)}
                      </p>
                      <p className="text-muted-foreground truncate text-sm">
                        By{" "}
                        {suggestion.submittedBy?.name ||
                          suggestion.submittedBy?.email ||
                          "Unknown"}
                      </p>
                    </div>
                  </div>
                ))}
                {pendingSuggestions.length > 5 && (
                  <p className="text-muted-foreground pt-2 text-center text-sm">
                    +{pendingSuggestions.length - 5} more pending
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("common.actions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/people/new"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                  />
                </svg>
              }
              label={t("people.addPerson")}
              description={t("people.addPerson")}
            />
            <QuickAction
              href="/tree"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
              }
              label={t("navigation.family")}
              description={t("navigation.family")}
            />
            <QuickAction
              href="/people"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              }
              label={t("common.search")}
              description={t("navigation.people")}
            />
            <QuickAction
              href="/admin/backup"
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
              }
              label={t("common.save")}
              description={t("common.save")}
            />
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  loading?: boolean;
  variant?: "default" | "success" | "muted";
  href?: string;
}

function StatCard({
  title,
  value,
  icon,
  loading,
  variant = "default",
  href,
}: StatCardProps) {
  const content = (
    <Card
      className={
        href
          ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          : ""
      }
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            {loading ? (
              <div className="bg-muted mt-2 h-8 w-16 animate-pulse rounded" />
            ) : (
              <p
                className={`font-display mt-1 text-3xl font-medium ${
                  variant === "success"
                    ? "text-primary"
                    : variant === "muted"
                      ? "text-muted-foreground"
                      : "text-foreground"
                }`}
              >
                {value}
              </p>
            )}
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              variant === "success"
                ? "bg-primary/10 text-primary"
                : variant === "muted"
                  ? "bg-muted text-muted-foreground"
                  : "bg-secondary/50 text-secondary-foreground"
            }`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}

interface QuickActionProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

function QuickAction({ href, icon, label, description }: QuickActionProps) {
  return (
    <Link
      to={href}
      className="hover:border-primary/20 hover:bg-accent flex items-center gap-4 rounded-lg border-2 border-transparent p-4 transition-all"
    >
      <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </Link>
  );
}

function SuggestionIcon({ type }: { type: string }) {
  if (type === "CREATE") {
    return (
      <svg
        className="h-4 w-4"
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
    );
  }
  if (type === "UPDATE") {
    return (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        />
      </svg>
    );
  }
  if (type === "DELETE") {
    return (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

function getSuggestionLabel(type: string): string {
  switch (type) {
    case "CREATE":
      return "New person suggestion";
    case "UPDATE":
      return "Update suggestion";
    case "DELETE":
      return "Delete suggestion";
    case "ADD_RELATIONSHIP":
      return "New relationship";
    default:
      return "Suggestion";
  }
}
