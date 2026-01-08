/**
 * Test Setup for Bun + jsdom
 * Provides a DOM environment for React component testing
 */
import { JSDOM } from "jsdom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "bun:test";

// Create a jsdom instance
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost:3000",
  pretendToBeVisual: true,
});

// Get the window and document
const { window } = dom;

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
globalAny.getComputedStyle = window.getComputedStyle;
globalAny.requestAnimationFrame = (callback: FrameRequestCallback) =>
  window.requestAnimationFrame(callback);
globalAny.cancelAnimationFrame = (id: number) =>
  window.cancelAnimationFrame(id);
globalAny.HTMLCollection = window.HTMLCollection;
globalAny.NodeList = window.NodeList;

// Cleanup after each test to avoid DOM pollution
afterEach(() => {
  cleanup();
  // Clear the document body between tests
  while (window.document.body.firstChild) {
    window.document.body.removeChild(window.document.body.firstChild);
  }
});
