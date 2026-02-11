import type { ReactNode } from "react";
import type { z } from "zod";

/**
 * Widget configuration stored in user preferences/database
 */
export interface WidgetConfig {
  /** Unique identifier for this widget instance */
  id: string;
  /** Widget type identifier (maps to WidgetDefinition.type) */
  type: string;
  /** Display title for the widget */
  title: string;
  /** Widget size in grid units */
  size: { w: number; h: number };
  /** Widget position in grid units */
  position: { x: number; y: number };
  /** Widget-specific settings */
  settings?: Record<string, unknown>;
}

/**
 * Props passed to widget components
 */
export interface WidgetProps {
  /** Current widget configuration */
  config: WidgetConfig;
  /** Callback to update widget configuration */
  onConfigChange: (config: Partial<WidgetConfig>) => void;
  /** Callback to remove this widget from dashboard */
  onRemove: () => void;
  /** Additional CSS classes (e.g. for drag handles) */
  className?: string;
}

/**
 * Widget definition registered in the widget registry
 */
export interface WidgetDefinition {
  /** Unique widget type identifier */
  type: string;
  /** Display name for widget catalog */
  name: string;
  /** Description shown in widget catalog */
  description: string;
  /** Lucide icon name (e.g., "Calendar", "Users") */
  icon: string;
  /** React component to render the widget */
  component: React.ComponentType<WidgetProps>;
  /** Default size when adding to dashboard */
  defaultSize: { w: number; h: number };
  /** Minimum allowed size (optional) */
  minSize?: { w: number; h: number };
  /** Maximum allowed size (optional) */
  maxSize?: { w: number; h: number };
  /** Zod schema for widget-specific settings validation (optional) */
  settingsSchema?: z.ZodSchema;
  /** Default settings when adding to dashboard (optional) */
  defaultSettings?: Record<string, unknown>;
}

/**
 * Props for the BaseWidget wrapper component
 */
export interface BaseWidgetProps {
  /** Widget configuration */
  config: WidgetConfig;
  /** Widget content */
  children: ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Callback when settings button clicked */
  onSettings?: () => void;
  /** Callback when remove button clicked */
  onRemove?: () => void;
  /** Callback when refresh button clicked (optional) */
  onRefresh?: () => void;
  /** Additional CSS classes */
  className?: string;
}
