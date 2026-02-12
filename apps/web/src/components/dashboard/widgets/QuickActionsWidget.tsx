"use client";

import { Link } from "@tanstack/react-router";
import { Search, Settings, Share2, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@vamsa/ui";
import { BaseWidget } from "./BaseWidget";
import type { WidgetProps } from "./types";

/**
 * Quick Actions Widget
 *
 * Displays a grid of action buttons for common tasks.
 */
export function QuickActionsWidget({
  config,
  onRemove,
  className,
}: WidgetProps) {
  const { t } = useTranslation(["dashboard", "common"]);

  return (
    <BaseWidget config={config} onRemove={onRemove} className={className}>
      <div className="grid h-full grid-cols-2 gap-3 p-1">
        <Button
          variant="outline"
          className="bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/40 text-primary flex h-full flex-col items-center justify-center gap-2 space-y-0 rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          asChild
        >
          <Link to="/people/new">
            <div className="bg-primary/10 mb-1 flex h-10 w-10 items-center justify-center rounded-full">
              <UserPlus className="h-5 w-5" />
            </div>
            <span className="font-display text-base font-medium">
              {t("dashboard:addPerson")}
            </span>
          </Link>
        </Button>

        <Button
          variant="outline"
          className="bg-secondary/5 hover:bg-secondary/10 border-secondary/20 hover:border-secondary/40 text-secondary-foreground flex h-full flex-col items-center justify-center gap-2 space-y-0 rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          asChild
        >
          <Link to="/visualize">
            <div className="bg-secondary/10 mb-1 flex h-10 w-10 items-center justify-center rounded-full">
              <Share2 className="h-5 w-5" />
            </div>
            <span className="font-display text-base font-medium">
              {t("dashboard:visualize")}
            </span>
          </Link>
        </Button>

        <Button
          variant="outline"
          className="hover:bg-muted/50 border-border/50 flex h-full flex-col items-center justify-center gap-2 space-y-0 rounded-xl transition-all duration-300 hover:shadow-sm"
          asChild
        >
          <Link to="/people">
            <Search className="text-muted-foreground mb-1 h-5 w-5" />
            <span className="text-muted-foreground text-sm font-medium">
              {t("dashboard:fullSearch")}
            </span>
          </Link>
        </Button>

        <Button
          variant="outline"
          className="hover:bg-muted/50 border-border/50 flex h-full flex-col items-center justify-center gap-2 space-y-0 rounded-xl transition-all duration-300 hover:shadow-sm"
          asChild
        >
          <Link to="/settings/profile">
            <Settings className="text-muted-foreground mb-1 h-5 w-5" />
            <span className="text-muted-foreground text-sm font-medium">
              {t("dashboard:settings")}
            </span>
          </Link>
        </Button>
      </div>
    </BaseWidget>
  );
}
