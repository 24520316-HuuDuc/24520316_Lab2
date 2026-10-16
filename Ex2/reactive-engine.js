// Exercise 2: Reactive State Machine & Delegation Hub

import { renderToDOM } from "../Ex1/mini-react.js";

// =====================================
// Commit 1: State Store and Reset Cursor
// =====================================

export const stateStore = [];

let stateCursor = 0;

let AppComponent = null;
let rootElement = null;

export function resetCursor() {
  stateCursor = 0;
}

export function getStateCursor() {
  return stateCursor;
}

// =====================================
// Commit 2: Reactive useState Dispatcher
// =====================================

export function useState(initialValue) {
  const currentIndex = stateCursor;

  if (currentIndex === stateStore.length) {
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

    // Update the UI after changing state.
    if (AppComponent && rootElement) {
      renderApp();
    }
  }

  return [stateStore[currentIndex], setState];
}

// =====================================
// Commit 3: Root Event Delegation Hub
// =====================================

const delegatedActions = new Map();

let delegatedRoot = null;
let delegatedClickHandler = null;

export function registerAction(actionName, handler) {
  if (
    typeof actionName !== "string" ||
    actionName.trim() === ""
  ) {
    throw new TypeError(
      "Action name must be a non-empty string."
    );
  }

  if (typeof handler !== "function") {
    throw new TypeError(
      "Action handler must be a function."
    );
  }

  delegatedActions.set(actionName, handler);
}

export function attachRootEventDelegation(root = null) {
  let targetRoot =
    root || rootElement || document.getElementById("app");

  if (typeof targetRoot === "string") {
    targetRoot = document.querySelector(targetRoot);
  }

  if (
    !targetRoot ||
    typeof targetRoot.addEventListener !== "function"
  ) {
    throw new Error("A valid root element is required.");
  }

  // Do not attach duplicate listeners to the same root.
  if (
    delegatedRoot === targetRoot &&
    delegatedClickHandler
  ) {
    return;
  }

  // Remove the listener from a previous root, if necessary.
  if (delegatedRoot && delegatedClickHandler) {
    delegatedRoot.removeEventListener(
      "click",
      delegatedClickHandler
    );
  }

  delegatedRoot = targetRoot;

  delegatedClickHandler = (event) => {
    const eventTarget = event.target;

    if (!(eventTarget instanceof Element)) {
      return;
    }

    const actionElement = eventTarget.closest("[data-action]");

    if (
      !actionElement ||
      !delegatedRoot.contains(actionElement)
    ) {
      return;
    }

    const actionName = actionElement.dataset.action;
    const handler = delegatedActions.get(actionName);

    if (handler) {
      handler(event, actionElement);
    }
  };

  delegatedRoot.addEventListener(
    "click",
    delegatedClickHandler
  );
}

// =====================================
// Render Application
// =====================================

export function renderApp(Component = null, root = null) {
  if (Component !== null) {
    if (typeof Component !== "function") {
      throw new TypeError(
        "App component must be a function."
      );
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
    throw new Error(
      "No application component has been registered."
    );
  }

  if (!rootElement) {
    throw new Error(
      'Root element "#app" was not found.'
    );
  }

  // Attach one listener to the root, not to every button.
  attachRootEventDelegation(rootElement);

  // Reset before each component render so useState
  // accesses the same state slots in the same order.
  resetCursor();

  const vnode = AppComponent();
  const domNode = renderToDOM(vnode);

  // Replace rendered children while keeping the root element.
  rootElement.replaceChildren(domNode);

  return domNode;
}