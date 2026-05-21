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

  validateStartAndStop(commands, errors);

  // These variables are the DFA-style state. Each command updates this state,
  // and invalid transitions add an error.
  let energy = MAX_ENERGY;
  let hasMoved = false;
  let carrying = false;
  let completedTasks = 0;
  let lastMovement = null;
  let lastTurn = null;
  let leftCount = 0;
  let rightCount = 0;
  let seenStop = false;
  let foundCounterClockwiseLoop = false;
  let counterClockwisePairs = 0;
  let clockwisePairs = 0;
  let previousCommand = null;
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

      if (lastMovement === "F" && command === "B") {
        errors.push(`Command ${position}: B cannot immediately follow F.`);
      }

      if (lastMovement === "B" && command === "F") {
        errors.push(`Command ${position}: F cannot immediately follow B.`);
      }

      hasMoved = true;
      lastMovement = command;
      lastTurn = null;
    }

    if (command === "L" || command === "R") {
      if (energy === 0) {
        errors.push(`Command ${position}: ${command} needs energy, but energy is 0.`);
      } else {
        energy -= 1;
      }

      if (lastTurn === command) {
        errors.push(`Command ${position}: cannot turn ${command} twice in a row.`);
      }

      if (command === "L") {
        leftCount += 1;
      } else {
        rightCount += 1;
      }

      if (Math.abs(leftCount - rightCount) > 2) {
        errors.push(`Command ${position}: |left turns - right turns| cannot exceed 2.`);
      }

      lastTurn = command;
      lastMovement = null;
      direction = turn(direction, command);
    }

    if (command === "PICK") {
      if (carrying) {
        errors.push(`Command ${position}: cannot PICK while already carrying an object.`);
      }
      carrying = true;
      lastMovement = null;
      lastTurn = null;
    }

    if (command === "DROP") {
      if (!carrying) {
        errors.push(`Command ${position}: cannot DROP before PICK.`);
      } else {
        completedTasks += 1;
      }
      carrying = false;
      lastMovement = null;
      lastTurn = null;
    }

    if (command === "RECHARGE") {
      if (energy !== 0) {
        errors.push(`Command ${position}: RECHARGE is only allowed when energy is exactly 0.`);
      }
      energy = MAX_ENERGY;
      lastMovement = null;
      lastTurn = null;
    }

    if (previousCommand === "F" && command === "L") {
      counterClockwisePairs += 1;
    }

    if (previousCommand === "F" && command === "R") {
      clockwisePairs += 1;
    }

    if (counterClockwisePairs >= 4) {
      foundCounterClockwiseLoop = true;
    }

    if (clockwisePairs >= 4) {
      errors.push(`Command ${position}: clockwise loop (F R) x4 is not allowed.`);
    }

    trace.push(snapshot(index, command, energy, carrying, completedTasks, leftCount, rightCount));
    previousCommand = command;
  }

  validateFinalState({
    errors,
    hasMoved,
    completedTasks,
    carrying,
    foundCounterClockwiseLoop
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
  if (!state.hasMoved) {
    state.errors.push("The robot must perform at least one movement command: F or B.");
  }

  if (state.completedTasks < 2) {
    state.errors.push("The robot must complete at least two PICK-DROP tasks.");
  }

  if (state.carrying) {
    state.errors.push("The robot cannot finish while still carrying an object.");
  }

  if (!state.foundCounterClockwiseLoop) {
    state.errors.push("The sequence must include at least one counter-clockwise loop: (F L) x4.");
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
