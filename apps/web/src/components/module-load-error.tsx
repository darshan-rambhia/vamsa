import { useEffect, useState } from "react";
import { ErrorComponent } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { isModuleLoadError, tryAutoReload } from "~/lib/module-load-recovery";

/** Shown when a lazy route chunk fails to load and the auto-reload was spent. */
export function ModuleLoadError() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!tryAutoReload()) setBlocked(true);
  }, []);

  if (!blocked) return null;

  return (
    <div
      role="alert"
      className="bg-background flex min-h-screen flex-col items-center justify-center px-4 text-center"
    >
      <h1 className="font-display text-2xl font-semibold">
        Vamsa couldn&apos;t finish loading
      </h1>
      <p className="text-muted-foreground mt-2 max-w-sm">
        Part of the page failed to load. Check your connection and reload.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 rounded-md px-5 py-2.5 text-sm font-medium transition-colors"
      >
        Reload
      </button>
    </div>
  );
}

/** Router defaultErrorComponent: module-load aware, else TanStack default. */
export function DefaultRouteError(props: ErrorComponentProps) {
  if (isModuleLoadError(props.error)) return <ModuleLoadError />;
  return <ErrorComponent {...props} />;
}
