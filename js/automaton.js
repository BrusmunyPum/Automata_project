import { COMMANDS, MAX_ENERGY } from "./constants.js";
import { getMovementDelta, isInsideGrid, turn } from "./movement.js";

export function tokenize(input) {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.toUpperCase());
}

export function validateCommands(commands) {
  const errors = [];
  const trace = [];

  if (commands.length === 0) {
    return {
      valid: false,
      errors: ["The sequence is empty."],
      trace: []
    };
  }

  // Rule 1: must start with START and end with STOP
  validateStartAndStop(commands, errors);

  // DFA-style state variables
  let energy = MAX_ENERGY;
  let hasMoved = false;
  let carrying = false;
  let completedTasks = 0;
  let lastTurn = null;       // Rule 10: no two turns in a row
  let leftCount = 0;         // Rule 14: |left - right| <= 2
  let rightCount = 0;
  let seenStop = false;
  let x = 0;
  let y = 0;
  let direction = "N";

  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index];
    const position = index + 1;

    if (!COMMANDS.has(command)) {
      errors.push(`Command ${position}: "${command}" is not in the alphabet.`);
      continue;
    }

    if (index > 0 && command === "START") {
      errors.push(`Command ${position}: START can only appear at the beginning.`);
    }

    if (seenStop) {
      errors.push(`Command ${position}: no command is allowed after STOP.`);
    }

    if (command === "STOP") {
      seenStop = true;
      trace.push(snapshot(index, command, energy, carrying, completedTasks, leftCount, rightCount));
      continue;
    }

    if (index === 0 && command === "START") {
      trace.push(snapshot(index, command, energy, carrying, completedTasks, leftCount, rightCount));
      continue;
    }

    // Rule 6: F and B consume 1 energy
    if (command === "F" || command === "B") {
      if (energy === 0) {
        errors.push(`Command ${position}: ${command} needs energy, but energy is 0.`);
      } else {
        energy -= 1;
      }

      const delta = getMovementDelta(direction, command);
      const nextX = x + delta.x;
      const nextY = y + delta.y;

      if (!isInsideGrid(nextX, nextY)) {
        errors.push(`Command ${position}: ${command} moves outside the 8x8 grid.`);
      } else {
        x = nextX;
        y = nextY;
      }

      hasMoved = true;
      lastTurn = null;
    }

    // Rule 10 (overwrites Rule 5): no two turns in a row
    // Turns do NOT cost energy (Rule 11 is not assigned)
    if (command === "L" || command === "R") {
      if (lastTurn !== null) {
        errors.push(`Command ${position}: cannot turn twice in a row (${lastTurn} then ${command}).`);
      }

      if (command === "L") {
        leftCount += 1;
      } else {
        rightCount += 1;
      }

      // Rule 14: |left - right| must not exceed 2
      if (Math.abs(leftCount - rightCount) > 2) {
        errors.push(`Command ${position}: |left turns - right turns| cannot exceed 2.`);
      }

      lastTurn = command;
      direction = turn(direction, command);
    }

    // Rule 3: PICK before DROP, no double PICK
    if (command === "PICK") {
      if (carrying) {
        errors.push(`Command ${position}: cannot PICK while already carrying an object.`);
      }
      carrying = true;
      lastTurn = null;
    }

    if (command === "DROP") {
      if (!carrying) {
        errors.push(`Command ${position}: cannot DROP before PICK.`);
      } else {
        completedTasks += 1;
      }
      carrying = false;
      lastTurn = null;
    }

    // Rule 6: RECHARGE resets energy to full (no restriction on when)
    if (command === "RECHARGE") {
      energy = MAX_ENERGY;
      lastTurn = null;
    }

    trace.push(snapshot(index, command, energy, carrying, completedTasks, leftCount, rightCount));
  }

  validateFinalState({
    errors,
    hasMoved,
    completedTasks,
    carrying
  });

  return {
    valid: errors.length === 0,
    errors,
    trace
  };
}

function validateStartAndStop(commands, errors) {
  if (commands[0] !== "START") {
    errors.push("The first command must be START.");
  }

  if (commands[commands.length - 1] !== "STOP") {
    errors.push("The last command must be STOP.");
  }
}

function validateFinalState(state) {
  // Rule 2: at least one movement
  if (!state.hasMoved) {
    state.errors.push("The robot must perform at least one movement command: F or B.");
  }

  // Rule 8 (overwrites Rule 4): at least TWO pick-drop tasks
  if (state.completedTasks < 2) {
    state.errors.push("The robot must complete at least two PICK-DROP tasks.");
  }

  // Rule 3: cannot finish while carrying
  if (state.carrying) {
    state.errors.push("The robot cannot finish while still carrying an object.");
  }
}

function snapshot(index, command, energy, carrying, completedTasks, leftCount, rightCount) {
  return {
    index,
    command,
    energy,
    carrying,
    completedTasks,
    leftCount,
    rightCount
  };
}
