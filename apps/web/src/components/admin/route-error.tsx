import { type ErrorComponentProps } from "@tanstack/react-router";
import { CompactRouteError } from "~/components/error";

/**
 * Reusable error component for admin child routes.
 * Shows a user-friendly error message within the admin layout,
 * keeping tabs visible so users can navigate to other sections.
 */
export function AdminRouteError(props: ErrorComponentProps) {
  return <CompactRouteError {...props} />;
}
