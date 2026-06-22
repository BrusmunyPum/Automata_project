import { tokenize, validateCommands } from "./automaton.js";
import { DEFAULT_OBJECTS, GRID_SIZE, MIN_OBJECTS } from "./constants.js";
import { allowedCommands, applyLiveCommand, createLiveState } from "./live.js";
import {
  buildGrid,
  getElements,
  renderLiveSequence,
  renderState,
  renderTimeline,
  setBadge,
  setLiveMessage,
  setNotValidated,
  showToast,
  showValidation,
  updatePad
} from "./renderer.js";

const elements = getElements();

let live = createLiveState(getObjectPositions().positions);
let validationResult = null;
let runTimer = null;
let runIndex = 0;

// ── Manual drive ────────────────────────────────────────────────
// Each button click feeds one command to the live automaton. The
// command is only applied if the rules accept it.
function drive(command) {
  stopRun();

  if (!hasMinObjects()) {
    const message = `The robot cannot move with fewer than ${MIN_OBJECTS} objects. Add objects on the grid first.`;
    setLiveMessage(elements, message, "error");
    setBadge(elements, "Need objects", "error");
    showToast(message, "error");
    return;
  }

  const result = applyLiveCommand(live, command);
  if (!result.ok) {
    setLiveMessage(elements, result.error, "error");
    setBadge(elements, "Blocked", "error");
    showToast(result.error, "error");
    updatePad(elements, allowedCommands(live));
    return;
  }

  live = result.state;
  syncLive(live.sequence.length);

  if (live.stopped) {
    const message = `Sequence accepted — robot picked and dropped at least ${MIN_OBJECTS} objects. ✓`;
    setLiveMessage(elements, message, "success");
    setBadge(elements, "Accepted", "success");
    showToast(message, "success");
  } else {
    setLiveMessage(elements, `${command} accepted.`, "success");
    setBadge(elements, "Driving", null);
    // Tell the user the moment the run becomes finishable.
    if (command === "DROP" && live.completedTasks === MIN_OBJECTS) {
      showToast(`${MIN_OBJECTS} tasks complete — you can STOP now.`, "info");
    }
  }
}

function resetRobot() {
  stopRun();
  const objectConfig = getObjectPositions();
  if (!objectConfig.ok) {
    showValidation(elements, {
      valid: false,
      errors: objectConfig.errors
    });
    setBadge(elements, "Object error", "error");
    return;
  }

  live = createLiveState(objectConfig.positions);
  runIndex = 0;
  syncLive(0);
  setLiveMessage(elements, "Robot reset to (0, 0). Click START to drive.", "success");
  setBadge(elements, "Ready", null);
}

function syncLive(currentStep) {
  renderState(elements, live, currentStep);
  renderLiveSequence(elements, live);
  // The whole control pad is disabled until at least MIN_OBJECTS objects exist.
  const allowed = hasMinObjects() ? allowedCommands(live) : new Set();
  updatePad(elements, allowed);
}

// ── Typed sequence: validate + optional auto-run ────────────────
function validateFromInput() {
  stopRun();

  const commands = tokenize(elements.commandInput.value);
  const objectConfig = getObjectPositions();
  if (!objectConfig.ok) {
    validationResult = {
      valid: false,
      errors: objectConfig.errors,
      trace: [],
      commands
    };
    showValidation(elements, validationResult);
    renderTimeline(elements, commands, 0);
    return validationResult;
  }

  validationResult = validateCommands(commands);
  validationResult.commands = commands;
  validationResult.objectPositions = objectConfig.positions;

  if (validationResult.valid) {
    const worldResult = validateWorldActions(commands, objectConfig.positions);
    if (!worldResult.valid) {
      validationResult.valid = false;
      validationResult.errors = worldResult.errors;
    }
  }

  showValidation(elements, validationResult);
  renderTimeline(elements, commands, 0);
  return validationResult;
}

function autoRun() {
  const result = validateFromInput();
  if (!result.valid) {
    if (result.errors && result.errors.length) {
      showToast(result.errors[0], "error");
    }
    return;
  }

  const commands = result.commands;
  live = createLiveState(result.objectPositions);
  runIndex = 0;
  syncLive(0);
  renderTimeline(elements, commands, 0);

  stopRun();
  runTimer = window.setInterval(() => {
    if (runIndex >= commands.length) {
      stopRun();
      return;
    }

    const stepResult = applyLiveCommand(live, commands[runIndex]);
    if (!stepResult.ok) {
      setLiveMessage(elements, `Auto-run stopped: ${stepResult.error}`, "error");
      setBadge(elements, "Blocked", "error");
      showToast(`Auto-run stopped: ${stepResult.error}`, "error");
      stopRun();
      return;
    }

    live = stepResult.state;
    runIndex += 1;
    renderState(elements, live, runIndex);
    renderLiveSequence(elements, live);
    renderTimeline(elements, commands, runIndex);
    updatePad(elements, allowedCommands(live));
  }, 700);
}

function stopRun() {
  if (runTimer) {
    window.clearInterval(runTimer);
    runTimer = null;
  }
}

// ── Wiring ──────────────────────────────────────────────────────
elements.cmdButtons.forEach((button) => {
  button.addEventListener("click", () => drive(button.dataset.cmd));
});

elements.validateBtn.addEventListener("click", validateFromInput);
elements.runBtn.addEventListener("click", autoRun);
elements.resetBtn.addEventListener("click", resetRobot);
elements.commandInput.addEventListener("input", () => {
  validationResult = null;
  setNotValidated(elements);
});
elements.objectInput.addEventListener("input", applyObjectConfig);
elements.grid.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) {
    return;
  }
  toggleObjectAt(Number(cell.dataset.x), Number(cell.dataset.y));
});

buildGrid(elements);
renderTimeline(elements, [], 0);
syncLive(0);

function validateWorldActions(commands, objectPositions) {
  let state = createLiveState(objectPositions);
  const errors = [];

  for (let index = 0; index < commands.length; index += 1) {
    const result = applyLiveCommand(state, commands[index]);
    if (!result.ok) {
      errors.push(`Command ${index + 1}: ${result.error}`);
      return { valid: false, errors };
    }
    state = result.state;
  }

  return { valid: true, errors };
}

// Parse a raw "x,y x,y ..." string into deduped, in-grid object keys.
function parseObjectTokens(raw) {
  const positions = [];
  const seen = new Set();
  const errors = [];

  raw.split(/\s+/).filter(Boolean).forEach((token) => {
    const match = token.match(/^(\d+),(\d+)$/);
    if (!match) {
      errors.push(`Object "${token}" must use x,y format, for example 2,1.`);
      return;
    }

    const x = Number(match[1]);
    const y = Number(match[2]);
    const key = `${x},${y}`;

    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
      errors.push(`Object ${key} is outside the ${GRID_SIZE}x${GRID_SIZE} grid.`);
      return;
    }

    if (!seen.has(key)) {
      seen.add(key);
      positions.push(key);
    }
  });

  return { positions, errors };
}

function getObjectPositions() {
  const raw = elements.objectInput?.value.trim() || DEFAULT_OBJECTS.join(" ");
  const { positions, errors } = parseObjectTokens(raw);

  if (positions.length < MIN_OBJECTS) {
    errors.push(`You need at least ${MIN_OBJECTS} pickup objects (Rule 8 needs two PICK-DROP tasks).`);
  }

  return {
    ok: errors.length === 0,
    positions: positions.length ? positions : DEFAULT_OBJECTS,
    errors
  };
}

function hasMinObjects() {
  return parseObjectTokens(elements.objectInput.value.trim()).positions.length >= MIN_OBJECTS;
}

function compareKeys(a, b) {
  const [ax, ay] = a.split(",").map(Number);
  const [bx, by] = b.split(",").map(Number);
  return ax - bx || ay - by;
}

// Click a grid cell to add an object there, or remove it if one exists.
function toggleObjectAt(x, y) {
  const key = `${x},${y}`;
  const { positions } = parseObjectTokens(elements.objectInput.value.trim());
  const set = new Set(positions);

  if (set.has(key)) {
    if (set.size <= MIN_OBJECTS) {
      const message = `You must keep at least ${MIN_OBJECTS} objects — this one cannot be removed.`;
      setLiveMessage(elements, message, "error");
      setBadge(elements, "Need objects", "error");
      showToast(message, "error");
      return;
    }
    set.delete(key);
  } else {
    set.add(key);
  }

  elements.objectInput.value = [...set].sort(compareKeys).join(" ");
  applyObjectConfig();
}

// Rebuild the robot world from the current object configuration and give feedback.
function applyObjectConfig() {
  stopRun();
  validationResult = null;

  const { positions, errors } = parseObjectTokens(elements.objectInput.value.trim());
  live = createLiveState(positions);
  runIndex = 0;
  renderTimeline(elements, [], 0);
  syncLive(0);

  if (errors.length) {
    setLiveMessage(elements, errors[0], "error");
    setBadge(elements, "Object error", "error");
    showToast(errors[0], "error");
  } else if (positions.length < MIN_OBJECTS) {
    const message = `Add at least ${MIN_OBJECTS} pickup objects (Rule 8 needs two PICK-DROP tasks).`;
    setLiveMessage(elements, message, "error");
    setBadge(elements, "Need objects", "error");
    showToast(message, "error");
  } else {
    setLiveMessage(elements, `Objects: ${positions.join("  ")}. Click START to drive.`, "success");
    setBadge(elements, "Ready", null);
  }
}
