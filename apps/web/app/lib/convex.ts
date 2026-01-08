import { ConvexReactClient } from "convex/react";

// Create a Convex client that connects to the self-hosted backend
const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "http://localhost:3210";

export const convex = new ConvexReactClient(convexUrl);
