"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui";
import { getBackupSettings, updateBackupSettings } from "~/server/backup";
import type { BackupSettings } from "@vamsa/schemas";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function BackupScheduleSettings() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["backup-settings"],
    queryFn: () => getBackupSettings(),
  });

  // Form state
  const [formData, setFormData] = useState<Partial<BackupSettings>>({
    dailyEnabled: true,
    dailyTime: "02:00",
    weeklyEnabled: true,
    weeklyDay: 0,
    weeklyTime: "03:00",
    monthlyEnabled: true,
    monthlyDay: 1,
    monthlyTime: "04:00",
    dailyRetention: 7,
    weeklyRetention: 4,
    monthlyRetention: 12,
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        dailyEnabled: settings.dailyEnabled,
        dailyTime: settings.dailyTime,
        weeklyEnabled: settings.weeklyEnabled,
        weeklyDay: settings.weeklyDay,
        weeklyTime: settings.weeklyTime,
        monthlyEnabled: settings.monthlyEnabled,
        monthlyDay: settings.monthlyDay,
        monthlyTime: settings.monthlyTime,
        dailyRetention: settings.dailyRetention,
        weeklyRetention: settings.weeklyRetention,
        monthlyRetention: settings.monthlyRetention,
      });
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      updateBackupSettings({
        data: {
          ...settings,
          ...formData,
          storageProvider: settings?.storageProvider || "LOCAL",
          storagePath: settings?.storagePath || "backups",
          includePhotos: settings?.includePhotos ?? true,
          includeAuditLogs: settings?.includeAuditLogs ?? false,
          compressLevel: settings?.compressLevel ?? 6,
          notifyOnSuccess: settings?.notifyOnSuccess ?? false,
          notifyOnFailure: settings?.notifyOnFailure ?? true,
        } as BackupSettings,
      }),
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg
          className="text-primary h-8 w-8 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Backups */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="daily-enabled"
              checked={formData.dailyEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, dailyEnabled: checked === true })
              }
            />
            <Label htmlFor="daily-enabled" className="text-sm font-semibold">
              Daily Backups
            </Label>
          </div>
        </div>

        {formData.dailyEnabled && (
          <div className="ml-6 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="daily-time" className="text-sm">
                  Time (UTC)
                </Label>
                <Input
                  id="daily-time"
                  type="time"
                  value={formData.dailyTime}
                  onChange={(e) =>
                    setFormData({ ...formData, dailyTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-retention" className="text-sm">
                  Retention (days)
                </Label>
                <Input
                  id="daily-retention"
                  type="number"
                  min={1}
                  value={formData.dailyRetention}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dailyRetention: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Backups */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="weekly-enabled"
              checked={formData.weeklyEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, weeklyEnabled: checked === true })
              }
            />
            <Label htmlFor="weekly-enabled" className="text-sm font-semibold">
              Weekly Backups
            </Label>
          </div>
        </div>

        {formData.weeklyEnabled && (
          <div className="ml-6 space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weekly-day" className="text-sm">
                  Day
                </Label>
                <Select
                  value={formData.weeklyDay?.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, weeklyDay: parseInt(value, 10) })
                  }
                >
                  <SelectTrigger id="weekly-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekly-time" className="text-sm">
                  Time (UTC)
                </Label>
                <Input
                  id="weekly-time"
                  type="time"
                  value={formData.weeklyTime}
                  onChange={(e) =>
                    setFormData({ ...formData, weeklyTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekly-retention" className="text-sm">
                  Retention (weeks)
                </Label>
                <Input
                  id="weekly-retention"
                  type="number"
                  min={1}
                  value={formData.weeklyRetention}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weeklyRetention: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Backups */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="monthly-enabled"
              checked={formData.monthlyEnabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, monthlyEnabled: checked === true })
              }
            />
            <Label htmlFor="monthly-enabled" className="text-sm font-semibold">
              Monthly Backups
            </Label>
          </div>
        </div>

        {formData.monthlyEnabled && (
          <div className="ml-6 space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly-day" className="text-sm">
                  Day (1-28)
                </Label>
                <Input
                  id="monthly-day"
                  type="number"
                  min={1}
                  max={28}
                  value={formData.monthlyDay}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthlyDay: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-time" className="text-sm">
                  Time (UTC)
                </Label>
                <Input
                  id="monthly-time"
                  type="time"
                  value={formData.monthlyTime}
                  onChange={(e) =>
                    setFormData({ ...formData, monthlyTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-retention" className="text-sm">
                  Retention (months)
                </Label>
                <Input
                  id="monthly-retention"
                  type="number"
                  min={1}
                  value={formData.monthlyRetention}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthlyRetention: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="space-y-3 border-t pt-4">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
            Settings saved successfully!
          </div>
        )}
      </div>
    </div>
  );
}
