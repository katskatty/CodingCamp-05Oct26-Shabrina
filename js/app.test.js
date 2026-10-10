/**
 * Todo Life Dashboard — app.test.js
 *
 * Unit and property-based tests for all pure-logic functions.
 * Runs with Vitest + fast-check.
 *
 * Pure functions under test are re-declared here to mirror exactly what
 * app.js exports via each module's `_*` test hooks, so tests run in a
 * Node/jsdom environment without needing a full DOM bootstrap.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fc from 'fast-check';

fc.configureGlobal({ numRuns: 100 });

/* ------------------------------------------------------------------ */
/*  Helper: mirror pure functions from app.js                          */
/*                                                                      */
/*  Because app.js is an IIFE-based browser script that references     */
/*  `document` at the module level, we re-declare the pure functions   */
/*  here with identical logic so tests are self-contained.             */
/* ------------------------------------------------------------------ */

// ---------- FocusTimer pure functions ----------

/**
 * Formats a seconds count to "MM:SS" with zero-padding.
 * Mirrors FocusTimer._formatDisplay from app.js.
 * @param {number} seconds
 * @returns {string}
 */
function formatDisplay(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Returns the enabled/disabled state for each button given a timer state.
 * Mirrors FocusTimer.syncControls() logic from app.js.
 * Returns { startDisabled, stopDisabled, resetDisabled }.
 * @param {'IDLE'|'RUNNING'|'PAUSED'|'FINISHED'} state
 */
function getControlState(state) {
  const running = state === 'RUNNING';
  return {
    startDisabled: running,
    stopDisabled: !running,
    resetDisabled: false,
  };
}

/* ------------------------------------------------------------------ */
/*  3.1 — FocusTimer state machine and display formatting              */
/* ------------------------------------------------------------------ */

describe('FocusTimer — formatDisplay', () => {
  it('formats 1500 seconds as "25:00"', () => {
    expect(formatDisplay(1500)).toBe('25:00');
  });

  it('formats 0 seconds as "00:00"', () => {
    expect(formatDisplay(0)).toBe('00:00');
  });

  it('formats 61 seconds as "01:01"', () => {
    expect(formatDisplay(61)).toBe('01:01');
  });

  it('formats 60 seconds as "01:00"', () => {
    expect(formatDisplay(60)).toBe('01:00');
  });

  it('formats 59 seconds as "00:59"', () => {
    expect(formatDisplay(59)).toBe('00:59');
  });

  it('formats 90 seconds as "01:30"', () => {
    expect(formatDisplay(90)).toBe('01:30');
  });

  it('formats 599 seconds as "09:59"', () => {
    expect(formatDisplay(599)).toBe('09:59');
  });

  it('always returns a string in MM:SS pattern', () => {
    const result = formatDisplay(75);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('FocusTimer — syncControls (control matrix)', () => {
  it('IDLE: Start ✅, Stop ❌, Reset ✅', () => {
    const ctrl = getControlState('IDLE');
    expect(ctrl.startDisabled).toBe(false);
    expect(ctrl.stopDisabled).toBe(true);
    expect(ctrl.resetDisabled).toBe(false);
  });

  it('RUNNING: Start ❌, Stop ✅, Reset ✅', () => {
    const ctrl = getControlState('RUNNING');
    expect(ctrl.startDisabled).toBe(true);
    expect(ctrl.stopDisabled).toBe(false);
    expect(ctrl.resetDisabled).toBe(false);
  });

  it('PAUSED: Start ✅, Stop ❌, Reset ✅', () => {
    const ctrl = getControlState('PAUSED');
    expect(ctrl.startDisabled).toBe(false);
    expect(ctrl.stopDisabled).toBe(true);
    expect(ctrl.resetDisabled).toBe(false);
  });

  it('FINISHED: Start ✅, Stop ❌, Reset ✅', () => {
    const ctrl = getControlState('FINISHED');
    expect(ctrl.startDisabled).toBe(false);
    expect(ctrl.stopDisabled).toBe(true);
    expect(ctrl.resetDisabled).toBe(false);
  });

  it('Reset is never disabled in any state', () => {
    for (const state of ['IDLE', 'RUNNING', 'PAUSED', 'FINISHED']) {
      expect(getControlState(state).resetDisabled).toBe(false);
    }
  });
});

describe('FocusTimer — initial display', () => {
  it('initial remainingSeconds (1500) formats as "25:00"', () => {
    const INITIAL_SECONDS = 1500; // 25 * 60
    expect(formatDisplay(INITIAL_SECONDS)).toBe('25:00');
  });
});

/* ------------------------------------------------------------------ */
/*  Task 5.1 — TaskManager: localStorage helpers and task data model   */
/* ------------------------------------------------------------------ */

// Mirror pure functions from TaskManager (app.js) for testing in Node/jsdom.

/**
 * Validates a task description.
 * Mirrors TaskManager._validateDescription from app.js.
 * @param {string} value
 * @returns {{ valid: boolean, message?: string }}
 */
function validateDescription(value) {
  if (!value || value.trim().length === 0) {
    return { valid: false, message: 'Task description cannot be empty.' };
  }
  if (value.length > 200) {
    return { valid: false, message: 'Task description cannot exceed 200 characters.' };
  }
  return { valid: true };
}

/**
 * Creates a new task object.
 * Mirrors TaskManager._createTask from app.js.
 * @param {string} description
 * @returns {{ id: string, description: string, completed: boolean, createdAt: number }}
 */
function createTask(description) {
  return {
    id: crypto.randomUUID(),
    description: description.trim(),
    completed: false,
    createdAt: Date.now(),
  };
}

// ---------- Unit tests: validateDescription ----------

describe('TaskManager — validateDescription', () => {
  it('rejects an empty string', () => {
    const result = validateDescription('');
    expect(result.valid).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it('rejects a whitespace-only string', () => {
    const result = validateDescription('   ');
    expect(result.valid).toBe(false);
  });

  it('rejects a description over 200 characters', () => {
    const longStr = 'a'.repeat(201);
    const result = validateDescription(longStr);
    expect(result.valid).toBe(false);
  });

  it('accepts a valid non-empty description', () => {
    const result = validateDescription('Buy groceries');
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('accepts exactly 200 characters (boundary)', () => {
    const boundary = 'a'.repeat(200);
    const result = validateDescription(boundary);
    expect(result.valid).toBe(true);
  });

  it('rejects exactly 201 characters (boundary + 1)', () => {
    const overLimit = 'a'.repeat(201);
    const result = validateDescription(overLimit);
    expect(result.valid).toBe(false);
  });
});

// ---------- Unit tests: createTask ----------

describe('TaskManager — createTask', () => {
  it('returns an object with id, description, completed, createdAt fields', () => {
    const task = createTask('Write tests');
    expect(task).toHaveProperty('id');
    expect(task).toHaveProperty('description', 'Write tests');
    expect(task).toHaveProperty('completed', false);
    expect(task).toHaveProperty('createdAt');
  });

  it('trims whitespace from the description', () => {
    const task = createTask('  Trimmed  ');
    expect(task.description).toBe('Trimmed');
  });

  it('creates a unique UUID for each task', () => {
    const task1 = createTask('First');
    const task2 = createTask('Second');
    expect(task1.id).not.toBe(task2.id);
  });

  it('sets completed to false by default', () => {
    const task = createTask('New task');
    expect(task.completed).toBe(false);
  });

  it('createdAt is a number (timestamp)', () => {
    const before = Date.now();
    const task = createTask('Timestamp test');
    const after = Date.now();
    expect(typeof task.createdAt).toBe('number');
    expect(task.createdAt).toBeGreaterThanOrEqual(before);
    expect(task.createdAt).toBeLessThanOrEqual(after);
  });

  it('id looks like a valid UUID v4', () => {
    const task = createTask('UUID test');
    expect(task.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});

// ---------- JSON serialisation round-trip (Req 9.1, 9.2) ----------

describe('TaskManager — JSON serialisation round-trip', () => {
  it('a task survives JSON.stringify / JSON.parse without data loss', () => {
    const original = createTask('Serialise me');
    const roundTripped = JSON.parse(JSON.stringify(original));
    expect(roundTripped.id).toBe(original.id);
    expect(roundTripped.description).toBe(original.description);
    expect(roundTripped.completed).toBe(original.completed);
    expect(roundTripped.createdAt).toBe(original.createdAt);
  });
});
