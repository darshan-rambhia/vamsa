import type { GlobalProvider } from "@ladle/react";
import "../src/styles.css";

export const Provider: GlobalProvider = ({ children }) => (
  <div className="bg-background text-foreground min-h-screen">{children}</div>
);
