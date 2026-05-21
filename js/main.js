import { tokenize, validateCommands } from "./automaton.js";
import { buildGrid, getElements, renderState, renderTimeline, setNotValidated, showValidation } from "./renderer.js";
import { applySimulationCommand, createInitialSimulation } from "./simulator.js";

const elements = getElements();

let validationResult = null;
let simulation = createInitialSimulation();
let currentStep = 0;
let runTimer = null;

function validateFromInput() {
  stopRun();

  const commands = tokenize(elements.commandInput.value);
  validationResult = validateCommands(commands);
  validationResult.commands = commands;

  resetSimulation();
  showValidation(elements, validationResult);
  renderTimeline(elements, commands, currentStep);
  return validationResult;
}

function resetSimulation() {
  stopRun();
  simulation = createInitialSimulation();
  currentStep = 0;
  renderState(elements, simulation, currentStep, validationResult?.commands || []);
}

function stepSimulation() {
  if (!validationResult || !validationResult.valid) {
    const result = validateFromInput();
    if (!result.valid) {
      return false;
    }
  }

  if (currentStep >= validationResult.commands.length) {
    stopRun();
    return false;
  }

  const command = validationResult.commands[currentStep];
  simulation = applySimulationCommand(simulation, command);
  currentStep += 1;
  renderState(elements, simulation, currentStep, validationResult.commands);
  return true;
}

function runSimulation() {
  if (!validationResult || !validationResult.valid) {
    const result = validateFromInput();
    if (!result.valid) {
      return;
    }
  }

  stopRun();
  runTimer = window.setInterval(() => {
    const didStep = stepSimulation();
    if (!didStep) {
      stopRun();
    }
  }, 700);
}

function stopRun() {
  if (runTimer) {
    window.clearInterval(runTimer);
    runTimer = null;
  }
}

elements.validateBtn.addEventListener("click", validateFromInput);
elements.runBtn.addEventListener("click", runSimulation);
elements.resetBtn.addEventListener("click", resetSimulation);
elements.commandInput.addEventListener("input", () => {
  validationResult = null;
  setNotValidated(elements);
});

buildGrid(elements);
renderState(elements, simulation, currentStep);
