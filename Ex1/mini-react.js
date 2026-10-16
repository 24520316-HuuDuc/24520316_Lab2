const TEXT_ELEMENT = "#text";

// Check whether a value is a plain object.
function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

// Strict VNode type guard.
export function isVNode(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  if (
    typeof value.type !== "string" ||
    !isPlainObject(value.props) ||
    !Array.isArray(value.children)
  ) {
    return false;
  }

  if (value.type === TEXT_ELEMENT) {
    return (
      typeof value.text === "string" &&
      value.children.length === 0
    );
  }

  if ("text" in value) {
    return false;
  }

  return value.children.every(isVNode);
}

// Create a virtual text node.
export function createTextElement(text) {
  if (
    typeof text !== "string" &&
    typeof text !== "number"
  ) {
    throw new TypeError(
      "Text children must be strings or numbers."
    );
  }

  return {
    type: TEXT_ELEMENT,
    props: {},
    children: [],
    text: String(text),
  };
}

// Convert children into VNodes.
function normalizeChild(child, output) {
  if (
    child === null ||
    child === undefined ||
    typeof child === "boolean"
  ) {
    return;
  }

  if (Array.isArray(child)) {
    child.forEach((item) => {
      normalizeChild(item, output);
    });

    return;
  }

  if (
    typeof child === "string" ||
    typeof child === "number"
  ) {
    output.push(createTextElement(child));
    return;
  }

  if (isVNode(child)) {
    output.push(child);
    return;
  }

  throw new TypeError(
    "Invalid child: expected a VNode, string, or number."
  );
}

// Create an element VNode.
export function createElement(type, props, ...children) {
  if (
    typeof type !== "string" ||
    type === TEXT_ELEMENT ||
    !/^[A-Za-z][A-Za-z0-9:_-]*$/.test(type)
  ) {
    throw new TypeError(
      "Element type must be a valid HTML tag name."
    );
  }

  if (
    props !== null &&
    props !== undefined &&
    !isPlainObject(props)
  ) {
    throw new TypeError(
      "Element props must be an object or null."
    );
  }

  const normalizedChildren = [];

  children.forEach((child) => {
    normalizeChild(child, normalizedChildren);
  });

  const vnode = {
    type,
    props: props == null ? {} : { ...props },
    children: normalizedChildren,
  };

  if (!isVNode(vnode)) {
    throw new TypeError("Failed to create a valid VNode.");
  }

  return vnode;
}
// ==============================
// Commit 2: renderToDOM
// ==============================

const BOOLEAN_ATTRIBUTES = new Set([
  "disabled",
  "checked",
  "selected",
  "multiple",
  "required",
  "readonly",
  "autofocus",
  "hidden",
  "controls",
  "loop",
  "muted",
  "open"
]);

const PROP_TO_ATTRIBUTE = {
  className: "class",
  htmlFor: "for",
  tabIndex: "tabindex",
  readOnly: "readonly",
  autoFocus: "autofocus"
};

export function renderToDOM(vnode) {
  // Verify that the input is a valid VNode.
  if (!isVNode(vnode)) {
    throw new TypeError(
      "renderToDOM expects a valid VNode."
    );
  }

  // Text nodes must be created as text, never parsed as HTML.
  if (vnode.type === TEXT_ELEMENT) {
    return document.createTextNode(vnode.text);
  }

  // Create the real DOM element.
  const element = document.createElement(vnode.type);

  // Apply props safely.
  for (const [propName, propValue] of Object.entries(vnode.props)) {
    const lowerName = propName.toLowerCase();

    // These props must not be used to inject raw HTML.
    if (
      lowerName === "dangerouslysetinnerhtml" ||
      lowerName === "innerhtml" ||
      lowerName === "outerhtml"
    ) {
      throw new TypeError(
        `${propName} is not supported for security reasons.`
      );
    }

    // Props handled internally by the VNode engine.
    if (
      propName === "children" ||
      propName === "key" ||
      propName === "ref"
    ) {
      continue;
    }

    if (propValue === null || propValue === undefined) {
      continue;
    }

    // Attach event listeners instead of creating inline event attributes.
    if (/^on/i.test(propName)) {
      if (
        !/^on[A-Z]/.test(propName) ||
        typeof propValue !== "function"
      ) {
        throw new TypeError(
          `Event prop "${propName}" must be a function such as onClick.`
        );
      }

      const eventName =
        propName === "onDoubleClick"
          ? "dblclick"
          : propName.slice(2).toLowerCase();

      element.addEventListener(eventName, propValue);
      continue;
    }

    // Support style objects such as { backgroundColor: "red" }.
    if (propName === "style") {
      if (!isPlainObject(propValue)) {
        throw new TypeError("The style prop must be an object.");
      }

      for (const [styleName, styleValue] of Object.entries(propValue)) {
        if (
          styleValue === null ||
          styleValue === undefined ||
          typeof styleValue === "boolean"
        ) {
          continue;
        }

        const cssName = styleName.startsWith("--")
          ? styleName
          : styleName.replace(/[A-Z]/g, (letter) =>
              `-${letter.toLowerCase()}`
            );

        element.style.setProperty(cssName, String(styleValue));
      }

      continue;
    }

    // Reject object/function props that cannot safely be HTML attributes.
    if (
      typeof propValue === "object" ||
      typeof propValue === "function" ||
      typeof propValue === "symbol"
    ) {
      throw new TypeError(
        `Invalid value for prop "${propName}".`
      );
    }

    const attributeName =
      PROP_TO_ATTRIBUTE[propName] || propName;

    if (typeof propValue === "boolean") {
      if (
        attributeName.startsWith("aria-") ||
        attributeName.startsWith("data-")
      ) {
        element.setAttribute(attributeName, String(propValue));
      } else if (BOOLEAN_ATTRIBUTES.has(attributeName.toLowerCase())) {
        if (propValue) {
          element.setAttribute(attributeName, "");
        }
      } else {
        element.setAttribute(attributeName, String(propValue));
      }

      continue;
    }

    element.setAttribute(attributeName, String(propValue));
  }

  // Recursively mount children in the same order as the VNode tree.
  for (const child of vnode.children) {
    element.appendChild(renderToDOM(child));
  }

  return element;
}