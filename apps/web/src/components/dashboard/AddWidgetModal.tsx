"use client";

import { useState } from "react";
import * as LucideIcons from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  cn,
} from "@vamsa/ui";
import { getAllWidgets } from "./widget-registry";

interface AddWidgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWidget: (widgetType: string) => void;
  /** List of widget types already on the dashboard (to show "already added" state) */
  existingWidgetTypes?: Array<string>;
}

/**
 * Modal for adding widgets to the dashboard
 *
 * Displays all available widgets from the registry with their
 * icons, names, and descriptions. Users can click to add a widget
 * to their dashboard.
 */
export function AddWidgetModal({
  open,
  onOpenChange,
  onAddWidget,
  existingWidgetTypes = [],
}: AddWidgetModalProps) {
  const widgets = getAllWidgets();
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  const handleAddWidget = () => {
    if (selectedWidget) {
      onAddWidget(selectedWidget);
      setSelectedWidget(null);
      onOpenChange(false);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = (
      LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>
    )[iconName];
    return Icon ? <Icon className="h-5 w-5" /> : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {widgets.map((widget) => {
            const isExisting = existingWidgetTypes.includes(widget.type);
            const isSelected = selectedWidget === widget.type;

            return (
              <button
                key={widget.type}
                type="button"
                onClick={() => !isExisting && setSelectedWidget(widget.type)}
                disabled={isExisting}
                className={cn(
                  "flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all",
                  isExisting
                    ? "border-border bg-muted/50 cursor-not-allowed opacity-60"
                    : isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-accent/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {getIcon(widget.icon)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{widget.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {widget.description}
                  </p>
                  {isExisting && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Already on dashboard
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddWidget} disabled={!selectedWidget}>
            Add Widget
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
