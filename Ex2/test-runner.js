import { createElement } from "../Ex1/mini-react.js";

import {
  stateStore,
  useState,
  renderApp,
  registerAction
} from "./reactive-engine.js";

let addTask = () => {};
let changeFilter = () => {};
let toggleTask = () => {};

function TaskApp() {
  const [tasks, setTasks] = useState([
    "Review PR",
    "Verify AST"
  ]);

  const [filter, setFilter] = useState("ALL");

  const [completedTasks, setCompletedTasks] = useState([]);

  // Connect delegated actions to this render's state dispatchers.
  addTask = (title) => {
    setTasks((previousTasks) => [...previousTasks, title]);
  };

  changeFilter = (nextFilter) => {
    setFilter(nextFilter);
  };

  toggleTask = (index) => {
    setCompletedTasks((previous) =>
      previous.includes(index)
        ? previous.filter((item) => item !== index)
        : [...previous, index]
    );
  };

  const visibleTasks = tasks
    .map((title, index) => ({
      title,
      index,
      completed: completedTasks.includes(index)
    }))
    .filter((task) => {
      if (filter === "ACTIVE") return !task.completed;
      if (filter === "COMPLETED") return task.completed;
      return true;
    });

  return createElement(
    "main",
    null,
    createElement("h1", null, "Reactive Task Manager"),
    createElement("p", { id: "task-count" },
      `Tasks: ${tasks.length} | Visible: ${visibleTasks.length}`
    ),

    createElement(
      "section",
      { "aria-labelledby": "add-title" },
      createElement("h2", { id: "add-title" }, "Add a task"),
      createElement("label", { htmlFor: "task-input" }, "Task name"),
      createElement("input", {
        id: "task-input",
        type: "text",
        placeholder: "Enter a task..."
      }),
      createElement("button", {
        type: "button",
        "data-action": "add-task"
      }, "Add Task"),
      createElement("p", {
        id: "form-message",
        role: "status",
        "aria-live": "polite"
      }, "Ready")
    ),

    createElement(
      "section",
      { "aria-labelledby": "filter-title" },
      createElement("h2", { id: "filter-title" }, "Filter tasks"),
      ...["ALL", "ACTIVE", "COMPLETED"].map((name) =>
        createElement("button", {
          type: "button",
          "data-action": "set-filter",
          "data-filter": name,
          "aria-pressed": filter === name
        }, name)
      )
    ),

    createElement(
      "section",
      { "aria-labelledby": "list-title" },
      createElement("h2", { id: "list-title" }, "Tasks"),
      visibleTasks.length === 0
        ? createElement("p", null, "No tasks match this filter.")
        : createElement(
            "ul",
            null,
            ...visibleTasks.map((task) =>
              createElement(
                "li",
                null,
                createElement(
                  "span",
                  { className: task.completed ? "completed" : "" },
                  task.title
                ),
                createElement("button", {
                  type: "button",
                  "data-action": "toggle-task",
                  "data-task-index": task.index
                }, task.completed ? "Mark active" : "Complete")
              )
            )
          )
    )
  );
}

registerAction("add-task", () => {
  const input = document.getElementById("task-input");
  const message = document.getElementById("form-message");
  const title = input?.value.trim();

  if (!title) {
    if (message) message.textContent = "Enter a task name first.";
    return;
  }

  input.value = "";
  addTask(title);

  const updatedMessage = document.getElementById("form-message");
  if (updatedMessage) updatedMessage.textContent = `Added: ${title}`;
});

registerAction("set-filter", (_event, button) => {
  const value = button.dataset.filter;
  if (["ALL", "ACTIVE", "COMPLETED"].includes(value)) {
    changeFilter(value);
  }
});

registerAction("toggle-task", (_event, button) => {
  const index = Number(button.dataset.taskIndex);
  if (Number.isInteger(index) && index >= 0) {
    toggleTask(index);
  }
});

renderApp(TaskApp, "#app");

console.assert(
  stateStore.length === 3,
  "Expected three persistent state slots."
);

console.log("Checkpoint 2: Task Manager mounted.");
console.log("State slots:", stateStore.length);