import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Textarea,
} from "@vamsa/ui";
import { useTranslation } from "react-i18next";
import { updateFamilySettings } from "~/server/settings";

interface SettingsFormData {
  familyName: string;
  description: string;
  allowSelfRegistration: boolean;
  requireApprovalForEdits: boolean;
  metricsDashboardUrl: string;
  metricsApiUrl: string;
}

interface SettingsFormProps {
  settings: {
    id: string | null;
    familyName: string;
    description: string;
    allowSelfRegistration: boolean;
    requireApprovalForEdits: boolean;
    metricsDashboardUrl: string | null;
    metricsApiUrl: string | null;
  };
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const { t } = useTranslation(["admin", "common"]);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SettingsFormData>({
    defaultValues: {
      familyName: settings.familyName,
      description: settings.description,
      allowSelfRegistration: settings.allowSelfRegistration,
      requireApprovalForEdits: settings.requireApprovalForEdits,
      metricsDashboardUrl: settings.metricsDashboardUrl ?? "",
      metricsApiUrl: settings.metricsApiUrl ?? "",
    },
  });

  async function onSubmit(data: SettingsFormData) {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await updateFamilySettings({
        data: {
          ...data,
          // Convert empty strings to null for optional URL fields
          metricsDashboardUrl: data.metricsDashboardUrl || null,
          metricsApiUrl: data.metricsApiUrl || null,
        },
      });
      setSuccess(true);
      router.invalidate();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save settings";
      console.error("[Settings Form] Save failed:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      data-testid="settings-form"
    >
      {error && (
        <div
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border-2 px-4 py-3 text-sm"
          data-testid="settings-error"
        >
          <div className="mb-1 font-semibold">{t("common:error")}:</div>
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div
          className="rounded-lg border-2 border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400"
          data-testid="settings-success"
        >
          <div className="font-semibold">{t("admin:settingsSaved")}</div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("admin:settingsTitle")}</CardTitle>
          <CardDescription>{t("admin:settingsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="familyName">{t("admin:settingsFamilyName")}</Label>
            <Input
              id="familyName"
              {...register("familyName", {
                required: t("common:required"),
              })}
              data-testid="settings-family-name-input"
            />
            {errors.familyName && (
              <p className="text-destructive text-sm">
                {errors.familyName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("common:description")}</Label>
            <Textarea
              id="description"
              {...register("description")}
              className="min-h-[100px]"
              placeholder={t("admin:settingsDescription")}
              data-testid="settings-description-input"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin:settingsPrivacy")}</CardTitle>
          <CardDescription>{t("admin:settingsPrivacy")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Controller
              name="allowSelfRegistration"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="allowSelfRegistration"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="settings-allow-registration-checkbox"
                />
              )}
            />
            <div className="space-y-1">
              <Label
                htmlFor="allowSelfRegistration"
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("admin:settingsAllowSelfRegistration")}
              </Label>
              <p className="text-muted-foreground text-sm">
                {t("admin:settingsAllowSelfRegistration")}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Controller
              name="requireApprovalForEdits"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="requireApprovalForEdits"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="settings-require-approval-checkbox"
                />
              )}
            />
            <div className="space-y-1">
              <Label
                htmlFor="requireApprovalForEdits"
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("admin:settingsRequireApproval")}
              </Label>
              <p className="text-muted-foreground text-sm">
                {t("admin:settingsRequireApproval")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin:metricsTitle")}</CardTitle>
          <CardDescription>{t("admin:metricsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metricsDashboardUrl">
              {t("admin:metricsTitle")}
            </Label>
            <Input
              id="metricsDashboardUrl"
              type="url"
              {...register("metricsDashboardUrl", {
                validate: (value) =>
                  !value ||
                  /^https?:\/\/.+/.test(value) ||
                  t("common:invalidEmail"),
              })}
              placeholder="https://grafana.example.com"
              data-testid="settings-metrics-dashboard-url-input"
            />
            <p className="text-muted-foreground text-sm">
              {t("admin:metricsDescription")}
            </p>
            {errors.metricsDashboardUrl && (
              <p className="text-destructive text-sm">
                {errors.metricsDashboardUrl.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="metricsApiUrl">{t("admin:metricsTitle")}</Label>
            <Input
              id="metricsApiUrl"
              type="url"
              {...register("metricsApiUrl", {
                validate: (value) =>
                  !value ||
                  /^https?:\/\/.+/.test(value) ||
                  t("common:invalidEmail"),
              })}
              placeholder="https://prometheus.example.com"
              data-testid="settings-metrics-api-url-input"
            />
            <p className="text-muted-foreground text-sm">
              {t("admin:metricsDescription")}
            </p>
            {errors.metricsApiUrl && (
              <p className="text-destructive text-sm">
                {errors.metricsApiUrl.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={isLoading}
        data-testid="settings-submit-button"
      >
        {isLoading ? t("common:loading") : t("admin:settingsSave")}
      </Button>
    </form>
  );
}
