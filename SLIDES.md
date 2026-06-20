---
marp: true
theme: default
paginate: true
size: 16:9
---

<!-- _paginate: false -->

# Robot Navigation Using Finite Automata

### An 8×8 grid robot driven by a DFA-validated command language

**Brusmuny Pum**
Automata Theory — Course Project

---

## The Problem

- A robot moves on an **8×8 grid** using simple commands.
- Not every command sequence makes sense — there are **rules**.
- The set of *legal* sequences is a **formal language**.
- A **finite automaton** is the natural machine to decide:
  > *Is this command sequence valid — yes or no?*

**Goal:** design that automaton, then *show* it working visually.

---

## The Command Alphabet (Σ)

| Symbol | Meaning | Symbol | Meaning |
|--------|---------|--------|---------|
| `START` | begin | `L` / `R` | turn left / right |
| `STOP` | end | `PICK` | pick up object |
| `F` | forward | `DROP` | drop object |
| `B` | backward | `RECHARGE` | refill energy |

A command **sequence** is a string over this alphabet, e.g.
`START F R F PICK DROP ... STOP`

---

## The World

- Grid **8×8**, cells `(0,0)` … `(7,7)`; `(0,0)` is bottom-left.
- Robot starts at **(0,0)**, facing **North**, **energy 3/3**, carrying nothing.
- **Objects** sit on cells (default `(2,1)`, `(4,2)`).
- `PICK` works only **on** an object cell; the object is then consumed.
- Directions cycle **N → E → S → W** (`R` forward, `L` backward).

---

## The Rules (the language)

1. Start with `START`, end with `STOP`
2. At least one movement (`F`/`B`)
3. `PICK` before `DROP`; no double `PICK`; can't end carrying
6. Movement needs energy; `RECHARGE` refills to full
8. At least **two** `PICK`–`DROP` tasks *(overwrites #4)*
10. **No two turns in a row** *(overwrites #5)*
14. At all times **|left − right turns| ≤ 2**

---

## Why It Is a (Large) DFA

Every tracked quantity has a **finite range** → finite state set:

| Component | Range |
|-----------|-------|
| Energy | 0–3 |
| Tasks | 0, 1, ≥2 |
| Carrying | yes / no |
| Last turn | none / L / R |
| Turn balance (L−R) | −2 … +2 |
| Position / Direction | 64 cells / 4 facings |

State = the **product** of these. Stored as variables, not enumerated.

---

## The Automaton — Phases

```
        START                 F/B/L/R/PICK/DROP/RECHARGE
[Init] ───────► [Started] ◄──────────────┐ (if the rule holds)
                   │  └───────────────────┘
                   │ STOP  (moved ∧ tasks≥2 ∧ not carrying)
                   ▼
              [Accepted]
```

Each transition out of **Started** is **guarded** by its rule.
Guard fails → command **rejected**, state unchanged, reason shown.

---

## Transition Guards

| Symbol | Allowed only if… |
|--------|------------------|
| `F` / `B` | energy > 0 **and** target cell inside grid |
| `L` / `R` | last symbol not a turn **and** \|L−R\| stays ≤ 2 |
| `PICK` | not carrying **and** object on this cell |
| `DROP` | currently carrying |
| `STOP` | moved **and** tasks ≥ 2 **and** not carrying |

---

## System Architecture

```
index.html ── layout, command box, control pad, grid
css/style.css ── styling, markers, animations
js/
 ├ constants.js  energy, grid, alphabet, objects
 ├ movement.js   direction & grid maths
 ├ automaton.js  BATCH validator (whole sequence)
 ├ live.js       LIVE automaton (one command at a time)
 ├ renderer.js   draws grid / status / log
 └ main.js       wires everything together
```

---

## Two Engines, One Language

- **Batch (`automaton.js`)** — checks a typed sequence, reports **all**
  errors, enforces `START`-first / `STOP`-last.
- **Live (`live.js`)** — applies **one** command at a time; also checks
  **object placement**; drives the manual control pad.

Same rules 1–14 in both; the live engine adds the physical-world checks.

---

## Feature: Manual Drive

- Click `START`, then `F/B/L/R/PICK/DROP/RECHARGE/STOP`.
- Each click = one automaton transition.
- **Smart buttons:** only *legal* commands are enabled.
  - On load → only `START`
  - After a turn → both turn buttons disabled (Rule 10)
  - `STOP` → enabled only when the run can legally finish

➡️ The automaton's current state becomes **visible**.

---

## Feature: Objects & Visuals

- Configurable **pickup objects** (`x,y` list).
- Box icon = object, check-circle = delivered cell.
- Robot marker shows facing; visited cells tinted.
- Status dashboard: position, direction, energy, tasks, carrying.
- Execution log + command timeline.

---

## Worked Example

```
START R F L F R RECHARGE F L PICK DROP
      F R F RECHARGE F L PICK DROP F L STOP
```

- Reaches **(2,1)** → PICK/DROP (task 1)
- Reaches **(4,2)** → PICK/DROP (task 2)
- `RECHARGE` used before energy hits 0
- No two turns adjacent; turn balance stays within ±2
- `STOP` accepted ✓

---

## Testing

All checked and behaving correctly:

- ✅ Default sequence **accepted**, both objects delivered
- ❌ Rejected (with clear reasons): missing START/STOP, no movement,
  DROP before PICK, double PICK, end while carrying, only one task,
  two turns in a row, |L−R| > 2, move with no energy
- ❌ `PICK` off an object cell rejected

---

## Conclusion

- Legal command sequences = a **formal language**.
- A **finite automaton** decides membership — implemented compactly
  with finite-range state variables.
- Validation runs in **batch** and **live** modes.
- The UI makes the automaton **observable**: smart buttons, live
  rejection messages, and a visual robot.

### Thank you — Questions?
