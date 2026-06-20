import { tokenize, validateCommands } from "./automaton.js";
import { DEFAULT_OBJECTS, GRID_SIZE } from "./constants.js";
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

  const result = applyLiveCommand(live, command);
  if (!result.ok) {
    setLiveMessage(elements, result.error, "error");
    setBadge(elements, "Blocked", "error");
    updatePad(elements, allowedCommands(live));
    return;
  }

  live = result.state;
  syncLive(live.sequence.length);

  if (live.stopped) {
    setLiveMessage(elements, "Sequence accepted by the automaton. ✓", "success");
    setBadge(elements, "Accepted", "success");
  } else {
    setLiveMessage(elements, `${command} accepted.`, "success");
    setBadge(elements, "Driving", null);
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
  updatePad(elements, allowedCommands(live));
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
elements.objectInput.addEventListener("input", () => {
  stopRun();
  validationResult = null;
  live = createLiveState(getObjectPositions().positions);
  renderTimeline(elements, [], 0);
  syncLive(0);
  setNotValidated(elements);
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

function getObjectPositions() {
  const raw = elements.objectInput?.value.trim() || DEFAULT_OBJECTS.join(" ");
  const tokens = raw.split(/\s+/).filter(Boolean);
  const positions = [];
  const seen = new Set();
  const errors = [];

  tokens.forEach((token) => {
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

  if (!positions.length) {
    errors.push("Add at least one pickup object.");
  }

  return {
    ok: errors.length === 0,
    positions: positions.length ? positions : DEFAULT_OBJECTS,
    errors
  };
}
