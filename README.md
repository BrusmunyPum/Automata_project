# Robot Navigation Using Finite Automata

This project is a visual robot navigation simulator for an Automata assignment. It validates command sequences with finite-automaton-style state rules before running the robot simulation on an 8x8 grid.

## How To Run

Open `index.html` in a browser.

No installation, build command, or external library is required. The project uses plain HTML, CSS, and JavaScript modules.

## How To Use

1. Type or edit a command sequence in the command box.
2. Click `Validate` to check the sequence.
3. If the sequence is valid, click `Run` to simulate the robot.
4. Click `Reset` to return the robot to the starting state.

## Command Alphabet

The command language uses these symbols:

```text
START
STOP
F
B
L
R
PICK
DROP
RECHARGE
```

Meaning:

- `START`: begins the sequence
- `STOP`: ends the sequence
- `F`: move forward
- `B`: move backward
- `L`: turn left
- `R`: turn right
- `PICK`: pick up an object
- `DROP`: drop the object
- `RECHARGE`: reset energy to full

## Main Rules

The validator checks these rules before simulation:

- The sequence must start with `START`.
- The sequence must end with `STOP`.
- The robot must perform at least one movement command: `F` or `B`.
- The robot must complete at least two `PICK` then `DROP` tasks.
- The robot cannot `DROP` before `PICK`.
- The robot cannot `PICK` twice without dropping.
- The robot cannot finish while still carrying an object.
- The robot cannot immediately reverse movement:
  - `F` followed immediately by `B` is invalid.
  - `B` followed immediately by `F` is invalid.
- The robot cannot turn the same direction twice in a row:
  - `L L` is invalid.
  - `R R` is invalid.
- Energy capacity is 5.
- `F`, `B`, `L`, and `R` each consume 1 energy.
- Movement or turning is invalid when energy is 0.
- `RECHARGE` is only valid when energy is exactly 0.
- The robot must stay inside the 8x8 grid.
- At any point, `|number of L turns - number of R turns| <= 2`.
- The sequence must include at least four `F L` pairs.
- The sequence must not include four `F R` pairs.

## Starting State

The robot starts with:

```text
Position: (0, 0)
Direction: North
Energy: 5 / 5
Carrying object: No
Completed tasks: 0
```

Grid coordinates go from `(0, 0)` to `(7, 7)`.

## Example Valid Sequence

```text
START R F L F R RECHARGE F L PICK DROP F R F RECHARGE F L PICK DROP F L STOP
```

## Example Invalid Sequence

```text
START F R F R F R F R PICK PICK DROP STOP
```

This is invalid because it creates a clockwise loop and also attempts to pick twice without dropping.

## Project Structure

```text
.
+-- index.html
+-- README.md
+-- Project-automata.pdf
+-- css/
|   +-- style.css
+-- js/
    +-- main.js
    +-- automaton.js
    +-- simulator.js
    +-- renderer.js
    +-- movement.js
    +-- constants.js
```

## File Explanation

- `index.html`: main page layout
- `css/style.css`: all UI styling and animation
- `js/main.js`: connects buttons, validation, running, and reset
- `js/automaton.js`: validates command sequences using automaton state variables
- `js/simulator.js`: updates robot state during simulation
- `js/renderer.js`: updates the grid, status cards, timeline, logs, and energy UI
- `js/movement.js`: helper functions for movement, turning, direction names, and grid bounds
- `js/constants.js`: shared constants such as grid size, max energy, directions, and command alphabet

## Automaton State Variables

The validator tracks these state values:

```text
energy
hasMoved
carrying
completedTasks
lastMovement
lastTurn
leftCount
rightCount
seenStop
counterClockwisePairs
clockwisePairs
position
direction
```

Each command causes a transition by updating these values. If a command violates a rule, the validator records an error and rejects the sequence.

## UI Features

- 8x8 visual grid
- 3D-style robot marker
- command validation messages
- command timeline with active step highlighting
- automatic simulation with `Run`
- `Validate`, `Run`, and `Reset` controls
- animated energy cells
- robot state dashboard
- execution log

## Notes

The project validates the command sequence before running the visual simulation. This is important because the assignment requires the finite automaton design to enforce the language rules, not only the simulator.
