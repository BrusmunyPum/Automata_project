import { tokenize, validateCommands } from "./automaton.js";
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

let live = createLiveState();
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
  live = createLiveState();
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
  validationResult = validateCommands(commands);
  validationResult.commands = commands;

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
  live = createLiveState();
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

buildGrid(elements);
renderTimeline(elements, [], 0);
syncLive(0);
