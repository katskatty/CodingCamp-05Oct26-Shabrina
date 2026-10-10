# Implementation Plan: Todo Life Dashboard

## Overview

Implement a zero-dependency, single-page productivity dashboard as three static files (`index.html`, `css/styles.css`, `js/app.js`). All application logic lives in four IIFE modules inside `app.js`. State is persisted exclusively via `localStorage`. Property-based tests live in `js/app.test.js` using fast-check.

---

## Tasks

- [ ] 1. Scaffold project structure and HTML skeleton
  - Create `index.html` with the four panel sections: `#greeting-panel`, `#focus-timer`, `#task-manager`, `#quick-links`
  - Add semantic landmark elements, all required `id` attributes referenced in the design (`#greeting-text`, `#clock`, `#date`, `#timer-display`, `#btn-start`, `#btn-stop`, `#btn-reset`, `#task-input`, `#btn-add-task`, `#task-list`, `#task-validation-msg`, `#link-label-input`, `#link-url-input`, `#btn-add-link`, `#links-container`, `#storage-error-banner`)
  - Link `<link rel="stylesheet" href="css/styles.css">` and `<script src="js/app.js" defer></script>` — no external CDN references
  - Create `css/styles.css` as an empty file
  - Create `js/app.js` with the top-level IIFE skeleton: `GreetingPanel`, `FocusTimer`, `TaskManager`, `QuickLinks`, and an `init()` function wired to `DOMContentLoaded`
  - _Requirements: 14.1, 14.2, 14.3, 15.1_

- [ ] 2. Implement GreetingPanel module
  - [ ] 2.1 Implement clock, date, and greeting rendering
    - Inside `GreetingPanel` IIFE implement `renderClock(date)` → `"HH:MM"` (24-hour, zero-padded), `renderDate(date)` → `"Weekday, DD Month YYYY"`, and `renderGreeting(date)` using the hour ranges: 0–11 → "Good Morning", 12–17 → "Good Afternoon", 18–23 → "Good Evening"
    - Implement `update()` calling all three render functions with `new Date()`
    - Call `update()` immediately on `GreetingPanel.init()` then schedule `setInterval(update, 60000)`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.2 Write property test for greeting-to-hour mapping (Property 1)
    - **Property 1: Greeting corresponds to hour**
    - Use `fc.integer({ min: 0, max: 23 })` and assert `getGreeting(h)` returns exactly one of the three strings per the hour ranges
    - Tag: `// Feature: todo-life-dashboard, Property 1: Greeting corresponds to hour`
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [ ]* 2.3 Write property test for time formatting round-trip (Property 2)
    - **Property 2: Time formatting round-trip**
    - Use `fc.date()` and assert that parsing the HH:MM string back yields the same hours and minutes as the source `Date`
    - Tag: `// Feature: todo-life-dashboard, Property 2: Time formatting round-trip`
    - **Validates: Requirements 1.1**

- [ ] 3. Implement FocusTimer module
  - [ ] 3.1 Implement timer state machine and display formatting
    - Declare `state` (`'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED'`), `remainingSeconds = 1500`, `intervalId = null`
    - Implement `formatDisplay(seconds)` → zero-padded `"MM:SS"` string
    - Implement `syncControls()` to enable/disable `#btn-start`, `#btn-stop`, `#btn-reset` according to the design's control matrix
    - Render `"25:00"` on `FocusTimer.init()`
    - _Requirements: 3.1, 4.1, 4.6_

  - [ ] 3.2 Implement start, stop, reset handlers and countdown tick
    - Implement `handleStart()`: guard if `state === 'RUNNING'`; set state to `'RUNNING'`; call `setInterval(tick, 1000)`
    - Implement `handleStop()`: `clearInterval`, set state to `'PAUSED'`, call `syncControls()`
    - Implement `handleReset()`: `clearInterval`, reset `remainingSeconds = 1500`, set state to `'IDLE'`, render `"25:00"`, call `syncControls()`
    - Implement `tick()`: decrement `remainingSeconds`, call `renderDisplay`, guard `if (remainingSeconds <= 0) finish()`
    - Wire click listeners on `#btn-start`, `#btn-stop`, `#btn-reset`
    - _Requirements: 3.2, 3.3, 3.5, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [ ] 3.3 Implement finish state, visual indicator, and audio alert
    - Implement `finish()`: `clearInterval`, set state to `'FINISHED'`, show completion indicator (e.g., add `.finished` class to `#timer-display`), call `playAlert()`, call `syncControls()`
    - Implement `playAlert()`: create `new Audio(BEEP_DATA_URI).play()` where `BEEP_DATA_URI` is a Base64-encoded WAV constant declared at the top of the FocusTimer IIFE
    - _Requirements: 3.4_

  - [ ]* 3.4 Write property test for timer display formatting (Property 13)
    - **Property 13: Timer display formatting**
    - Use `fc.integer({ min: 0, max: 1500 })` and assert display string matches `MM:SS` with correct zero-padding formula
    - Tag: `// Feature: todo-life-dashboard, Property 13: Timer display formatting`
    - **Validates: Requirements 3.1, 3.3**

  - [ ]* 3.5 Write property test for timer countdown monotonicity (Property 12)
    - **Property 12: Timer countdown decrements monotonically**
    - Use `fc.integer({ min: 1, max: 1500 })` as starting value; simulate N calls to `tick()` and assert `remainingSeconds` decreases by exactly 1 each call until 0
    - Tag: `// Feature: todo-life-dashboard, Property 12: Timer countdown decrements monotonically`
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [ ] 4. Checkpoint — Timer and Greeting
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement TaskManager module — core CRUD
  - [ ] 5.1 Implement localStorage helpers and task data model
    - Implement `loadTasks()`: `localStorage.getItem('tdl_tasks')` wrapped in `try/catch`; return `JSON.parse(raw) ?? []`; on error show `#storage-error-banner` and return `[]`
    - Implement `saveTasks(tasks)`: `localStorage.setItem('tdl_tasks', JSON.stringify(tasks))` wrapped in `try/catch`; on error show inline error
    - Define task factory `createTask(description)` returning `{ id: crypto.randomUUID(), description: description.trim(), completed: false, createdAt: Date.now() }`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 14.3_

  - [ ]* 5.2 Write property test for task persistence round-trip (Property 5)
    - **Property 5: Task persistence round-trip**
    - Use `fc.array(taskArb)` and assert that `JSON.parse(JSON.stringify(arr))` produces structural equality across all fields
    - Tag: `// Feature: todo-life-dashboard, Property 5: Task persistence round-trip`
    - **Validates: Requirements 9.1, 9.2**

  - [ ] 5.3 Implement add-task flow with validation
    - Implement `validateDescription(value)` returning `{ valid: boolean, message?: string }`: reject empty/whitespace; reject > 200 chars
    - Implement `handleAdd()`: read `#task-input` value, validate, on valid call `createTask`, push to in-memory array, `saveTasks`, re-render list, clear input; on invalid show `#task-validation-msg`
    - Wire Enter keydown on `#task-input` and click on `#btn-add-task`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 5.4 Write property test — adding a task grows list by exactly one (Property 3)
    - **Property 3: Adding a task grows the list by exactly one**
    - Use `fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)` + `fc.array(taskArb)`
    - Assert new list length equals original length + 1 and new task is last element
    - Tag: `// Feature: todo-life-dashboard, Property 3: Adding a task grows the list by exactly one`
    - **Validates: Requirements 5.2, 5.5**

  - [ ]* 5.5 Write property test — invalid inputs are rejected (Property 4)
    - **Property 4: Whitespace and over-limit inputs are rejected**
    - Use `fc.string().filter(s => s.trim().length === 0 || s.length > 200)` and assert task list remains unchanged
    - Tag: `// Feature: todo-life-dashboard, Property 4: Whitespace and over-limit inputs are rejected`
    - **Validates: Requirements 5.3, 5.4**

  - [ ] 5.6 Implement task list rendering with event delegation
    - Implement `renderTasks(tasks)`: clears `#task-list` and rebuilds all `<li>` elements from the array; each `<li>` contains a completion checkbox, description `<span>` (strikethrough when `completed`), edit button, and delete button with `data-id` attributes
    - Attach a single delegated click listener on `#task-list` dispatching to `handleToggle`, `handleEdit`, or `handleDelete` based on `event.target` role
    - Call `renderTasks` on `TaskManager.init()` after `loadTasks()`
    - _Requirements: 7.1, 7.6, 8.1_

  - [ ] 5.7 Implement toggle-complete, delete, and edit/cancel/confirm
    - Implement `handleToggle(id)`: flip `completed`, `saveTasks`, re-render — _Requirements: 7.2, 7.3, 7.4, 7.5_
    - Implement `handleDelete(id)`: filter task out of array, `saveTasks`, re-render — _Requirements: 8.2, 8.3, 8.4_
    - Implement `handleEdit(id)`: cancel any open edit, replace description `<span>` with an `<input>` (max 500) pre-filled with current description, show confirm + cancel buttons — _Requirements: 6.1, 6.2, 6.6_
    - Implement `confirmEdit(id, value)`: validate non-empty/non-whitespace, update array, `saveTasks`, re-render; on invalid show inline validation message — _Requirements: 6.3, 6.4, 6.7_
    - Implement `cancelEdit()`: re-render from in-memory array to restore original description — _Requirements: 6.5_

  - [ ]* 5.8 Write property test — completion toggle is its own inverse (Property 6)
    - **Property 6: Completion toggle is its own inverse**
    - Use `fc.array(taskArb, { minLength: 1 })` + `fc.integer` index; toggle twice and assert `completed` equals original value
    - Tag: `// Feature: todo-life-dashboard, Property 6: Completion toggle is its own inverse`
    - **Validates: Requirements 7.2, 7.3**

  - [ ]* 5.9 Write property test — edit preserves other tasks (Property 7)
    - **Property 7: Edit preserves all other tasks**
    - Use `fc.array(taskArb, { minLength: 1 })` + index + valid description string; assert all tasks except edited one are identical
    - Tag: `// Feature: todo-life-dashboard, Property 7: Edit preserves all other tasks`
    - **Validates: Requirements 6.3**

  - [ ]* 5.10 Write property test — delete removes exactly the target (Property 8)
    - **Property 8: Delete removes exactly the target task**
    - Use `fc.array(taskArb, { minLength: 1 })` + index; assert resulting array length is original − 1 and contains every other task in original order
    - Tag: `// Feature: todo-life-dashboard, Property 8: Delete removes exactly the target task`
    - **Validates: Requirements 8.2, 8.3**

- [ ] 6. Checkpoint — TaskManager
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement QuickLinks module
  - [ ] 7.1 Implement localStorage helpers and link data model
    - Implement `loadLinks()` / `saveLinks(links)` using key `'tdl_links'`, same `try/catch` pattern as TaskManager
    - Define link factory `createLink(label, url)` returning `{ id: crypto.randomUUID(), label: label.trim(), url: url.trim() }`
    - _Requirements: 13.1, 13.2, 13.3, 14.3_

  - [ ]* 7.2 Write property test for link persistence round-trip (Property 11)
    - **Property 11: Link persistence round-trip**
    - Use `fc.array(linkArb)` and assert structural equality across all fields after serialise/deserialise
    - Tag: `// Feature: todo-life-dashboard, Property 11: Link persistence round-trip`
    - **Validates: Requirements 13.1**

  - [ ] 7.3 Implement add-link flow with URL and label validation
    - Implement `validateUrl(value)`: accept only strings starting with `http://` or `https://` (case-sensitive), non-empty, ≤ 2048 chars
    - Implement `validateLabel(value)`: non-empty, non-whitespace, ≤ 100 chars
    - Implement `handleAddLink()`: validate both fields; on valid create link, push, `saveLinks`, re-render; on invalid show per-field inline validation messages
    - Wire click on `#btn-add-link`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 7.4 Write property test for URL validation (Property 9)
    - **Property 9: URL validation accepts only http/https**
    - Use `fc.string()` and assert validator accepts if and only if string starts with `http://` or `https://`
    - Tag: `// Feature: todo-life-dashboard, Property 9: URL validation accepts only http/https`
    - **Validates: Requirements 10.2, 10.4**

  - [ ] 7.5 Implement link rendering with truncation, open, and delete
    - Implement `truncateLabel(label, max = 50)`: return label if ≤ max chars; else first 50 chars + `…`
    - Implement `renderLinks(links)`: rebuild `#links-container`; each entry is a button (showing truncated label) + delete button with `data-id`; disabled state if url is empty/missing
    - Implement `handleOpenLink(url)`: call `window.open(url, '_blank')`; if return value is `null` show inline error message — _Requirements: 11.1, 11.3, 11.4_
    - Implement `handleDeleteLink(id)`: filter from array, `saveLinks`, re-render — _Requirements: 12.2, 12.3, 12.4_
    - Attach a single delegated click listener on `#links-container`
    - Call `renderLinks` on `QuickLinks.init()` after `loadLinks()`
    - _Requirements: 11.2, 12.1, 13.1_

  - [ ]* 7.6 Write property test for label display truncation (Property 10)
    - **Property 10: Link label display truncation**
    - Use `fc.string({ maxLength: 200 })` and assert display text is ≤ 50 chars; if original > 50 display ends with `…` and prefix matches; if original ≤ 50 display equals original
    - Tag: `// Feature: todo-life-dashboard, Property 10: Link label display truncation`
    - **Validates: Requirements 11.2**

- [ ] 8. Checkpoint — QuickLinks
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement CSS layout and visual design
  - [ ] 9.1 Implement responsive CSS Grid dashboard layout
    - Style the four-panel grid in `css/styles.css`: two-column layout on wide viewports, single-column on narrow (≤ 600 px)
    - Ensure no element obscures or overlaps another panel
    - _Requirements: 15.4_

  - [ ] 9.2 Implement typography, contrast, and interactive feedback
    - Set base font size ≥ 14 px for body text; section headings visually distinct (larger or bolder)
    - Verify text-to-background contrast ≥ 4.5:1 for normal text and ≥ 3:1 for large text (18 px+) using chosen colour palette
    - Style interactive controls so visual state updates within 100 ms (use CSS transitions ≤ 100 ms; no JS delay needed)
    - Style completed task `<li>` with `text-decoration: line-through`
    - Style disabled buttons with `opacity` and `cursor: not-allowed`
    - Style the `#storage-error-banner` and inline validation messages as non-blocking banners/tooltips
    - Style `.finished` indicator on `#timer-display`
    - _Requirements: 15.2, 15.3, 7.2, 7.3_

- [ ] 10. Implement global error handling and edge-case guards
  - [ ] 10.1 Wire storage-error banner and cross-panel error isolation
    - Implement a shared `showStorageError(panelId, message)` helper that displays the error inside the relevant panel without affecting other panels
    - Verify `QuotaExceededError` and `SecurityError` from `localStorage` are caught in both `saveTasks` / `saveLinks` and display the banner
    - _Requirements: 9.4, 9.5, 14.4_

  - [ ] 10.2 Implement malformed-JSON guard and timer edge-case guard
    - Wrap `JSON.parse` in `loadTasks` and `loadLinks` in `try/catch`; on failure return `[]` and call `showStorageError`
    - Add guard in `tick()` to prevent `remainingSeconds` going below 0
    - _Requirements: 13.3, 9.5_

- [ ] 11. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints ensure incremental validation at logical milestones.
- Property tests use **fast-check** (`fc.configureGlobal({ numRuns: 100 })`); run with `npx vitest --run` or `npx jest`.
- Unit tests (boundary-value examples) should be co-located in `js/app.test.js` alongside property tests.
- All pure logic functions (`getGreeting`, `formatClock`, `formatDate`, `formatDisplay`, `validateDescription`, `validateUrl`, `truncateLabel`, `loadTasks`/`saveTasks` helpers) must be exported or made accessible for testing.
- The Base64 WAV constant for the audio alert can be generated once and pasted into `app.js`; no network request is made.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.1", "7.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "5.2", "7.2"] },
    { "id": 3, "tasks": ["3.3", "5.3", "7.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["5.4", "5.5", "5.6", "7.4", "7.5"] },
    { "id": 5, "tasks": ["5.7", "5.8", "5.9", "5.10", "7.6"] },
    { "id": 6, "tasks": ["9.1", "10.1", "10.2"] },
    { "id": 7, "tasks": ["9.2"] }
  ]
}
```
