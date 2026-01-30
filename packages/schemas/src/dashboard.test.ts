/**
 * Unit Tests for Dashboard Schemas
 * Tests Zod schema validation for dashboard configuration and preferences
 */
import { describe, expect, it } from "bun:test";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_DASHBOARD_WIDGETS,
  dashboardLayoutSchema,
  dashboardPreferencesSchema,
  saveDashboardPreferencesSchema,
  widgetConfigSchema,
  widgetPositionSchema,
  widgetSizeSchema,
} from "./dashboard";
import type {
  DashboardLayout,
  DashboardPreferences,
  SaveDashboardPreferencesInput,
  WidgetConfig,
  WidgetPosition,
  WidgetSize,
} from "./dashboard";

describe("widgetSizeSchema", () => {
  describe("Valid inputs", () => {
    it("should validate minimum size (1x1)", () => {
      const size: WidgetSize = { w: 1, h: 1 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(true);
    });

    it("should validate maximum size (12x12)", () => {
      const size = { w: 12, h: 12 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(true);
    });

    it("should validate mid-range sizes", () => {
      const sizes = [
        { w: 2, h: 2 },
        { w: 4, h: 3 },
        { w: 6, h: 8 },
      ];

      sizes.forEach((size) => {
        const result = widgetSizeSchema.safeParse(size);
        expect(result.success).toBe(true);
      });
    });

    it("should accept asymmetric sizes", () => {
      const size = { w: 3, h: 10 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(true);
    });
  });

  describe("Width validation", () => {
    it("should reject width less than 1", () => {
      const size = { w: 0, h: 2 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(false);
    });

    it("should reject negative width", () => {
      const size = { w: -1, h: 2 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(false);
    });

    it("should reject width greater than 12", () => {
      const size = { w: 13, h: 2 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer width", () => {
      const size = { w: 2.5, h: 2 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(false);
    });

    it("should reject missing width", () => {
      const size = { h: 2 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(false);
    });
  });

  describe("Height validation", () => {
    it("should reject height less than 1", () => {
      const size = { w: 2, h: 0 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(false);
    });

    it("should reject negative height", () => {
      const size = { w: 2, h: -1 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(false);
    });

    it("should reject height greater than 12", () => {
      const size = { w: 2, h: 13 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer height", () => {
      const size = { w: 2, h: 2.5 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(false);
    });

    it("should reject missing height", () => {
      const size = { w: 2 };
      const result = widgetSizeSchema.safeParse(size);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct widget size type", () => {
      const size: WidgetSize = { w: 2, h: 3 };
      expect(size.w).toBe(2);
      expect(size.h).toBe(3);
    });
  });
});

describe("widgetPositionSchema", () => {
  describe("Valid inputs", () => {
    it("should validate position (0,0)", () => {
      const position: WidgetPosition = { x: 0, y: 0 };
      const result = widgetPositionSchema.safeParse(position);
      expect(result.success).toBe(true);
    });

    it("should validate positive positions", () => {
      const positions = [
        { x: 1, y: 1 },
        { x: 5, y: 10 },
        { x: 100, y: 200 },
      ];

      positions.forEach((pos) => {
        const result = widgetPositionSchema.safeParse(pos);
        expect(result.success).toBe(true);
      });
    });

    it("should validate large coordinates", () => {
      const position = { x: 1000, y: 5000 };
      const result = widgetPositionSchema.safeParse(position);
      expect(result.success).toBe(true);
    });
  });

  describe("X coordinate validation", () => {
    it("should reject negative x", () => {
      const position = { x: -1, y: 0 };
      const result = widgetPositionSchema.safeParse(position);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer x", () => {
      const position = { x: 1.5, y: 0 };
      const result = widgetPositionSchema.safeParse(position);
      expect(result.success).toBe(false);
    });

    it("should reject missing x", () => {
      const position = { y: 0 };
      const result = widgetPositionSchema.safeParse(position);
      expect(result.success).toBe(false);
    });
  });

  describe("Y coordinate validation", () => {
    it("should reject negative y", () => {
      const position = { x: 0, y: -1 };
      const result = widgetPositionSchema.safeParse(position);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer y", () => {
      const position = { x: 0, y: 1.5 };
      const result = widgetPositionSchema.safeParse(position);
      expect(result.success).toBe(false);
    });

    it("should reject missing y", () => {
      const position = { x: 0 };
      const result = widgetPositionSchema.safeParse(position);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct widget position type", () => {
      const position: WidgetPosition = { x: 2, y: 3 };
      expect(position.x).toBe(2);
      expect(position.y).toBe(3);
    });
  });
});

describe("widgetConfigSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete widget configuration", () => {
      const config: WidgetConfig = {
        id: "widget-1",
        type: "chart",
        title: "Statistics",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
        settings: {
          showLabels: true,
          dataPoints: 10,
          theme: "light",
        },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should validate minimal widget configuration", () => {
      const config = {
        id: "widget-1",
        type: "chart",
        title: "Stats",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should accept widget with empty settings", () => {
      const config = {
        id: "widget-1",
        type: "chart",
        title: "Stats",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
        settings: {},
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should accept widget with any settings values", () => {
      const config = {
        id: "widget-1",
        type: "chart",
        title: "Stats",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
        settings: {
          string: "value",
          number: 123,
          boolean: true,
          null: null,
          object: { nested: "value" },
          array: [1, 2, 3],
        },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("ID validation", () => {
    it("should reject missing id", () => {
      const config = {
        type: "chart",
        title: "Stats",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject empty id", () => {
      const config = {
        id: "",
        type: "chart",
        title: "Stats",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should accept single character id", () => {
      const config = {
        id: "w",
        type: "chart",
        title: "Stats",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("Type validation", () => {
    it("should reject missing type", () => {
      const config = {
        id: "widget-1",
        title: "Stats",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject empty type", () => {
      const config = {
        id: "widget-1",
        type: "",
        title: "Stats",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should accept any non-empty type string", () => {
      const types = ["chart", "people_statistics", "calendar", "custom_widget"];

      types.forEach((type) => {
        const config = {
          id: "widget-1",
          type,
          title: "Stats",
          size: { w: 2, h: 2 },
          position: { x: 0, y: 0 },
        };

        const result = widgetConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Title validation", () => {
    it("should reject missing title", () => {
      const config = {
        id: "widget-1",
        type: "chart",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject empty title", () => {
      const config = {
        id: "widget-1",
        type: "chart",
        title: "",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should accept single character title", () => {
      const config = {
        id: "widget-1",
        type: "chart",
        title: "S",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should accept title up to 100 characters", () => {
      const config = {
        id: "widget-1",
        type: "chart",
        title: "T".repeat(100),
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject title exceeding 100 characters", () => {
      const config = {
        id: "widget-1",
        type: "chart",
        title: "T".repeat(101),
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      const result = widgetConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct widget config type", () => {
      const config: WidgetConfig = {
        id: "widget-1",
        type: "chart",
        title: "Stats",
        size: { w: 2, h: 2 },
        position: { x: 0, y: 0 },
      };

      expect(config.id).toBe("widget-1");
    });
  });
});

describe("dashboardLayoutSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete layout", () => {
      const layout: DashboardLayout = {
        columns: 4,
        theme: "auto",
        density: "normal",
      };

      const result = dashboardLayoutSchema.safeParse(layout);
      expect(result.success).toBe(true);
    });

    it("should use default values when empty object", () => {
      const result = dashboardLayoutSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.columns).toBe(4);
        expect(result.data.theme).toBe("auto");
        expect(result.data.density).toBe("normal");
      }
    });

    it("should accept all valid themes", () => {
      const themes = ["light", "dark", "auto"] as const;

      themes.forEach((theme) => {
        const layout = { columns: 4, theme };
        const result = dashboardLayoutSchema.safeParse(layout);
        expect(result.success).toBe(true);
      });
    });

    it("should accept all valid densities", () => {
      const densities = ["compact", "normal", "spacious"] as const;

      densities.forEach((density) => {
        const layout = { columns: 4, density };
        const result = dashboardLayoutSchema.safeParse(layout);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Columns validation", () => {
    it("should accept minimum columns (1)", () => {
      const layout = { columns: 1 };
      const result = dashboardLayoutSchema.safeParse(layout);
      expect(result.success).toBe(true);
    });

    it("should accept maximum columns (12)", () => {
      const layout = { columns: 12 };
      const result = dashboardLayoutSchema.safeParse(layout);
      expect(result.success).toBe(true);
    });

    it("should accept mid-range columns", () => {
      const columnCounts = [2, 4, 6, 8, 10];

      columnCounts.forEach((cols) => {
        const layout = { columns: cols };
        const result = dashboardLayoutSchema.safeParse(layout);
        expect(result.success).toBe(true);
      });
    });

    it("should reject columns less than 1", () => {
      const layout = { columns: 0 };
      const result = dashboardLayoutSchema.safeParse(layout);
      expect(result.success).toBe(false);
    });

    it("should reject columns greater than 12", () => {
      const layout = { columns: 13 };
      const result = dashboardLayoutSchema.safeParse(layout);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer columns", () => {
      const layout = { columns: 4.5 };
      const result = dashboardLayoutSchema.safeParse(layout);
      expect(result.success).toBe(false);
    });
  });

  describe("Theme validation", () => {
    it("should reject invalid theme", () => {
      const layout = { columns: 4, theme: "neon" as any };
      const result = dashboardLayoutSchema.safeParse(layout);
      expect(result.success).toBe(false);
    });

    it("should reject lowercase theme", () => {
      const layout = { columns: 4, theme: "LIGHT" as any };
      const result = dashboardLayoutSchema.safeParse(layout);
      expect(result.success).toBe(false);
    });
  });

  describe("Density validation", () => {
    it("should reject invalid density", () => {
      const layout = { columns: 4, density: "wide" as any };
      const result = dashboardLayoutSchema.safeParse(layout);
      expect(result.success).toBe(false);
    });

    it("should reject lowercase density", () => {
      const layout = { columns: 4, density: "COMPACT" as any };
      const result = dashboardLayoutSchema.safeParse(layout);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct dashboard layout type", () => {
      const layout: DashboardLayout = {
        columns: 4,
        theme: "auto",
        density: "normal",
      };

      expect(layout.columns).toBe(4);
    });
  });
});

describe("dashboardPreferencesSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete preferences", () => {
      const prefs: DashboardPreferences = {
        layout: {
          columns: 4,
          theme: "light",
          density: "normal",
        },
        widgets: [
          {
            id: "w1",
            type: "chart",
            title: "Stats",
            size: { w: 2, h: 2 },
            position: { x: 0, y: 0 },
          },
        ],
      };

      const result = dashboardPreferencesSchema.safeParse(prefs);
      expect(result.success).toBe(true);
    });

    it("should use defaults when layout is empty object", () => {
      const result = dashboardPreferencesSchema.safeParse({
        layout: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.layout.columns).toBe(4);
        expect(result.data.widgets).toEqual([]);
      }
    });

    it("should accept multiple widgets", () => {
      const prefs = {
        layout: {
          columns: 4,
          theme: "auto",
          density: "normal",
        },
        widgets: [
          {
            id: "w1",
            type: "stats",
            title: "Stats",
            size: { w: 2, h: 2 },
            position: { x: 0, y: 0 },
          },
          {
            id: "w2",
            type: "calendar",
            title: "Events",
            size: { w: 2, h: 3 },
            position: { x: 2, y: 0 },
          },
        ],
      };

      const result = dashboardPreferencesSchema.safeParse(prefs);
      expect(result.success).toBe(true);
    });

    it("should accept empty widgets array", () => {
      const prefs = {
        layout: {
          columns: 4,
          theme: "dark",
          density: "compact",
        },
        widgets: [],
      };

      const result = dashboardPreferencesSchema.safeParse(prefs);
      expect(result.success).toBe(true);
    });
  });

  describe("Layout validation", () => {
    it("should reject missing layout", () => {
      const prefs = {
        widgets: [],
      };

      const result = dashboardPreferencesSchema.safeParse(prefs);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct dashboard preferences type", () => {
      const prefs: DashboardPreferences = {
        layout: {
          columns: 4,
          theme: "auto",
          density: "normal",
        },
        widgets: [],
      };

      expect(prefs.layout.columns).toBe(4);
    });
  });
});

describe("saveDashboardPreferencesSchema", () => {
  describe("Valid inputs", () => {
    it("should accept empty object", () => {
      const save: SaveDashboardPreferencesInput = {};
      const result = saveDashboardPreferencesSchema.safeParse(save);
      expect(result.success).toBe(true);
    });

    it("should accept partial layout update", () => {
      const save = {
        layout: {
          theme: "dark",
        },
      };

      const result = saveDashboardPreferencesSchema.safeParse(save);
      expect(result.success).toBe(true);
    });

    it("should accept new widgets array", () => {
      const save = {
        widgets: [
          {
            id: "w1",
            type: "chart",
            title: "New Widget",
            size: { w: 2, h: 2 },
            position: { x: 0, y: 0 },
          },
        ],
      };

      const result = saveDashboardPreferencesSchema.safeParse(save);
      expect(result.success).toBe(true);
    });

    it("should accept both layout and widgets", () => {
      const save = {
        layout: {
          columns: 6,
          theme: "light",
        },
        widgets: [
          {
            id: "w1",
            type: "stats",
            title: "Statistics",
            size: { w: 3, h: 2 },
            position: { x: 0, y: 0 },
          },
        ],
      };

      const result = saveDashboardPreferencesSchema.safeParse(save);
      expect(result.success).toBe(true);
    });

    it("should accept empty widgets array", () => {
      const save = { widgets: [] };
      const result = saveDashboardPreferencesSchema.safeParse(save);
      expect(result.success).toBe(true);
    });
  });

  describe("Layout partial validation", () => {
    it("should accept only theme change", () => {
      const save = {
        layout: { theme: "dark" as const },
      };

      const result = saveDashboardPreferencesSchema.safeParse(save);
      expect(result.success).toBe(true);
    });

    it("should accept only density change", () => {
      const save = {
        layout: { density: "spacious" as const },
      };

      const result = saveDashboardPreferencesSchema.safeParse(save);
      expect(result.success).toBe(true);
    });

    it("should accept only columns change", () => {
      const save = {
        layout: { columns: 8 },
      };

      const result = saveDashboardPreferencesSchema.safeParse(save);
      expect(result.success).toBe(true);
    });
  });

  describe("Invalid inputs", () => {
    it("should reject invalid theme in layout", () => {
      const save = {
        layout: { theme: "neon" as any },
      };

      const result = saveDashboardPreferencesSchema.safeParse(save);
      expect(result.success).toBe(false);
    });

    it("should reject invalid widget config", () => {
      const save = {
        widgets: [
          {
            id: "",
            type: "chart",
            title: "Widget",
            size: { w: 2, h: 2 },
            position: { x: 0, y: 0 },
          },
        ],
      };

      const result = saveDashboardPreferencesSchema.safeParse(save);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct save preferences input type", () => {
      const save: SaveDashboardPreferencesInput = {
        layout: {
          theme: "dark",
        },
      };

      expect(save.layout?.theme).toBe("dark");
    });
  });
});

describe("Default exports", () => {
  it("should have correct default layout", () => {
    expect(DEFAULT_DASHBOARD_LAYOUT.columns).toBe(4);
    expect(DEFAULT_DASHBOARD_LAYOUT.theme).toBe("auto");
    expect(DEFAULT_DASHBOARD_LAYOUT.density).toBe("normal");
  });

  it("should have default widgets", () => {
    expect(Array.isArray(DEFAULT_DASHBOARD_WIDGETS)).toBe(true);
    expect(DEFAULT_DASHBOARD_WIDGETS.length).toBe(4);
  });

  it("default widgets should have correct structure", () => {
    const defaultWidgets = DEFAULT_DASHBOARD_WIDGETS;

    defaultWidgets.forEach((widget) => {
      expect(widget.id).toBeTruthy();
      expect(widget.type).toBeTruthy();
      expect(widget.title).toBeTruthy();
      expect(widget.size).toBeTruthy();
      expect(widget.position).toBeTruthy();
      expect(widget.size.w).toBeGreaterThanOrEqual(1);
      expect(widget.size.h).toBeGreaterThanOrEqual(1);
      expect(widget.position.x).toBeGreaterThanOrEqual(0);
      expect(widget.position.y).toBeGreaterThanOrEqual(0);
    });
  });

  it("default widgets should pass validation", () => {
    const result = dashboardPreferencesSchema.safeParse({
      layout: DEFAULT_DASHBOARD_LAYOUT,
      widgets: DEFAULT_DASHBOARD_WIDGETS,
    });

    expect(result.success).toBe(true);
  });
});
