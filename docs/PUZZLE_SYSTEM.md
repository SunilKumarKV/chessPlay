# Puzzle System

## UI Flow

1. `/puzzles` loads stats, history, limits, and the next puzzle.
2. The board starts from the presented FEN.
3. User moves are checked locally for legality and submitted to the backend.
4. Correct moves advance the line; wrong moves show inline feedback.
5. Completion opens a learning summary modal.

## Hints

Hint levels are:

- Piece to move
- Target square
- Full move

Free users receive 1 hint per puzzle. Premium plans can receive up to 3 hints.

## Learning Summary

The completion modal shows:

- Theme
- Difficulty
- Rating
- What the user learned
- Best move explanation
- Next puzzle action

## Daily Counter

The UI displays remaining daily allowance using `/api/puzzles/limits/me`, such as `3/5 puzzles remaining today`.

## Difficulty Levels

- Beginner: 600-1100
- Intermediate: 1101-1700
- Advanced: 1701-2400
- Master: 2401+
