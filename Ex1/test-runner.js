import {
  createElement,
  renderToDOM,
  isVNode
} from "./mini-react.js";

const vApp = createElement(
  "main",
  { id: "root-view", role: "main" },

  createElement(
    "header",
    { className: "hero" },
    createElement("h1", null, "Mini React Engine"),
    createElement("p", null, "image Safe Text")
  ),

  createElement(
    "button",
    { onClick: () => console.log("Ping") },
    "Click"
  )
);

const root = document.getElementById("app");

if (!root) {
  throw new Error('Mount point "#app" was not found.');
}

// Verify the VNode type guard.
console.assert(isVNode(vApp), "VNode typeguard failed.");
console.assert(
  !isVNode({ type: "main" }),
  "Invalid VNode should fail typeguard verification."
);

// Mount the VNode tree into the real DOM.
root.replaceChildren(renderToDOM(vApp));

// Verify the expected structure.
console.assert(
  root.querySelector("main") !== null,
  "Main element was not mounted."
);

console.assert(
  root.querySelector("header.hero h1") !== null,
  "Semantic header or heading was not mounted."
);

console.assert(
  root.querySelector("button") !== null,
  "Mount Failed"
);

// Verify the click event listener.
root.querySelector("button").click();

// XSS security checkpoint.
const attack = '<script>alert("XSS")</script>';

const xssNode = renderToDOM(
  createElement("p", { id: "xss-check" }, attack)
);

console.assert(
  xssNode.textContent === attack,
  "XSS payload should remain plain text."
);

console.assert(
  xssNode.querySelector("script") === null,
  "A script element must not be created from a text child."
);

// Audit helpers for the browser DevTools.
console.log("VNode tree:", vApp);
console.log("Mounted DOM:", root.firstElementChild);
console.log("XSS test passed:", xssNode.textContent === attack);
console.log("Mini-React checks completed.");