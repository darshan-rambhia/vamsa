/* istanbul ignore file */
/**
 * Test Setup for Bun + happy-dom
 * Provides a DOM environment for React component testing
 */
import { Window } from "happy-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "bun:test";

// Create a happy-dom window instance
const window = new Window({
  url: "http://localhost:3000",
});

// Register DOM globals that testing-library needs
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
globalAny.getComputedStyle = window.getComputedStyle.bind(window);
globalAny.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalAny.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
globalAny.HTMLCollection = window.HTMLCollection;
globalAny.NodeList = window.NodeList;
globalAny.NodeFilter = window.NodeFilter;
globalAny.ResizeObserver = window.ResizeObserver;
globalAny.localStorage = window.localStorage;

// Cleanup after each test to avoid DOM pollution
afterEach(() => {
  cleanup();
  // Clear the document body between tests
  while (window.document.body.firstChild) {
    window.document.body.removeChild(window.document.body.firstChild);
  }
});
