"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  Button,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Checkbox,
  cn,
} from "@vamsa/ui";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface ActivityFilters {
  dateFrom?: number;
  dateTo?: number;
  actionTypes: string[];
  entityTypes: string[];
  userId?: string;
  searchQuery: string;
}

interface ActivityFilterPanelProps {
  filters: ActivityFilters;
  onFiltersChange: (filters: ActivityFilters) => void;
  actionTypeOptions: FilterOption[];
  entityTypeOptions: FilterOption[];
  userOptions: FilterOption[];
  isLoading?: boolean;
}

// Predefined date range presets
const datePresets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This year", days: 365 },
  { label: "All time", days: 0 },
];

export function ActivityFilterPanel({
  filters,
  onFiltersChange,
  actionTypeOptions,
  entityTypeOptions,
  userOptions,
  isLoading = false,
}: ActivityFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDatePreset, setSelectedDatePreset] = useState<number | null>(
    7
  );

  // Count active filters
  const activeFilterCount =
    (filters.actionTypes.length > 0 ? 1 : 0) +
    (filters.entityTypes.length > 0 ? 1 : 0) +
    (filters.userId ? 1 : 0) +
    (filters.searchQuery ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0);

  // Handle date preset change
  const handleDatePreset = (days: number) => {
    setSelectedDatePreset(days);
    if (days === 0) {
      // All time
      onFiltersChange({
        ...filters,
        dateFrom: undefined,
        dateTo: undefined,
      });
    } else {
      const now = Date.now();
      const from = now - days * 24 * 60 * 60 * 1000;
      onFiltersChange({
        ...filters,
        dateFrom: from,
        dateTo: now,
      });
    }
  };

  // Handle action type toggle
  const toggleActionType = (actionType: string) => {
    const newTypes = filters.actionTypes.includes(actionType)
      ? filters.actionTypes.filter((t) => t !== actionType)
      : [...filters.actionTypes, actionType];
    onFiltersChange({ ...filters, actionTypes: newTypes });
  };

  // Handle entity type toggle
  const toggleEntityType = (entityType: string) => {
    const newTypes = filters.entityTypes.includes(entityType)
      ? filters.entityTypes.filter((t) => t !== entityType)
      : [...filters.entityTypes, entityType];
    onFiltersChange({ ...filters, entityTypes: newTypes });
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedDatePreset(7);
    onFiltersChange({
      dateFrom: Date.now() - 7 * 24 * 60 * 60 * 1000,
      dateTo: Date.now(),
      actionTypes: [],
      entityTypes: [],
      userId: undefined,
      searchQuery: "",
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* Collapsed Header */}
        <div className="flex items-center justify-between gap-4">
          {/* Search box - always visible */}
          <div className="relative max-w-md flex-1">
            <svg
              className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <Input
              type="text"
              placeholder="Search activity..."
              value={filters.searchQuery}
              onChange={(e) =>
                onFiltersChange({ ...filters, searchQuery: e.target.value })
              }
              className="pl-10"
            />
          </div>

          {/* Filter toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0"
          >
            <svg
              className={cn("mr-2 h-4 w-4", isExpanded && "rotate-180")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
              />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Clear filters - only when active */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="shrink-0"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {/* Date Range Presets */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Date Range</span>
              <div className="flex flex-wrap gap-2">
                {datePresets.map((preset) => (
                  <Button
                    key={preset.days}
                    variant={
                      selectedDatePreset === preset.days ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleDatePreset(preset.days)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Types */}
            {actionTypeOptions.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Action Type</span>
                <div className="flex flex-wrap gap-3">
                  {actionTypeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        checked={filters.actionTypes.includes(option.value)}
                        onCheckedChange={() => toggleActionType(option.value)}
                      />
                      <span className="text-sm">{option.label}</span>
                      {option.count !== undefined && (
                        <span className="text-muted-foreground text-xs">
                          ({option.count})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Entity Types */}
            {entityTypeOptions.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Entity Type</span>
                <div className="flex flex-wrap gap-3">
                  {entityTypeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        checked={filters.entityTypes.includes(option.value)}
                        onCheckedChange={() => toggleEntityType(option.value)}
                      />
                      <span className="text-sm">{option.label}</span>
                      {option.count !== undefined && (
                        <span className="text-muted-foreground text-xs">
                          ({option.count})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* User Filter */}
            {userOptions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="user-filter">User</Label>
                <Select
                  value={filters.userId ?? "all"}
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      userId: value === "all" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger id="user-filter" className="w-50">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {userOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isLoading && (
              <div className="text-muted-foreground text-sm">
                Loading filter options...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
