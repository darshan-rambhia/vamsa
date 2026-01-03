import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, mock } from "bun:test";
import "@testing-library/jest-dom";

// Register happy-dom globals before anything else
GlobalRegistrator.register();

// Re-import cleanup after DOM is registered
const { cleanup } = await import("@testing-library/react");

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js navigation
mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mock(() => {}),
    replace: mock(() => {}),
    prefetch: mock(() => {}),
    back: mock(() => {}),
    forward: mock(() => {}),
    refresh: mock(() => {}),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  notFound: mock(() => {}),
  redirect: mock(() => {}),
}));

// Mock next-auth
mock.module("next-auth/react", () => ({
  useSession: () => ({
    data: null,
    status: "unauthenticated",
  }),
  signIn: mock(() => {}),
  signOut: mock(() => {}),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock window.matchMedia for components using media queries
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Mock ResizeObserver
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
