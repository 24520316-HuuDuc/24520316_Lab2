/**
 * Exercise 3: Resilient State Machine & Skeleton Loader
 *
 * @typedef {{ id: number, title: string, description: string }} Item
 *
 * @template T
 * @typedef {
 *   | { status: "IDLE" }
 *   | { status: "LOADING" }
 *   | { status: "SUCCESS", data: T }
 *   | { status: "ERROR", error: string }
 * } ViewState
 */

const VALID_STATUSES = new Set([
  "IDLE",
  "LOADING",
  "SUCCESS",
  "ERROR"
]);

const ALLOWED_TRANSITIONS = {
  IDLE: new Set(["LOADING"]),
  LOADING: new Set(["LOADING", "SUCCESS", "ERROR"]),
  SUCCESS: new Set(["LOADING"]),
  ERROR: new Set(["LOADING"])
};

const appRoot = document.querySelector("#app");
const stateLabel = document.querySelector("#state-label");
const stateDot = document.querySelector("#state-dot");
const feedContent = document.querySelector("#feed-content");
const announcer = document.querySelector("#announcer");

/** @type {ViewState<Item[]>} */
let viewState = { status: "IDLE" };

let activeController = null;
let latestRequestId = 0;

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = String(text);
  }

  return element;
}

function validateState(nextState) {
  if (
    !nextState ||
    typeof nextState !== "object" ||
    !VALID_STATUSES.has(nextState.status)
  ) {
    throw new TypeError("Invalid application state.");
  }

  const expectedKeys = {
    IDLE: ["status"],
    LOADING: ["status"],
    SUCCESS: ["status", "data"],
    ERROR: ["status", "error"]
  }[nextState.status];

  const actualKeys = Object.keys(nextState).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  if (
    actualKeys.length !== sortedExpectedKeys.length ||
    !actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  ) {
    throw new TypeError("State contains unexpected fields.");
  }

  if (nextState.status === "SUCCESS" && !Array.isArray(nextState.data)) {
    throw new TypeError("SUCCESS state requires an array of data.");
  }

  if (
    nextState.status === "ERROR" &&
    typeof nextState.error !== "string"
  ) {
    throw new TypeError("ERROR state requires a readable error string.");
  }
}

function setState(nextState) {
  validateState(nextState);

  const allowed = ALLOWED_TRANSITIONS[viewState.status];

  if (!allowed.has(nextState.status)) {
    throw new Error(
      `Invalid transition: ${viewState.status} -> ${nextState.status}`
    );
  }

  viewState = nextState;
  renderState();
}

function createSkeletonCard() {
  const card = createElement("article", "skeleton-card");
  card.setAttribute("aria-hidden", "true");

  card.append(
    createElement("div", "skeleton-line skeleton-line-title"),
    createElement("div", "skeleton-line skeleton-line-medium"),
    createElement("div", "skeleton-line skeleton-line-short")
  );

  return card;
}

function renderLoading() {
  feedContent.setAttribute("aria-busy", "true");

  const fragment = document.createDocumentFragment();
  fragment.appendChild(
    createElement("h2", "feed-heading", "Loading feed...")
  );

  const grid = createElement("div", "skeleton-grid");

  for (let index = 0; index < 4; index += 1) {
    grid.appendChild(createSkeletonCard());
  }

  fragment.appendChild(grid);
  feedContent.replaceChildren(fragment);
}

function renderSuccess(items) {
  feedContent.setAttribute("aria-busy", "false");

  const fragment = document.createDocumentFragment();

  fragment.appendChild(
    createElement("h2", "feed-heading", `Loaded ${items.length} items`)
  );

  if (items.length === 0) {
    fragment.appendChild(
      createElement("p", "empty-message", "No items are available.")
    );
    feedContent.replaceChildren(fragment);
    return;
  }

  const list = createElement("ul", "feed-grid");

  for (const item of items) {
    const card = createElement("li", "feed-card");
    card.appendChild(createElement("h3", "", item.title));
    card.appendChild(createElement("p", "", item.description));
    list.appendChild(card);
  }

  fragment.appendChild(list);
  feedContent.replaceChildren(fragment);
}

function renderError(message) {
  feedContent.setAttribute("aria-busy", "false");

  const panel = createElement("section", "error-panel");
  panel.setAttribute("role", "alert");

  panel.appendChild(
    createElement("h2", "", "We couldn't load the feed")
  );

  panel.appendChild(
    createElement(
      "p",
      "",
      "The data is temporarily unavailable. Check your connection and try again."
    )
  );

  panel.appendChild(createElement("p", "error-detail", message));

  const actions = createElement("div", "error-actions");
  const retryButton = createElement(
    "button",
    "button button-primary",
    "Retry Connection"
  );

  retryButton.type = "button";
  retryButton.dataset.action = "retry";

  actions.appendChild(retryButton);
  panel.appendChild(actions);

  feedContent.replaceChildren(panel);
}

function renderState() {
  stateLabel.textContent = viewState.status;
  stateDot.dataset.state = viewState.status;

  announcer.textContent = `Current feed state: ${viewState.status}`;

  switch (viewState.status) {
    case "IDLE":
      feedContent.setAttribute("aria-busy", "false");
      feedContent.replaceChildren(
        createElement("p", "empty-message", "The feed has not loaded yet.")
      );
      break;

    case "LOADING":
      renderLoading();
      break;

    case "SUCCESS":
      renderSuccess(viewState.data);
      break;

    case "ERROR":
      renderError(viewState.error);
      break;

    default:
      throw new Error("Unsupported application state.");
  }
}

function wait(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Request aborted.", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);

    function onAbort() {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Request aborted.", "AbortError"));
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchFeed(signal) {
  // Keep the loading state visible long enough to inspect the skeleton.
  await wait(650, signal);

  const response = await fetch(`./feed.json?t=${Date.now()}`, {
    signal,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`The feed server returned HTTP ${response.status}.`);
  }

  const items = await response.json();

  if (
    !Array.isArray(items) ||
    !items.every((item) =>
      item &&
      Number.isInteger(item.id) &&
      typeof item.title === "string" &&
      typeof item.description === "string"
    )
  ) {
    throw new Error("The feed response has an invalid data format.");
  }

  return items;
}

function describeError(error) {
  if (!navigator.onLine) {
    return "Your browser appears to be offline.";
  }

  if (error instanceof TypeError) {
    return "Could not connect to the data source. Make sure the local server is running.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

async function loadData() {
  const requestId = ++latestRequestId;

  // Cancel any previous request before starting a new one.
  if (activeController) {
    activeController.abort();
  }

  const controller = new AbortController();
  activeController = controller;

  setState({ status: "LOADING" });

  try {
    const items = await fetchFeed(controller.signal);

    // Ignore stale responses from older requests.
    if (
      requestId !== latestRequestId ||
      controller.signal.aborted
    ) {
      return;
    }

    setState({
      status: "SUCCESS",
      data: items
    });
  } catch (error) {
    // An intentionally cancelled older request must not overwrite newer UI.
    if (
      requestId !== latestRequestId ||
      controller.signal.aborted
    ) {
      return;
    }

    setState({
      status: "ERROR",
      error: describeError(error)
    });
  } finally {
    if (requestId === latestRequestId) {
      activeController = null;
    }
  }
}

// One delegated listener on the app root.
// The Retry button can be replaced during rendering without new listeners.
appRoot.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const actionElement = event.target.closest("[data-action]");

  if (!actionElement || !appRoot.contains(actionElement)) {
    return;
  }

  const action = actionElement.dataset.action;

  if (action === "reload" || action === "retry") {
    loadData();
  }
});

// First render begins in IDLE, then transitions to LOADING.
renderState();
loadData();