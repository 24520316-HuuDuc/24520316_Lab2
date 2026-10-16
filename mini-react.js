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