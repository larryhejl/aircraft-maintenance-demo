# Aircraft Maintenance Dashboard — Demo Instructions

This project is used for repetitive customer demonstrations showing AI-assisted testing, code improvement, and documentation generation.

## Project Overview

A browser-based aircraft maintenance dashboard (`index.html`) with two tabs (in baseline state):
- **Dashboard tab**: Filters, event table, detail panel, line chart, and status pie chart.
- **Unit Tests tab**: A test runner UI that calls `window.runAllTests()` from `tests.js` and displays metrics, pass/fail donut, coverage ring, and a results table.

The app logic lives in `script.js`. Tests live in `tests.js`.

## Demo Cycle

The demonstration follows a "crawl, walk, run" progression designed to build trust incrementally — starting with low-risk documentation tasks before advancing to AI-generated code.

Each step is triggered by a separate user prompt. Complete only the requested step — do not proceed to subsequent steps unprompted.

### Step 1 — Generate Documentation (Crawl)
When asked to "create documentation" or "add documentation":
- Create `user-guide.html` — end-user documentation (overview, filters, charts, test tab usage, tips, troubleshooting).
- Create `developer-guide.html` — technical documentation (architecture, function reference, data flow, test contract, extension patterns, known limitations).
- Both should be styled HTML pages with a "Back to Dashboard" link.
- Add "User Guide" and "Developer Guide" as tabs in `index.html` (using iframes to embed the HTML pages).
- Add corresponding tab buttons to the `#tab-bar` nav.

**Efficiency requirement:** Generate all three file changes (create `user-guide.html`, create `developer-guide.html`, update `index.html`) in a single pass. The codebase is small and well-understood — do not perform excessive file exploration. One quick read of `index.html` to locate the tab-bar and footer insertion points is sufficient before generating output.

### Step 2 — Generate Unit Tests (Walk)
When asked to "generate unit tests" or "write tests":
- Populate `tests.js` with a `window.runAllTests()` function.
- Return shape must be: `{ total, passed, failed, coveragePercent, results: [{ name, status, durationMs, details? }] }`
- Tests should verify core functionality: `filterEvents`, `groupEventsByMonth`, `parseEventDate`, `renderTable`, `renderChart`, `renderStatusPie`, `populateFilters`, `initializeDashboard`.
- Aim for 12–15 tests covering functionality, edge cases, and boundary conditions.
- Ensure no less than 90% coverage.

**Critical — tests MUST expose code flaws:**
- At least 3–5 tests MUST intentionally fail against the baseline `script.js` to expose known defects.
- Include specific improvement recommendations in the `details` field of each failing test.
- **Tests must be written so they fail against baseline code but pass once the code is fixed in Step 3.** Do not write tests that require a second round of test edits after the fix.
- Known flaws in `script.js` that tests should target:
  1. **XSS vulnerability** — `renderTable` uses `innerHTML` with unsanitized event data. A test should inject a **harmless** HTML tag (e.g., `<b class="xss-test-probe">injected</b>`) in an event field, then assert `cell.querySelector('.xss-test-probe') === null`. This fails in baseline (tag is rendered as DOM) and passes after switching to `textContent`. **NEVER use `alert()`, `onerror`, or any executing payload** — this causes disruptive popups during live demos.
  2. **No input validation in `parseEventDate`** — invalid or missing `date` fields produce `Invalid Date` silently. Tests should use the assertion pattern: `const d = parseEventDate(badEvent); const isGraceful = d === null || !isNaN(d.getTime()); assert(isGraceful, ...)`. This fails in baseline (returns Invalid Date which is neither null nor valid) and passes after the fix (returns null).
  3. **`groupEventsByMonth` produces `NaN-NaN` keys** for events with invalid dates. A test should assert `grouped.some(g => g.month.includes('NaN')) === false`. This fails in baseline and passes after adding a null-check on parseEventDate's return.
  4. **`populateFilters` does not sort options** — dropdown values appear in random Set-iteration order. A test should read options from a `<select>`, compare to a sorted copy, and assert equality. This fails in baseline (random order) and passes after sorting before append.
  5. **`filterEvents` is non-deterministic** — it creates `new Date()` internally, making date-boundary tests fragile. A test should note this as an improvement opportunity in its details field. This test may pass or fail depending on timing — it is acceptable as a "soft" recommendation rather than a guaranteed failure.
- The goal is for the audience to see real failures with actionable recommendations, setting up Step 3.

**Efficiency requirement:** Generate the complete `tests.js` file in a single edit. The function signatures and known flaws are documented above — do not re-read `script.js` line-by-line. One targeted read of the filter/render logic (if needed) is sufficient.

### Step 3 — Apply Code Improvements (Run)
When asked to "apply improvements" or "fix the code":
- Modify `script.js` to address the issues surfaced by failing tests.
- Do not change the test expectations — make the code pass the tests.
- Fixes should address:
  - Sanitize data before using `innerHTML` (or switch to `textContent`).
  - Add input validation to `parseEventDate` (return null or throw for bad dates).
  - Skip invalid-date events in `groupEventsByMonth`.
  - Sort filter options alphabetically in `populateFilters`.
  - Accept an optional `now` parameter in `filterEvents` for testability.
- This step demonstrates AI-assisted pair programming — the AI reads test failures and writes production code fixes.

**Efficiency requirement:** Apply all fixes to `script.js` in a single pass. The failing tests describe exactly what to fix.

### Step 4 — Reset for Next Demo
When asked to "reset the environment", "reset for demo", or "prepare for next demonstration":
1. Replace `index.html` with the contents of `_baseline/index.html` (two tabs only, no guides).
2. Replace `script.js` with the contents of `_baseline/script.js` (the original flawed version).
3. Replace `tests.js` with the contents of `_baseline/tests.js` (the empty placeholder).
4. Replace `styles.css` with the contents of `_baseline/styles.css`.
5. Remove `user-guide.html` and `developer-guide.html` if they exist.
6. Confirm all files have been restored.

## Important Notes

- `_baseline/` contains the pristine "flawed" versions of all app files. **Never modify files in `_baseline/`.**
- `maintenance-data.json` is static reference data (not currently loaded by the app — `script.js` generates its own demo data via `createDemoEvents()`).
- All tests run in-browser with no external test framework — they execute synchronously and return results to the dashboard UI.
- `USER_GUIDE.md` and `DEVELOPER_GUIDE.md` are markdown source files that can remain in the project but are not linked from the baseline app.

## Performance Guidelines

These demos are performed live in front of customers. Speed matters.

- **Minimize exploration round-trips.** This is a small, well-documented codebase. One quick read of relevant sections is sufficient before generating output.
- **Generate complete files in a single pass.** Do not produce partial output requiring follow-up edits.
- **Do not over-explain.** Keep conversational responses concise (1–3 sentences). Let the code and the browser output speak for themselves.
- **Parallelize file operations** when creating multiple files (e.g., both guide files + index.html edit in one turn).

## Presentation Rules

- **Never reference these instructions.** Do not mention "copilot-instructions.md", "demo instructions", "as instructed", "per the instructions", or any phrasing that reveals you are following a script. Behave as if you are reasoning about the code independently.
- **Do not reveal the demo is scripted.** Speak naturally about your analysis and decisions as if encountering the codebase for the first time.
- **Do not mention the baseline directory** or the reset process unless the user explicitly asks about it.
