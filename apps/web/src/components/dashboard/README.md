# Dashboard Widget System

This directory contains the widget registry and plugin system for the Vamsa dashboard.

## Architecture

The widget system consists of three main parts:

1. **Widget Types** (`widgets/types.ts`) - TypeScript interfaces for widgets
2. **Widget Registry** (`widget-registry.ts`) - Central registry for managing widgets
3. **Base Widget** (`widgets/BaseWidget.tsx`) - Common wrapper component

## Quick Start

### 1. Create a Widget Component

```tsx
// src/components/dashboard/widgets/CalendarWidget.tsx
"use client";

import type { WidgetProps } from "./types";

export function CalendarWidget({
  config,
  onConfigChange,
  onRemove,
}: WidgetProps) {
  return (
    <div>
      <h3>Calendar Widget</h3>
      <p>Settings: {JSON.stringify(config.settings)}</p>
    </div>
  );
}
```

### 2. Register the Widget

```tsx
// src/components/dashboard/widgets/register-widgets.ts
import { registerWidget } from "../widget-registry";
import { CalendarWidget } from "./CalendarWidget";

export function registerAllWidgets() {
  registerWidget({
    type: "calendar",
    name: "Calendar",
    description: "Monthly calendar view with upcoming events",
    icon: "Calendar", // Lucide icon name
    component: CalendarWidget,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
  });
}
```

### 3. Use in Dashboard

```tsx
// src/routes/_authenticated/dashboard.tsx
import { useEffect } from "react";
import { registerAllWidgets } from "@/components/dashboard/widgets/register-widgets";
import { getWidget } from "@/components/dashboard";
import { BaseWidget } from "@/components/dashboard/widgets";

export default function Dashboard() {
  useEffect(() => {
    registerAllWidgets();
  }, []);

  const widgetDef = getWidget("calendar");
  if (!widgetDef) return null;

  const WidgetComponent = widgetDef.component;

  const config = {
    id: "widget-1",
    type: "calendar",
    title: "My Calendar",
    size: { w: 2, h: 2 },
    position: { x: 0, y: 0 },
  };

  return (
    <BaseWidget
      config={config}
      onSettings={() => console.log("Settings clicked")}
      onRemove={() => console.log("Remove clicked")}
    >
      <WidgetComponent
        config={config}
        onConfigChange={(updates) => console.log("Config changed:", updates)}
        onRemove={() => console.log("Remove from widget")}
      />
    </BaseWidget>
  );
}
```

## Widget Registry API

### `registerWidget(widget: WidgetDefinition)`

Registers a new widget type.

```tsx
registerWidget({
  type: "calendar", // Unique identifier
  name: "Calendar", // Display name
  description: "Monthly calendar view",
  icon: "Calendar", // Lucide icon name
  component: CalendarWidget,
  defaultSize: { w: 2, h: 2 },
  minSize: { w: 1, h: 1 }, // Optional
  maxSize: { w: 4, h: 4 }, // Optional
  settingsSchema: z.object({
    // Optional Zod schema
    view: z.enum(["month", "week", "day"]),
  }),
  defaultSettings: {
    // Optional default settings
    view: "month",
  },
});
```

### `getWidget(type: string)`

Retrieves a widget definition by type.

```tsx
const widget = getWidget("calendar");
if (widget) {
  const Component = widget.component;
}
```

### `getAllWidgets()`

Gets all registered widgets.

```tsx
const widgets = getAllWidgets();
widgets.forEach((widget) => {
  console.log(widget.name);
});
```

### `unregisterWidget(type: string)`

Removes a widget from the registry (useful for testing).

```tsx
const removed = unregisterWidget("calendar");
```

### `hasWidget(type: string)`

Checks if a widget is registered.

```tsx
if (hasWidget("calendar")) {
  // Widget is available
}
```

## BaseWidget Component

The `BaseWidget` component provides consistent UI chrome for all widgets:

- **Title bar** with widget title
- **Settings button** (gear icon) - optional
- **Remove button** (X icon) - optional
- **Refresh button** (refresh icon) - optional
- **Loading state** with spinner
- **Error state** with error message and retry
- **Error boundary** for crash protection

### Props

```tsx
interface BaseWidgetProps {
  config: WidgetConfig; // Widget configuration
  children: ReactNode; // Widget content
  isLoading?: boolean; // Show loading spinner
  error?: Error | null; // Show error state
  onSettings?: () => void; // Settings button handler
  onRemove?: () => void; // Remove button handler
  onRefresh?: () => void; // Refresh button handler
  className?: string; // Additional CSS classes
}
```

### Example with Loading/Error States

```tsx
function MyDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchData()
      .then(() => setIsLoading(false))
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, []);

  return (
    <BaseWidget
      config={config}
      isLoading={isLoading}
      error={error}
      onRefresh={() => window.location.reload()}
      onSettings={() => setShowSettings(true)}
      onRemove={() => removeWidget(config.id)}
    >
      <MyWidgetContent />
    </BaseWidget>
  );
}
```

## Widget Size Constraints

Widget sizes are defined in grid units:

- **defaultSize**: Initial size when adding widget to dashboard
- **minSize**: Minimum allowed size (optional)
- **maxSize**: Maximum allowed size (optional)

Example:

```tsx
{
  defaultSize: { w: 2, h: 2 },  // 2 columns × 2 rows
  minSize: { w: 1, h: 1 },      // Can shrink to 1×1
  maxSize: { w: 4, h: 4 },      // Can expand to 4×4
}
```

## Widget Settings Schema

Use Zod schemas to validate widget-specific settings:

```tsx
import { z } from "zod";

const calendarSettingsSchema = z.object({
  view: z.enum(["month", "week", "day"]),
  showWeekends: z.boolean(),
  firstDayOfWeek: z.number().min(0).max(6),
});

registerWidget({
  type: "calendar",
  // ...
  settingsSchema: calendarSettingsSchema,
  defaultSettings: {
    view: "month",
    showWeekends: true,
    firstDayOfWeek: 0,
  },
});
```

## Best Practices

1. **Register widgets once** - Call `registerAllWidgets()` in a top-level effect
2. **Use BaseWidget** - Always wrap widget content in `BaseWidget` for consistency
3. **Handle loading/error states** - Use `isLoading` and `error` props
4. **Validate settings** - Define `settingsSchema` for type-safe settings
5. **Size constraints** - Define realistic min/max sizes
6. **Accessibility** - BaseWidget includes ARIA labels and keyboard support
7. **Error boundaries** - BaseWidget includes error boundary for crash protection

## File Structure

```
dashboard/
├── widget-registry.ts           # Widget registry singleton
├── index.ts                     # Main exports
├── README.md                    # This file
└── widgets/
    ├── types.ts                 # TypeScript interfaces
    ├── index.ts                 # Widget exports
    ├── BaseWidget.tsx           # Base wrapper component
    ├── register-widgets.ts      # Widget registration (create this)
    ├── CalendarWidget.tsx       # Example widget (create this)
    ├── QuickActionsWidget.tsx   # Example widget (create this)
    └── ...                      # More widgets
```

## Next Steps

1. Create concrete widget implementations (CalendarWidget, QuickActionsWidget, etc.)
2. Create `register-widgets.ts` to register all widgets
3. Integrate with dashboard grid layout
4. Add widget settings modal
5. Add widget catalog/picker UI
6. Persist widget configurations to user preferences
