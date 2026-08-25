## Module Organization & Spacing

- Order files by reading flow: imports → public types → internal types → module constants & state → primary exports → supporting functions & private
  helpers.
- Group imports (Node built-ins, external packages, relative modules, type-only) separated by a single blank line.
- Separate top-level declarations and distinct constant groups with exactly one blank line.
- Use paragraph-style spacing inside functions: separate guard clauses, data preparation, DOM/state updates, and cleanup with a single blank line.
- Never use consecutive blank lines, and avoid blank lines immediately after `{` or before `}`.
- Declare variables as close to their first point of use as possible.

## Control Flow

- Put a space before the opening brace of every block, such as `if (...) {`, `try {`, `catch (...) {`, and `else {`.
- Always use braces for every branch in an `if`/`else` chain.
- A single-statement `if` may omit braces only when it has no `else`, such as a guard clause that returns or throws.

## Git Hooks

Pre-commit runs `biome check --write` on staged `.ts` files, `tsc --noEmit`, and the full test suite.

Never bypass hooks with `--no-verify` or `SKIP_SIMPLE_GIT_HOOKS=1`.

## Issue and PR Guidelines

- Never create an issue.
- Never create a PR.
