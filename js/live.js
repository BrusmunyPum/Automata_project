import { DEFAULT_OBJECTS, MAX_ENERGY } from "./constants.js";
import { directionName, getMovementDelta, isInsideGrid, turn } from "./movement.js";

// Live automaton: the user drives the robot one command at a time.
// Each command is checked against the same rules as the batch validator
// (automaton.js). A rejected command leaves the state unchanged and
// returns an error message instead of moving the robot.

export function createLiveState(objectPositions = DEFAULT_OBJECTS) {
  return {
    x: 0,
    y: 0,
    direction: "N",
    energy: MAX_ENERGY,
    carrying: false,
    completedTasks: 0,
    hasMoved: false,
    lastTurn: null,
    leftCount: 0,
    rightCount: 0,
    started: false,
    stopped: false,
    lastCommand: "None",
    sequence: [],
    visited: new Set(["0,0"]),
    objects: new Set(objectPositions),
    delivered: new Set(),
    log: []
  };
}

export function applyLiveCommand(state, command) {
  if (state.stopped) {
    return fail(state, "The sequence already ended with STOP. Click Reset to start again.");
  }

  // Rule 1: the sequence must begin with START.
  if (!state.started) {
    if (command !== "START") {
      return fail(state, `The first command must be START (you clicked ${command}).`);
    }
    const next = commit(state, "START", "START");
    next.started = true;
    return ok(next);
  }

  if (command === "START") {
    return fail(state, "START can only be the first command.");
  }

  if (command === "STOP") {
    // Rule 2: at least one movement. Rule 8: at least two tasks. Rule 3: not carrying.
    if (!state.hasMoved) {
      return fail(state, "Cannot STOP: the robot must move (F or B) at least once.");
    }
    if (state.completedTasks < 2) {
      return fail(state, `Cannot STOP: need at least 2 completed PICK-DROP tasks (have ${state.completedTasks}).`);
    }
    if (state.carrying) {
      return fail(state, "Cannot STOP: the robot is still carrying an object.");
    }
    const next = commit(state, "STOP", "STOP — sequence accepted");
    next.stopped = true;
    return ok(next);
  }

  // Rule 6: F and B need energy and must stay inside the grid.
  if (command === "F" || command === "B") {
    if (state.energy === 0) {
      return fail(state, `Cannot ${command}: energy is 0. Use RECHARGE first.`);
    }
    const delta = getMovementDelta(state.direction, command);
    const nextX = state.x + delta.x;
    const nextY = state.y + delta.y;
    if (!isInsideGrid(nextX, nextY)) {
      return fail(state, `Cannot ${command}: that would move outside the 8×8 grid.`);
    }
    const next = commit(state, command, `${command}: moved to (${nextX}, ${nextY})`);
    next.x = nextX;
    next.y = nextY;
    next.energy -= 1;
    next.hasMoved = true;
    next.lastTurn = null;
    next.visited.add(`${nextX},${nextY}`);
    return ok(next);
  }

  // Rule 10: no two turns in a row. Rule 14: |left - right| <= 2.
  if (command === "L" || command === "R") {
    if (state.lastTurn !== null) {
      return fail(state, `Cannot turn twice in a row (${state.lastTurn} then ${command}).`);
    }
    const leftCount = state.leftCount + (command === "L" ? 1 : 0);
    const rightCount = state.rightCount + (command === "R" ? 1 : 0);
    if (Math.abs(leftCount - rightCount) > 2) {
      return fail(state, "Cannot turn: |left turns − right turns| would exceed 2.");
    }
    const direction = turn(state.direction, command);
    const next = commit(state, command, `${command}: facing ${directionName(direction)}`);
    next.leftCount = leftCount;
    next.rightCount = rightCount;
    next.lastTurn = command;
    next.direction = direction;
    return ok(next);
  }

  // Rule 3: cannot PICK twice without dropping.
  if (command === "PICK") {
    if (state.carrying) {
      return fail(state, "Cannot PICK: already carrying an object (DROP first).");
    }
    const key = `${state.x},${state.y}`;
    if (!state.objects.has(key)) {
      return fail(state, `Cannot PICK: no object at (${state.x}, ${state.y}).`);
    }
    const next = commit(state, "PICK", `PICK: object collected at (${state.x}, ${state.y})`);
    next.carrying = true;
    next.objects.delete(key);
    next.lastTurn = null;
    return ok(next);
  }

  // Rule 3: cannot DROP before PICK.
  if (command === "DROP") {
    if (!state.carrying) {
      return fail(state, "Cannot DROP: not carrying anything (PICK first).");
    }
    const next = commit(state, "DROP", null);
    const key = `${state.x},${state.y}`;
    next.carrying = false;
    next.completedTasks += 1;
    next.lastTurn = null;
    next.delivered.add(key);
    next.log.push(`DROP: object delivered at (${state.x}, ${state.y}) (${next.completedTasks} total)`);
    return ok(next);
  }

  // Rule 6: RECHARGE resets energy to full.
  if (command === "RECHARGE") {
    const next = commit(state, "RECHARGE", `RECHARGE: energy restored to ${MAX_ENERGY}`);
    next.energy = MAX_ENERGY;
    next.lastTurn = null;
    return ok(next);
  }

  return fail(state, `"${command}" is not in the alphabet.`);
}

// Returns the list of commands that would be accepted right now, so the UI
// can highlight which buttons are valid next moves.
export function allowedCommands(state) {
  const allowed = new Set();
  for (const command of ["START", "STOP", "F", "B", "L", "R", "PICK", "DROP", "RECHARGE"]) {
    if (applyLiveCommand(state, command).ok) {
      allowed.add(command);
    }
  }
  return allowed;
}

function commit(state, command, logEntry) {
  const next = {
    ...state,
    visited: new Set(state.visited),
    objects: new Set(state.objects),
    delivered: new Set(state.delivered),
    log: [...state.log],
    sequence: [...state.sequence, command],
    lastCommand: command
  };
  if (logEntry) {
    next.log.push(logEntry);
  }
  return next;
}

function ok(state) {
  return { ok: true, error: null, state };
}

function fail(state, error) {
  return { ok: false, error, state };
}
