# ZERO DAY — Game-Master Rules

Version 1.6 — original reconstructed mechanics, cyber-setting edition

These rules adapt the reconstructed **Asymmetric Warfare** mechanics to a conflict between a Corporation and Hackers. Only the setting and terminology have changed; the mechanics remain identical. The reconstruction is based on the archived description, screenshots, and player clarifications. Where the sources remain silent, minimum game-master rulings have been added to make the game playable; these are listed at the end.

Terminology: **State → Corporation**, **Insurgent → Hackers**, **Capital → Data Core**, **Grow → Propagate**, **Kill → Purge**, and **Interrogate → Trace**.

## 1. Overview

**ZERO DAY** is a two-player game between:

- **The Corporation:** superior power, limited information.
- **The Hackers:** complete information, limited resources.

The Corporation wins by purging **12 Hacker pieces** cumulatively. The Hackers win by establishing a qualifying presence in the **Core Ring**.

There are no combat rolls. Corporation security pieces cannot be removed; Hackers cannot remove Corporation pieces.

## 2. Board

The board contains **49 spaces**:

- The central **Data Core**.
- Four concentric rings labeled **B, C, D, and E**.
- Twelve numbered spaces in each ring: **1–12**.

The rings are:

- **B — Core Ring:** surrounds the Data Core.
- **C and D — middle rings.**
- **E — Perimeter:** the Hacker starting area.

A move must go to a space sharing a border with the piece's current space. This includes movement between rings where spaces share a border.

**No piece may enter the Data Core.** Corporation pieces begin there but cannot re-enter after leaving.

## 3. Pieces and reserve

### Corporation

- Five Corporation security pieces.
- All five begin in the Data Core.
- Corporation pieces cannot be purged.

### Hackers

- Five starting pieces.
- Ten additional pieces initially available for propagation.
- At most **15 active Hacker pieces** can be on the board at once.

Purged Hackers are **returned to the available pool** and may later be produced through propagation again.

The Corporation's purge count is **cumulative**. Returning purged pieces to the pool does not reduce this count.

## 4. Setup

1. Place the five Corporation pieces in the Data Core.
2. The Hackers freely choose five different spaces in ring **E**.
3. Place one Hacker piece in each chosen space. Initial Hacker stacking is prohibited.
4. Set **Hackers Available to 10**.
5. Set **Hackers Purged to 0**.
6. The Hackers take the first turn.

Because each starting space contains only one Hacker, the starting pieces are hidden from the Corporation.

## 5. Visibility

### Hacker information

The Hackers see the complete board, including all Corporation and Hacker pieces.

### Corporation information

The Corporation sees:

- All Corporation pieces.
- The exact number of Hackers in every space containing a Corporation piece.
- The exact number of Hackers in every space containing **two or more Hackers**.
- Information obtained through tracing.

A single Hacker not sharing a space with a Corporation piece remains hidden unless revealed by tracing.

Visibility from stacking is automatic and continuous:

- If two or more Hackers occupy a space, the Corporation sees their exact number.
- If movement reduces the stack to one, that remaining piece becomes hidden unless a Corporation piece occupies the space or another visibility effect applies.

Propagation has **no additional visibility effect** beyond this rule.

## 6. Turns and actions

Players alternate turns:

1. Hacker turn.
2. Corporation turn.
3. Continue alternating.

Each player receives **two actions per turn**.

A player may:

- Use both actions in any legal combination available to their side.
- End the turn after using only one action.
- **Pass**, ending the turn without performing any further action.

### Movement action

For either side, one movement action:

- Consumes **one action**.
- Moves **one friendly piece**.
- Moves it to **one adjacent space**.

The same piece may be moved with both actions in a turn.

### Special actions

- The Hackers spend **one action** to **Propagate**.
- The Corporation spends **one action** to **Purge** or **Trace**.
- No movement or special action is available at zero actions; the player must end the turn.
- All special actions remain subject to their normal eligibility conditions.

There is no limit on same-side stacking during play.

## 7. Hacker propagation

The Hackers may use **Propagate** when:

- Exactly **two Hacker pieces** occupy the chosen space.
- At least one Hacker is available in the pool.

Resolve propagation as follows:

1. Spend one action.
2. Remove one piece from the available pool.
3. Add it to the chosen space.
4. The original two pieces remain, producing a **three-piece stack**.

The stack is visible to the Corporation because it contains more than one Hacker.

Propagation is not possible:

- With only one Hacker in the space.
- With three or more Hackers already in the space.
- When the available pool is empty.

## 8. Opposing pieces in one space

Hackers may enter a Corporation-occupied space, and Corporation pieces may enter a Hacker-occupied space.

There is **no immediate automatic countermeasure**. The Corporation detects the Hackers and may deal with them using Purge or Trace:

- Immediately, if it is the Corporation turn and an action remains.
- On a later Corporation turn otherwise.

Because the space contains a Corporation piece, the Corporation sees the exact number of co-located Hackers.

The Hackers may move away on their next turn if the Corporation has not purged the pieces.

## 9. Corporation Purge action

The Corporation may Purge when at least one Hacker occupies the same space as the acting Corporation piece.

For one action:

1. Remove **all Hackers** from that space.
2. Increase the cumulative purge count by the number removed.
3. Return those pieces to the Hacker available pool.
4. Check for Corporation victory.

The Corporation piece remains in the space.

## 10. Corporation Trace action

The Corporation may Trace when at least one Hacker occupies the same space as the acting Corporation piece.

For one action:

- Identify every **border-sharing adjacent space** containing one or more Hackers.
- Include adjacent spaces in every ring, not merely spaces in the tracing piece's ring.
- Reveal the exact occupied space coordinates, but not the number of Hackers in those adjacent spaces.

After tracing:

- All pieces remain in their current spaces.
- The Corporation may Purge, Trace, or move if an action remains.
- Repeated tracing is permitted when actions are available.

Tracing provides a **snapshot of current positions**. It does not track Hackers if they subsequently move.

## 11. Victory

### Hacker victory

At the end of a Hacker turn, the Hackers win by occupying either:

1. **At least four paired-or-connected spaces in ring B:** at least four occupied B spaces can be selected so that every selected space shares a border with at least one other selected occupied B space; or
2. **Any six of the twelve spaces in ring B**, regardless of adjacency.

For the four-space condition, the qualifying spaces may form one continuous group or two separated pairs. Isolated spaces cannot be part of the qualifying set of four.

Examples:

- **B2, B3, B4, B5:** valid — one connected group of four.
- **B2, B3, B7, B8:** valid — two separated pairs.
- **B2, B3, B4, B8:** invalid — a connected group of three plus an isolated space.
- **B2, B3, B6, B9:** invalid — one pair and two isolated spaces.
- Any six occupied B spaces: valid, even if all are isolated.

There is no requirement to enter the Data Core.

### Corporation victory

The Corporation wins **immediately when its cumulative purge count reaches 12**.

If one Purge action removes enough pieces to pass from below 12 to 12 or more, the Corporation wins immediately.

### No other endings

There is:

- No turn limit.
- No draw.
- No stalemate result.
- No special repeated-pass ending.

## 12. Turn checklists

### Hacker turn

1. Receive two actions.
2. Spend each action on either:
   - Move one Hacker to an adjacent space; or
   - Propagate an eligible two-piece stack into three pieces.
3. Pass or end the turn, using any remaining actions first if desired.
4. Check for four paired-or-connected occupied B spaces or any six occupied B spaces.
5. If neither condition is met, begin the Corporation turn.

### Corporation turn

1. Receive two actions.
2. Spend each action on one of these actions, if desired:
   - Move one Corporation piece to an adjacent space;
   - Purge all co-located Hackers; or
   - Trace co-located Hackers.
3. After every Purge, update the purge count and available pool.
4. If the purge count reaches 12, win immediately.
5. Otherwise, pass or end the turn.

## 13. Additional examples

### Propagation

Two Hackers occupy C4, and ten pieces are available.

The Hackers spend one action to Propagate:

- C4 now contains three Hackers.
- Available pieces decrease from ten to nine.
- The Hackers have one action remaining.
- The Corporation can see that C4 contains exactly three Hackers.

### Purge and recycling

A Corporation piece shares a space with two Hackers. The Corporation spends one action to Purge:

- Both Hackers are removed.
- The purge count increases by two.
- The available pool increases by two.
- The Corporation has one action remaining.
- The pieces may be produced again through later propagation.

If three Hackers had occupied the space, all three would be removed. If this raises the purge count from ten to twelve or more, the Corporation wins immediately.

### Tracing

A Corporation piece shares C5 with one Hacker. The Corporation spends one action to Trace:

- The Hacker remains at C5.
- The Corporation learns which spaces sharing a border with C5 contain Hackers.
- This includes adjacent spaces in rings B, C, and D where applicable.
- The Corporation does not learn how many Hackers occupy those neighboring spaces.
- The Corporation has one action remaining.

## 14. Game-master rulings added for completeness

The source material and clarifications leave a few procedural details unstated. These rules use the following interpretations:

1. A movement action moves **one piece**, not an entire stack.
2. Same-side stacks have **no maximum size**, but Propagate requires exactly two pieces.
3. Tracing is a **current-position snapshot**, rather than an ongoing tracking effect.
4. Hackers have no attack action and cannot remove Corporation pieces.

These four interpretations should be corrected if contrary evidence from the original digital game becomes available.
