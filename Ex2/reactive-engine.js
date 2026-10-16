// Exercise 2: Reactive State Machine
// Commit 1: stateStore and resetCursor engine

// Store state values between renders.
export const stateStore = [];

// Track the current state position.
let stateCursor = 0;

// Reset the cursor before each render.
export function resetCursor() {
  stateCursor = 0;
}

// Return the current cursor position for testing.
export function getStateCursor() {
  return stateCursor;
}
