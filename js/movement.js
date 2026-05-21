import { DIRECTIONS, GRID_SIZE } from "./constants.js";

export function getMovementDelta(direction, command) {
  const forward = {
    N: { x: 0, y: 1 },
    E: { x: 1, y: 0 },
    S: { x: 0, y: -1 },
    W: { x: -1, y: 0 }
  }[direction];

  if (command === "F") {
    return forward;
  }

  return {
    x: -forward.x,
    y: -forward.y
  };
}

export function turn(direction, command) {
  const currentIndex = DIRECTIONS.indexOf(direction);
  const offset = command === "R" ? 1 : -1;
  return DIRECTIONS[(currentIndex + offset + DIRECTIONS.length) % DIRECTIONS.length];
}

export function directionName(direction) {
  return {
    N: "North",
    E: "East",
    S: "South",
    W: "West"
  }[direction];
}

export function isInsideGrid(x, y) {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}
