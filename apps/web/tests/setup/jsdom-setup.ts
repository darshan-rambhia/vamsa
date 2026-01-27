/* istanbul ignore file */
/**
 * JSDOM Setup for @vamsa/web Tests
 *
 * Provides a DOM environment for React component testing with @testing-library/react.
 * This setup is automatically preloaded by bunfig.toml before tests run.
 */

import { JSDOM } from "jsdom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "bun:test";

// Create a jsdom instance for testing
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost:3000",
  pretendToBeVisual: true,
});

// Get the window and document from jsdom
const { window } = dom;

// Register DOM globals that testing-library/react needs
const globalAny = globalThis as Record<string, unknown>;
globalAny.window = window;
globalAny.document = window.document;
globalAny.navigator = window.navigator;
globalAny.HTMLElement = window.HTMLElement;
globalAny.HTMLInputElement = window.HTMLInputElement;
globalAny.HTMLButtonElement = window.HTMLButtonElement;
globalAny.HTMLDivElement = window.HTMLDivElement;
globalAny.HTMLSpanElement = window.HTMLSpanElement;
globalAny.HTMLHeadingElement = window.HTMLHeadingElement;
globalAny.HTMLParagraphElement = window.HTMLParagraphElement;
globalAny.HTMLAnchorElement = window.HTMLAnchorElement;
globalAny.Element = window.Element;
globalAny.Node = window.Node;
globalAny.DocumentFragment = window.DocumentFragment;
globalAny.Text = window.Text;
globalAny.Comment = window.Comment;
globalAny.Event = window.Event;
globalAny.CustomEvent = window.CustomEvent;
globalAny.MouseEvent = window.MouseEvent;
globalAny.KeyboardEvent = window.KeyboardEvent;
globalAny.FocusEvent = window.FocusEvent;
globalAny.InputEvent = window.InputEvent;
globalAny.MutationObserver = window.MutationObserver;
globalAny.Range = window.Range;
globalAny.getComputedStyle = window.getComputedStyle;
globalAny.requestAnimationFrame = (callback: FrameRequestCallback) =>
  window.requestAnimationFrame(callback);
globalAny.cancelAnimationFrame = (id: number) =>
  window.cancelAnimationFrame(id);
globalAny.HTMLCollection = window.HTMLCollection;
globalAny.NodeList = window.NodeList;
globalAny.NodeFilter = window.NodeFilter;
globalAny.ResizeObserver =
  window.ResizeObserver ||
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

globalAny.localStorage = localStorageMock;

// Cleanup DOM after each test to prevent state leakage
afterEach(() => {
  cleanup();
  // Clear the document body between tests
  while (window.document.body.firstChild) {
    window.document.body.removeChild(window.document.body.firstChild);
  }
});
