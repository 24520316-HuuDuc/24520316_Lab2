// Exercise 2: Reactive State Machine

import { renderToDOM } from "../Ex1/mini-react.js";

// Store state values between renders.
export const stateStore = [];

// Track the current state position.
let stateCursor = 0;

// Keep references to the application and its root element.
let AppComponent = null;
let rootElement = null;

// Reset the cursor before each render.
export function resetCursor() {
  stateCursor = 0;
}

// Return cursor position for verification.
export function getStateCursor() {
  return stateCursor;
}

// Custom useState dispatcher.
export function useState(initialValue) {
  const currentIndex = stateCursor;

  // Initialize a state slot only the first time it is used.
  if (currentIndex >= stateStore.length) {
    stateStore.push(initialValue);
  }

  stateCursor += 1;

  function setState(nextValue) {
    const previousValue = stateStore[currentIndex];

    const resolvedValue =
      typeof nextValue === "function"
        ? nextValue(previousValue)
        : nextValue;

    if (Object.is(previousValue, resolvedValue)) {
      return;
    }

    stateStore[currentIndex] = resolvedValue;

    // Re-render the existing application after state changes.
    if (AppComponent && rootElement) {
      renderApp();
    }
  }

  return [stateStore[currentIndex], setState];
}

// Render the application and preserve the root element.
export function renderApp(Component = null, root = null) {
  if (Component !== null) {
    if (typeof Component !== "function") {
      throw new TypeError("App component must be a function.");
    }

    AppComponent = Component;
  }

  if (root !== null) {
    rootElement =
      typeof root === "string"
        ? document.querySelector(root)
        : root;
  }

  if (!rootElement) {
    rootElement = document.getElementById("app");
  }

  if (!AppComponent) {
    throw new Error("No application component has been registered.");
  }

  if (!rootElement) {
    throw new Error('Root element "#app" was not found.');
  }

  resetCursor();

  const vnode = AppComponent();
  const domNode = renderToDOM(vnode);

  rootElement.replaceChildren(domNode);

  return domNode;
}