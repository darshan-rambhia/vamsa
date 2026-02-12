"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@vamsa/ui";
import {
  getDashboardPreferences,
  resetDashboardPreferences,
  saveDashboardPreferences,
} from "../../server/dashboard-preferences";
import { DashboardGrid } from "./DashboardGrid";
import { AddWidgetModal } from "./AddWidgetModal";
import { getAllWidgets } from "./widget-registry";
import type { WidgetConfig } from "@vamsa/schemas";

// Generate unique IDs for new widgets
function generateWidgetId(): string {
  return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Configurable Dashboard Component
 *
 * Provides a fully customizable dashboard experience with:
 * - Widget grid layout (drag-and-drop)
 * - Add/remove widgets
 * - Persist preferences to server
 * - Edit mode toggle
 */
export function ConfigurableDashboard() {
  const { t } = useTranslation(["dashboard", "common"]);
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch user's dashboard preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["dashboard-preferences"],
    queryFn: () => getDashboardPreferences(),
  });

  // Mutation to save preferences
  const saveMutation = useMutation({
    mutationFn: saveDashboardPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-preferences"] });
    },
  });

  // Mutation to reset preferences
  const resetMutation = useMutation({
    mutationFn: resetDashboardPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-preferences"] });
    },
  });

  // Get current widgets from preferences or use defaults
  const widgets: Array<WidgetConfig> =
    preferences?.widgets ?? getDefaultWidgets();

  // Handle layout changes from grid
  const handleLayoutChange = useCallback(
    (
      newLayout: Array<{
        i: string;
        x: number;
        y: number;
        w: number;
        h: number;
      }>
    ) => {
      const updatedWidgets = widgets.map((widget) => {
        const layoutItem = newLayout.find((item) => item.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            position: { x: layoutItem.x, y: layoutItem.y },
            size: { w: layoutItem.w, h: layoutItem.h },
          };
        }
        return widget;
      });

      saveMutation.mutate({
        data: {
          widgets: updatedWidgets,
        },
      });
    },
    [widgets, saveMutation]
  );

  // Handle widget removal
  const handleWidgetRemove = useCallback(
    (widgetId: string) => {
      const updatedWidgets = widgets.filter((w) => w.id !== widgetId);
      saveMutation.mutate({
        data: {
          widgets: updatedWidgets,
        },
      });
    },
    [widgets, saveMutation]
  );

  // Handle widget settings change
  const handleWidgetSettingsChange = useCallback(
    (widgetId: string, updatedConfig: WidgetConfig) => {
      const updatedWidgets = widgets.map((w) =>
        w.id === widgetId ? updatedConfig : w
      );
      saveMutation.mutate({
        data: {
          widgets: updatedWidgets,
        },
      });
    },
    [widgets, saveMutation]
  );

  // Handle adding a new widget
  const handleAddWidget = useCallback(
    (widgetType: string) => {
      const widgetDef = getAllWidgets().find((w) => w.type === widgetType);
      if (!widgetDef) return;

      // Find next available position
      const maxY = widgets.reduce(
        (max, w) => Math.max(max, w.position.y + w.size.h),
        0
      );

      const newWidget: WidgetConfig = {
        id: generateWidgetId(),
        type: widgetType,
        title: widgetDef.name,
        size: widgetDef.defaultSize,
        position: { x: 0, y: maxY },
        settings: widgetDef.defaultSettings,
      };

      saveMutation.mutate({
        data: {
          widgets: [...widgets, newWidget],
        },
      });
    },
    [widgets, saveMutation]
  );

  // Handle reset to defaults
  const handleReset = useCallback(() => {
    if (confirm(t("dashboard:resetDefaultConfirm"))) {
      resetMutation.mutate({});
    }
  }, [resetMutation, t]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">
          {t("dashboard:loadingDashboard")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            {isEditing ? t("dashboard:doneEditing") : t("dashboard:customize")}
          </Button>
          {isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("dashboard:addWidget")}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                {t("dashboard:resetToDefault")}
              </Button>
            </>
          )}
        </div>
        {saveMutation.isPending && (
          <span className="text-muted-foreground text-sm">
            {t("dashboard:saving")}
          </span>
        )}
      </div>

      {/* Widget Grid */}
      {widgets.length === 0 ? (
        <div className="border-border flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground mb-4">
            {t("dashboard:noWidgetsDashboard")}
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("dashboard:addYourFirstWidget")}
          </Button>
        </div>
      ) : (
        <DashboardGrid
          widgets={widgets}
          onLayoutChange={handleLayoutChange}
          onWidgetRemove={handleWidgetRemove}
          onWidgetSettingsChange={handleWidgetSettingsChange}
          isEditable={isEditing}
        />
      )}

      {/* Add Widget Modal */}
      <AddWidgetModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAddWidget={handleAddWidget}
        existingWidgetTypes={widgets.map((w) => w.type)}
      />
    </div>
  );
}

/**
 * Get default widgets for new users
 */
function getDefaultWidgets(): Array<WidgetConfig> {
  return [
    {
      id: "default-stats",
      type: "people_statistics",
      title: "Family Statistics",
      size: { w: 2, h: 2 },
      position: { x: 0, y: 0 },
      settings: { showChart: true, recentDays: 7 },
    },
    {
      id: "default-calendar",
      type: "calendar",
      title: "Upcoming Events",
      size: { w: 2, h: 3 },
      position: { x: 2, y: 0 },
      settings: {
        showBirthdays: true,
        showAnniversaries: true,
        showDeaths: false,
        monthsAhead: 3,
      },
    },
    {
      id: "default-activity",
      type: "recent_activity",
      title: "Recent Activity",
      size: { w: 2, h: 2 },
      position: { x: 0, y: 2 },
      settings: { maxItems: 10, showUser: true, filterTypes: [] },
    },
    {
      id: "default-actions",
      type: "quick_actions",
      title: "Quick Actions",
      size: { w: 2, h: 2 },
      position: { x: 2, y: 3 },
      settings: {},
    },
  ];
}
