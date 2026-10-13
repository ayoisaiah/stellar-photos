# AGENTS.md

## Module Organization & Spacing

- Order files by reading flow: imports → public types → internal types → module constants & state → functions & helpers → single exports block at the bottom.
- Use a single `export { ... }` block at the bottom of the file instead of prefixing functions or constants with inline `export`.
- Separate top-level declarations and distinct constant groups with exactly one blank line.
- Use paragraph-style spacing inside functions: separate guard clauses, data preparation, DOM/state updates, and cleanup with a single blank line.
- Never use consecutive blank lines, and avoid blank lines immediately after `{` or before `}`.
- Declare variables as close to their first point of use as possible.

## Control Flow

- Put a space before the opening brace of every block, such as `if (...) {`, `try {`, `catch (...) {`, and `else {`.
- Always use braces for every branch in an `if`/`else` chain.
- A single-statement `if` may omit braces only when it has no `else`, such as a guard clause that returns or throws.

## Code

- Delete before you add. The best change removes code.
- Don't validate data this extension wrote itself. Validate only at real boundaries: remote API responses, user input, and stored data that may come from an older or newer version.
- Don't feature-detect APIs that Chrome 150+ and Firefox 153+ both support.
- No wrappers that only rename or forward a call. Export the real thing.
- No dead code, unused exports, or optional parameters with a single caller.
- Don't split a call pair that always runs together.

## Performance

- The new-tab path is the hot path. Every storage read, write, network request, and decode on it needs a reason.
- Never write to storage when the value hasn't changed. Every write is broadcast to every open tab.
- Initial JS stays under the budget in `build.test.ts`. Panels load lazily.
- Never decode the same image twice. Blurred backdrops use the thumbnail.

## Testing

- Unit-test pure functions that have many input combinations or guard a security boundary. E2e-test everything that's wiring.
- A unit test that mocks more than one browser API must be an e2e test.
- Never assert that a mock was called. Assert what the user sees or what ends up in storage.
- Security boundaries always get tests with hostile inputs.
- Guard performance with deterministic budgets and counters, never timings.
- A bug fix lands with a test that fails without it.
- Changes to stored data shapes must keep reading what the previous release wrote.

## Git

- Pre-commit runs `biome check --write` on staged `.ts` files, `tsc --noEmit`, and the full test suite.
- Never bypass hooks with `--no-verify` or `SKIP_SIMPLE_GIT_HOOKS=1`.
- When committing, always follow existing repo conventions.

## Issue and PR Guidelines

- Never create an issue.
- Never create a PR.
