import { GRID_SIZE, MAX_ENERGY } from "./constants.js";
import { directionName } from "./movement.js";

export function getElements() {
  return {
    commandInput: document.getElementById("commandInput"),
    validateBtn: document.getElementById("validateBtn"),
    runBtn: document.getElementById("runBtn"),
    resetBtn: document.getElementById("resetBtn"),
    validationBadge: document.getElementById("validationBadge"),
    messageList: document.getElementById("messageList"),
    commandTimeline: document.getElementById("commandTimeline"),
    grid: document.getElementById("grid"),
    stepCounter: document.getElementById("stepCounter"),
    currentCommandValue: document.getElementById("currentCommandValue"),
    positionValue: document.getElementById("positionValue"),
    directionValue: document.getElementById("directionValue"),
    energyValue: document.getElementById("energyValue"),
    energyDots: document.querySelectorAll(".energy-dots span"),
    carryingValue: document.getElementById("carryingValue"),
    tasksValue: document.getElementById("tasksValue"),
    lastCommandValue: document.getElementById("lastCommandValue"),
    executionLog: document.getElementById("executionLog")
  };
}

export function buildGrid(elements) {
  elements.grid.innerHTML = "";

  for (let y = GRID_SIZE - 1; y >= 0; y -= 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);

      const coord = document.createElement("span");
      coord.className = "coord";
      coord.textContent = `${x},${y}`;
      cell.appendChild(coord);

      elements.grid.appendChild(cell);
    }
  }
}

export function renderState(elements, simulation, currentStep, commands = []) {
  document.querySelectorAll(".cell").forEach((cell) => {
    const key = `${cell.dataset.x},${cell.dataset.y}`;
    const isRobotCell = Number(cell.dataset.x) === simulation.x && Number(cell.dataset.y) === simulation.y;
    const coord = cell.querySelector(".coord");

    cell.classList.toggle("visited", simulation.visited.has(key));
    cell.classList.toggle("robot", isRobotCell);
    cell.textContent = "";

    if (isRobotCell) {
      cell.appendChild(createRobotMarker(simulation.direction));
    }

    cell.appendChild(coord);
  });

  elements.positionValue.textContent = `(${simulation.x}, ${simulation.y})`;
  elements.directionValue.textContent = directionName(simulation.direction);
  elements.energyValue.textContent = `${simulation.energy} / ${MAX_ENERGY}`;
  renderEnergy(elements, simulation.energy);
  elements.carryingValue.textContent = simulation.carrying ? "Carrying" : "Not carrying";
  elements.tasksValue.textContent = String(simulation.completedTasks);
  elements.lastCommandValue.textContent = simulation.lastCommand;
  elements.currentCommandValue.textContent = simulation.lastCommand;
  elements.stepCounter.textContent = `Step ${currentStep}`;

  renderLog(elements, simulation.log);
  renderTimeline(elements, commands, currentStep);
}

export function renderTimeline(elements, commands, currentStep) {
  elements.commandTimeline.innerHTML = "";

  if (!commands.length) {
    const empty = document.createElement("span");
    empty.className = "timeline-empty";
    empty.textContent = "Validate to preview commands.";
    elements.commandTimeline.appendChild(empty);
    return;
  }

  commands.forEach((command, index) => {
    const token = document.createElement("span");
    token.className = "timeline-token";
    token.textContent = command;

    if (index < currentStep) {
      token.classList.add("done");
    }

    if (index === currentStep) {
      token.classList.add("active");
    }

    elements.commandTimeline.appendChild(token);
  });
}

function renderEnergy(elements, energy) {
  elements.energyDots.forEach((dot, index) => {
    dot.className = "";
    dot.classList.toggle("filled", index < energy);
    dot.classList.toggle("empty", index >= energy);

    if (index < energy && energy <= 1) {
      dot.classList.add("danger");
    } else if (index < energy && energy <= 3) {
      dot.classList.add("warning");
    } else if (index < energy) {
      dot.classList.add("healthy");
    }
  });
}

function createRobotMarker(direction) {
  const marker = document.createElement("span");
  marker.className = `robot-marker face-${direction}`;
  marker.setAttribute("aria-label", `Robot facing ${directionName(direction)}`);

  marker.innerHTML = `
    <span class="robot-antenna"></span>
    <span class="robot-head">
      <span class="robot-eye"></span>
      <span class="robot-eye"></span>
    </span>
    <span class="robot-body"></span>
  `;

  return marker;
}

export function showValidation(elements, result) {
  elements.messageList.innerHTML = "";

  if (result.valid) {
    elements.validationBadge.textContent = "Valid";
    elements.validationBadge.className = "badge success";
    addMessage(elements, "Accepted by the automaton. Ready to simulate.", "message-success");
    return;
  }

  elements.validationBadge.textContent = "Invalid";
  elements.validationBadge.className = "badge error";
  result.errors.forEach((error) => addMessage(elements, error, "message-error"));
}

export function setNotValidated(elements) {
  elements.validationBadge.textContent = "Not validated";
  elements.validationBadge.className = "badge neutral";
}

function renderLog(elements, log) {
  elements.executionLog.innerHTML = "";

  if (!log.length) {
    const empty = document.createElement("li");
    empty.className = "empty-log";
    empty.textContent = "No commands executed yet.";
    elements.executionLog.appendChild(empty);
    return;
  }

  log.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    elements.executionLog.appendChild(item);
  });
  elements.executionLog.scrollTop = elements.executionLog.scrollHeight;
}

function addMessage(elements, text, className) {
  const item = document.createElement("li");
  item.className = className;
  item.textContent = text;
  elements.messageList.appendChild(item);
}
