# Copilot instructions for this project

This is a Flask Sudoku game with a plain-JavaScript front end that I am
refactoring from legacy starter code. Follow these rules when suggesting
or editing code.

## Style
- Python: PEP 8, type hints on function signatures, docstrings on public
  functions, small functions with one job.
- JavaScript: const/let (no var), arrow functions, no inline HTML built
  from user text (use textContent, not innerHTML).
- Comment the *why*, not the obvious *what*.

## Architecture
- Keep game logic (puzzle generation, validation, solving) separate from
  Flask routes. Routes should only handle HTTP, not game rules.
- The solved puzzle should never be sent to the browser; only the puzzle
  and enough info to check answers server-side.

## Testing
- Use Python's built-in `unittest` (runs under pytest too).
- Add or update a test for every new function or bug fix.
- Run the full test suite after every change and confirm it passes
  before moving on.

## Working style
- Prefer the smallest change that solves the problem.
- If a suggestion adds a new dependency or framework, explain why first.
- Explain anything non-obvious in a short comment.