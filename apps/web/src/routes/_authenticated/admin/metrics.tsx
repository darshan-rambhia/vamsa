import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Container,
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Input,
  Label,
} from "@vamsa/ui";
import { useQuery } from "@tanstack/react-query";
import { getMetricsSnapshot, getPrometheusStatus } from "~/server/metrics";
import { getCurrentUser } from "~/server/auth";
import { getFamilySettings, updateFamilySettings } from "~/server/settings";
import { AdminRouteError } from "~/components/admin/route-error";
import {
  Activity,
  Database,
  Users,
  TrendingUp,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Settings,
} from "lucide-react";
import { cn } from "@vamsa/ui";

export const Route = createFileRoute("/_authenticated/admin/metrics")({
  loader: async () => {
    const [currentUser, prometheusStatus, settings] = await Promise.all([
      getCurrentUser(),
      getPrometheusStatus(),
      getFamilySettings(),
    ]);
    return { currentUser, prometheusStatus, settings };
  },
  component: MetricsPage,
  errorComponent: AdminRouteError,
});

function MetricsPage() {
  const router = useRouter();
  const { currentUser, prometheusStatus, settings } = Route.useLoaderData();

  // Check if user is admin
  const isAdmin = currentUser?.role === "ADMIN";

  const {
    data: metrics,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => getMetricsSnapshot(),
    refetchInterval: 5000,
    staleTime: 4000,
    // Only fetch if user is admin and prometheus is available
    enabled: isAdmin && prometheusStatus.available,
  });

  // If not admin, show access denied
  if (!isAdmin) {
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
      <div className="mb-6 flex items-center justify-between">
        <PageHeader
          title="System Metrics"
          description="Real-time application performance monitoring"
        />
        {prometheusStatus.available && (
          <div className="flex items-center gap-2">
            <Badge
              variant={
                metrics?.status === "healthy"
                  ? "default"
                  : metrics?.status === "degraded"
                    ? "secondary"
                    : "destructive"
              }
              className="text-xs"
            >
              {metrics?.status === "healthy"
                ? "LIVE"
                : metrics?.status === "degraded"
                  ? "DEGRADED"
                  : "OFFLINE"}
            </Badge>
            {dataUpdatedAt && (
              <span className="text-muted-foreground text-xs">
                Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => refetch()}
              className="hover:bg-muted rounded p-1"
              title="Refresh metrics"
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
            </button>
          </div>
        )}
      </div>

      {/* Configuration Card - always visible */}
      <MetricsConfigCard
        settings={settings}
        prometheusAvailable={prometheusStatus.available}
        currentUrl={prometheusStatus.url}
        onSaved={() => router.invalidate()}
      />

      {error && prometheusStatus.available && (
        <Card className="border-destructive/50 mb-6">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-destructive h-5 w-5" />
              <div>
                <p className="font-medium">Failed to Load Metrics</p>
                <p className="text-muted-foreground text-sm">
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Only show metrics cards when Prometheus is available */}
      {!prometheusStatus.available ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
            <p className="text-lg font-medium">Metrics Not Available</p>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
              Configure your Prometheus/metrics API URL above, or start the
              observability stack with:
            </p>
            <code className="bg-muted mt-4 inline-block rounded px-3 py-2 text-sm">
              docker compose -f docker/docker-compose.observability.yml up -d
            </code>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* HTTP Metrics */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="text-primary h-5 w-5" />
                <CardTitle>HTTP Performance</CardTitle>
              </div>
              <CardDescription>
                Request rate, latency, and errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard
                  label="Request Rate"
                  value={formatRate(metrics?.http.requestRate)}
                  unit="req/s"
                  loading={isLoading}
                  trend={getTrend(metrics?.http.requestRate, 10, "high")}
                />
                <MetricCard
                  label="Error Rate"
                  value={formatRate(metrics?.http.errorRate)}
                  unit="err/s"
                  loading={isLoading}
                  trend={getTrend(metrics?.http.errorRate, 0.5, "warning", 0.1)}
                />
                <MetricCard
                  label="P95 Latency"
                  value={formatMs(metrics?.http.p95Latency)}
                  unit="ms"
                  loading={isLoading}
                  trend={getTrend(
                    metrics?.http.p95Latency,
                    500,
                    "warning",
                    200
                  )}
                />
                <MetricCard
                  label="Active Connections"
                  value={formatNumber(metrics?.http.activeConnections)}
                  unit=""
                  loading={isLoading}
                  trend="normal"
                />
              </div>
            </CardContent>
          </Card>

          {/* Database Metrics */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="text-primary h-5 w-5" />
                <CardTitle>Database Performance</CardTitle>
              </div>
              <CardDescription>
                Query performance and slow query detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <MetricCard
                  label="Query Rate"
                  value={formatRate(metrics?.database.queryRate)}
                  unit="q/s"
                  loading={isLoading}
                  trend="normal"
                />
                <MetricCard
                  label="Slow Queries"
                  value={formatNumber(metrics?.database.slowQueryCount)}
                  unit=""
                  loading={isLoading}
                  trend={getTrend(
                    metrics?.database.slowQueryCount,
                    10,
                    "warning",
                    1
                  )}
                />
                <MetricCard
                  label="P95 Query Time"
                  value={formatMs(metrics?.database.p95QueryTime)}
                  unit="ms"
                  loading={isLoading}
                  trend={getTrend(
                    metrics?.database.p95QueryTime,
                    100,
                    "warning",
                    50
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Application Metrics */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="text-primary h-5 w-5" />
                <CardTitle>User Activity</CardTitle>
              </div>
              <CardDescription>Active users and feature usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  label="Active Users"
                  value={formatNumber(metrics?.application.activeUsers)}
                  unit=""
                  loading={isLoading}
                  trend="normal"
                />
                <MetricCard
                  label="Search Queries"
                  value={formatRate(metrics?.application.searchQueries)}
                  unit="/s"
                  loading={isLoading}
                  trend="normal"
                />
              </div>

              {metrics?.application.chartViews &&
                Object.keys(metrics.application.chartViews).length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-medium">
                      Chart Views (5m rate)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {Object.entries(metrics.application.chartViews).map(
                        ([type, count]) => (
                          <div
                            key={type}
                            className="bg-muted/50 flex items-center justify-between rounded-md p-2"
                          >
                            <span className="text-sm capitalize">{type}</span>
                            <Badge variant="secondary">
                              {formatRate(count)}/s
                            </Badge>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Link to Grafana */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-primary h-5 w-5" />
                    <h3 className="font-medium">Advanced Monitoring</h3>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    View detailed dashboards, historical data, and alerts in
                    Grafana
                  </p>
                </div>
                <a
                  href={prometheusStatus.grafanaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Grafana
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Available Dashboards */}
          <Card>
            <CardHeader>
              <CardTitle>Available Dashboards</CardTitle>
              <CardDescription>
                Pre-configured Grafana dashboards for monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DashboardLink
                  name="Application Overview"
                  description="Request rates, latency percentiles, error tracking"
                  href={`${prometheusStatus.grafanaUrl}/d/vamsa-app-overview`}
                />
                <DashboardLink
                  name="Database Performance"
                  description="Query duration, slow queries, Prisma metrics"
                  href={`${prometheusStatus.grafanaUrl}/d/vamsa-db-perf`}
                />
                <DashboardLink
                  name="Feature Performance"
                  description="Charts, search, relationships, GEDCOM, media"
                  href={`${prometheusStatus.grafanaUrl}/d/vamsa-feature-perf`}
                />
                <DashboardLink
                  name="User Activity"
                  description="Active users, sessions, feature adoption"
                  href={`${prometheusStatus.grafanaUrl}/d/vamsa-user-activity`}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Container>
  );
}

interface MetricsConfigCardProps {
  settings: {
    familyName: string;
    description: string;
    allowSelfRegistration: boolean;
    requireApprovalForEdits: boolean;
    metricsDashboardUrl: string | null;
    metricsApiUrl: string | null;
  };
  prometheusAvailable: boolean;
  currentUrl: string;
  onSaved: () => void;
}

function MetricsConfigCard({
  settings,
  prometheusAvailable,
  currentUrl,
  onSaved,
}: MetricsConfigCardProps) {
  const [isExpanded, setIsExpanded] = useState(!prometheusAvailable);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState(
    settings.metricsDashboardUrl ?? ""
  );
  const [apiUrl, setApiUrl] = useState(settings.metricsApiUrl ?? "");

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateFamilySettings({
        data: {
          familyName: settings.familyName,
          description: settings.description,
          allowSelfRegistration: settings.allowSelfRegistration,
          requireApprovalForEdits: settings.requireApprovalForEdits,
          metricsDashboardUrl: dashboardUrl || null,
          metricsApiUrl: apiUrl || null,
        },
      });
      setSuccess(true);
      onSaved();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn("mb-6", !prometheusAvailable && "border-amber-500/50")}>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="text-primary h-5 w-5" />
            <CardTitle>Metrics Configuration</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {prometheusAvailable ? (
              <Badge variant="default" className="text-xs">
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Not Connected
              </Badge>
            )}
            <span className="text-muted-foreground text-sm">
              {isExpanded ? "▲" : "▼"}
            </span>
          </div>
        </div>
        <CardDescription>
          {prometheusAvailable
            ? `Connected to ${currentUrl}`
            : "Configure your Prometheus and Grafana URLs to enable metrics"}
        </CardDescription>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {error && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border-2 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border-2 border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              Settings saved! Refresh to see updated connection status.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="metricsApiUrl">Metrics API URL (Prometheus)</Label>
            <Input
              id="metricsApiUrl"
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:9090"
            />
            <p className="text-muted-foreground text-xs">
              URL of your Prometheus server. Leave empty to use the default
              (localhost:9090).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metricsDashboardUrl">
              Metrics Dashboard URL (Grafana)
            </Label>
            <Input
              id="metricsDashboardUrl"
              type="url"
              value={dashboardUrl}
              onChange={(e) => setDashboardUrl(e.target.value)}
              placeholder="http://localhost:3001"
            />
            <p className="text-muted-foreground text-xs">
              URL of your Grafana dashboard. Leave empty to use the default
              (localhost:3001).
            </p>
          </div>

          {!prometheusAvailable && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="mb-2 text-sm font-medium">Quick Start</p>
              <p className="text-muted-foreground mb-2 text-sm">
                Start the observability stack locally:
              </p>
              <code className="bg-background block rounded px-3 py-2 text-sm">
                docker compose -f docker/docker-compose.observability.yml up -d
              </code>
            </div>
          )}

          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Configuration"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  loading: boolean;
  trend: "good" | "normal" | "warning" | "critical" | "high";
}

function MetricCard({ label, value, unit, loading, trend }: MetricCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case "good":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "high":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-sm">{label}</p>
      {loading ? (
        <div className="bg-muted h-8 w-20 animate-pulse rounded" />
      ) : (
        <p className={cn("text-2xl font-bold tabular-nums", getTrendColor())}>
          {value}
          {unit && <span className="ml-1 text-base font-normal">{unit}</span>}
        </p>
      )}
    </div>
  );
}

interface DashboardLinkProps {
  name: string;
  description: string;
  href: string;
}

function DashboardLink({ name, description, href }: DashboardLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-muted/50 group flex items-start gap-3 rounded-lg border p-3 transition-colors"
    >
      <TrendingUp className="text-muted-foreground group-hover:text-primary mt-0.5 h-5 w-5" />
      <div className="flex-1">
        <h4 className="group-hover:text-primary font-medium">{name}</h4>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <ExternalLink className="text-muted-foreground h-4 w-4" />
    </a>
  );
}

// Utility functions
function formatRate(value: number | undefined): string {
  if (value === undefined || value === null) return "0.00";
  return value.toFixed(2);
}

function formatMs(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) return "0";
  return Math.round(value).toString();
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return "0";
  return Math.round(value).toString();
}

function getTrend(
  value: number | undefined,
  warningThreshold: number,
  warningDirection: "warning" | "high",
  goodThreshold?: number
): "good" | "normal" | "warning" | "critical" | "high" {
  if (value === undefined || value === null) return "normal";

  if (warningDirection === "warning") {
    // Higher is worse
    if (value >= warningThreshold) return "critical";
    if (goodThreshold !== undefined && value <= goodThreshold) return "good";
    if (value > (goodThreshold ?? 0)) return "warning";
    return "good";
  } else {
    // Higher is just "high" (neutral)
    if (value >= warningThreshold) return "high";
    return "normal";
  }
}
