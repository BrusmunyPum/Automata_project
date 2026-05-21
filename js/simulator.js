import { MAX_ENERGY } from "./constants.js";
import { directionName, getMovementDelta, turn } from "./movement.js";

export function createInitialSimulation() {
  return {
    x: 0,
    y: 0,
    direction: "N",
    energy: MAX_ENERGY,
    carrying: false,
    completedTasks: 0,
    lastCommand: "None",
    visited: new Set(["0,0"]),
    log: []
  };
}

export function applySimulationCommand(state, command) {
  const next = {
    ...state,
    visited: new Set(state.visited),
    log: [...state.log],
    lastCommand: command
  };

  if (command === "START" || command === "STOP") {
    next.log.push(`${command}`);
    return next;
  }

  if (command === "F" || command === "B") {
    return moveRobot(next, command);
  }

  if (command === "L" || command === "R") {
    return turnRobot(next, command);
  }

  if (command === "PICK") {
    next.carrying = true;
    next.log.push("PICK: object collected");
    return next;
  }

  if (command === "DROP") {
    next.carrying = false;
    next.completedTasks += 1;
    next.log.push("DROP: task completed");
    return next;
  }

  if (command === "RECHARGE") {
    next.energy = MAX_ENERGY;
    next.log.push("RECHARGE: energy restored to 5");
    return next;
  }

  return next;
}

function moveRobot(state, command) {
  const delta = getMovementDelta(state.direction, command);
  state.x += delta.x;
  state.y += delta.y;
  state.energy -= 1;
  state.visited.add(`${state.x},${state.y}`);
  state.log.push(`${command}: moved to (${state.x}, ${state.y})`);
  return state;
}

function turnRobot(state, command) {
  state.direction = turn(state.direction, command);
  state.energy -= 1;
  state.log.push(`${command}: facing ${directionName(state.direction)}`);
  return state;
}
