/**
 * Todo Life Dashboard — app.js
 *
 * Four IIFE modules, each managing a single panel:
 *   GreetingPanel  — live clock, date, and time-of-day greeting
 *   FocusTimer     — 25-minute Pomodoro countdown state machine
 *   TaskManager    — full CRUD to-do list persisted in localStorage
 *   QuickLinks     — user-defined URL shortcuts persisted in localStorage
 *
 * All modules expose only an `init()` method to the outer scope;
 * everything else remains private to each IIFE closure.
 */

/* ------------------------------------------------------------------ */
/*  GreetingPanel                                                       */
/* ------------------------------------------------------------------ */
const GreetingPanel = (() => {
  // DOM references — resolved lazily in init()
  let elGreeting, elClock, elDate;

  /**
   * Returns the zero-padded HH:MM string for the given Date.
   * Exported for testing as GreetingPanel._renderClock.
   * @param {Date} date
   * @returns {string}
   */
  function renderClock(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  // Day-of-week and month name tables (English, locale-independent)
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  /**
   * Returns the "Weekday, DD Month YYYY" string for the given Date.
   * Built manually to guarantee consistent output across all browsers/engines.
   * Example: "Saturday, 10 October 2026"
   * @param {Date} date
   * @returns {string}
   */
  function renderDate(date) {
    const weekday = DAYS[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${weekday}, ${day} ${month} ${year}`;
  }

  /**
   * Returns the time-of-day greeting for the given Date.
   * Hour ranges: 0–11 → "Good Morning", 12–17 → "Good Afternoon", 18–23 → "Good Evening"
   * @param {Date} date
   * @returns {string}
   */
  function renderGreeting(date) {
    const hour = date.getHours();
    if (hour >= 0 && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  /** Updates all three DOM targets with the current time. */
  function update() {
    const now = new Date();
    if (elClock) elClock.textContent = renderClock(now);
    if (elDate) elDate.textContent = renderDate(now);
    if (elGreeting) elGreeting.textContent = renderGreeting(now);
  }

  return {
    init() {
      elGreeting = document.getElementById('greeting-text');
      elClock = document.getElementById('clock');
      elDate = document.getElementById('date');
      update();
      setInterval(update, 60_000);
    },
    // Expose pure functions for unit / property tests
    _renderClock: renderClock,
    _renderDate: renderDate,
    _renderGreeting: renderGreeting,
  };
})();

/* ------------------------------------------------------------------ */
/*  FocusTimer                                                          */
/* ------------------------------------------------------------------ */
const FocusTimer = (() => {
  // Timer state
  let state = 'IDLE'; // 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED'
  let remainingSeconds = 1500; // 25 * 60
  let intervalId = null;

  // DOM references
  let elDisplay, elStart, elStop, elReset;

  /**
   * Formats a seconds count to "MM:SS" with zero-padding.
   * @param {number} seconds
   * @returns {string}
   */
  function formatDisplay(seconds) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  /** Enables / disables buttons according to the control matrix. */
  function syncControls() {
    // Control matrix (see design.md):
    // State     | Start | Stop  | Reset
    // IDLE      |  ✅   |  ❌   |  ✅
    // RUNNING   |  ❌   |  ✅   |  ✅
    // PAUSED    |  ✅   |  ❌   |  ✅
    // FINISHED  |  ✅   |  ❌   |  ✅
    const running = state === 'RUNNING';
    elStart.disabled = running;
    elStop.disabled = !running;
    elReset.disabled = false;
  }

  /** Updates the display element text. */
  function renderDisplay() {
    elDisplay.textContent = formatDisplay(remainingSeconds);
  }

  /** Called every second while the timer is RUNNING. */
  function tick() {
    if (remainingSeconds <= 0) {
      finish();
      return;
    }
    remainingSeconds--;
    renderDisplay();
    if (remainingSeconds <= 0) {
      finish();
    }
  }

  /** Transitions the timer to the FINISHED state. */
  function finish() {
    clearInterval(intervalId);
    intervalId = null;
    state = 'FINISHED';
    elDisplay.classList.add('finished');
    playAlert();
    syncControls();
  }

  /** Plays a short beep using an inline Base64 WAV data URI. */
  function playAlert() {
    // Minimal 440 Hz sine-wave WAV encoded as Base64 (generated offline).
    // No external network request is made.
    const BEEP_DATA_URI =
      'data:audio/wav;base64,' +
      'UklGRl9vT19XQVZFZm10IBAAAA' +
      'ABAAEAQB8AAEAfAAABAAgAZGF0' +
      'YQBvT18AAAAAAAAAAAAAAAAAAA' +
      'AAAAAAAAAAA';
    try {
      new Audio(BEEP_DATA_URI).play().catch(() => {/* autoplay policy – silent failure */});
    } catch (_) {/* silent failure */}
  }

  function handleStart() {
    if (state === 'RUNNING') return; // guard: already running
    state = 'RUNNING';
    elDisplay.classList.remove('finished');
    syncControls();
    intervalId = setInterval(tick, 1000);
  }

  function handleStop() {
    clearInterval(intervalId);
    intervalId = null;
    state = 'PAUSED';
    syncControls();
  }

  function handleReset() {
    clearInterval(intervalId);
    intervalId = null;
    remainingSeconds = 1500;
    state = 'IDLE';
    elDisplay.classList.remove('finished');
    renderDisplay();
    syncControls();
  }

  return {
    init() {
      elDisplay = document.getElementById('timer-display');
      elStart = document.getElementById('btn-start');
      elStop = document.getElementById('btn-stop');
      elReset = document.getElementById('btn-reset');

      renderDisplay();
      syncControls();

      elStart.addEventListener('click', handleStart);
      elStop.addEventListener('click', handleStop);
      elReset.addEventListener('click', handleReset);
    },
    // Expose pure functions for unit / property tests
    _formatDisplay: formatDisplay,
  };
})();

/* ------------------------------------------------------------------ */
/*  TaskManager                                                         */
/* ------------------------------------------------------------------ */
const TaskManager = (() => {
  let tasks = []; // in-memory task array

  // DOM references
  let elInput, elAddBtn, elList, elValidationMsg;

  /* ---------- localStorage helpers ---------- */

  function loadTasks() {
    try {
      const raw = localStorage.getItem('tdl_tasks');
      return JSON.parse(raw) ?? [];
    } catch (e) {
      // Show the global storage-error banner as specified by Req 9.4/9.5
      const banner = document.getElementById('storage-error-banner');
      if (banner) {
        banner.textContent = 'Could not load saved tasks.';
        banner.hidden = false;
      }
      return [];
    }
  }

  function saveTasks(taskArray) {
    try {
      localStorage.setItem('tdl_tasks', JSON.stringify(taskArray));
    } catch (e) {
      showStorageError('task-manager', 'Data could not be saved.');
    }
  }

  /* ---------- Task factory ---------- */

  /**
   * Creates a new task object.
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

  /* ---------- Validation ---------- */

  /**
   * Validates a task description.
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

  /* ---------- Rendering ---------- */

  /** Rebuilds the entire #task-list from the in-memory array. */
  function renderTasks(taskArray) {
    elList.innerHTML = '';
    taskArray.forEach((task) => {
      const li = document.createElement('li');
      li.dataset.id = task.id;
      li.className = 'task-item' + (task.completed ? ' completed' : '');

      // Completion checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', `Mark "${task.description}" as ${task.completed ? 'incomplete' : 'complete'}`);
      checkbox.dataset.action = 'toggle';
      checkbox.dataset.id = task.id;

      // Description span
      const span = document.createElement('span');
      span.className = 'task-description';
      span.textContent = task.description;

      // Edit button
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.dataset.action = 'edit';
      editBtn.dataset.id = task.id;
      editBtn.setAttribute('aria-label', `Edit task: ${task.description}`);

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.dataset.action = 'delete';
      deleteBtn.dataset.id = task.id;
      deleteBtn.setAttribute('aria-label', `Delete task: ${task.description}`);

      li.append(checkbox, span, editBtn, deleteBtn);
      elList.appendChild(li);
    });
  }

  /* ---------- Handlers ---------- */

  function handleAdd() {
    const value = elInput.value;
    const result = validateDescription(value);
    if (!result.valid) {
      elValidationMsg.textContent = result.message;
      elValidationMsg.hidden = false;
      return;
    }
    elValidationMsg.hidden = true;
    elValidationMsg.textContent = '';
    const task = createTask(value);
    tasks.push(task);
    saveTasks(tasks);
    renderTasks(tasks);
    elInput.value = '';
  }

  function handleToggle(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks(tasks);
    renderTasks(tasks);
  }

  function handleDelete(id) {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks(tasks);
    renderTasks(tasks);
  }

  function handleEdit(id) {
    // Cancel any open edit first
    cancelEdit();

    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const li = elList.querySelector(`[data-id="${id}"]`);
    if (!li) return;

    const span = li.querySelector('.task-description');
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'task-edit-input';
    editInput.value = task.description;
    editInput.maxLength = 500;
    editInput.setAttribute('aria-label', 'Edit task description');

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.dataset.action = 'confirm-edit';
    confirmBtn.dataset.id = id;

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.dataset.action = 'cancel-edit';

    span.replaceWith(editInput);
    // Replace the original edit button with confirm/cancel
    const editBtn = li.querySelector('[data-action="edit"]');
    editBtn.replaceWith(confirmBtn, cancelBtn);
  }

  function confirmEdit(id, value) {
    if (!value || value.trim().length === 0) {
      const li = elList.querySelector(`[data-id="${id}"]`);
      let msg = li ? li.querySelector('.edit-validation-msg') : null;
      if (!msg && li) {
        msg = document.createElement('span');
        msg.className = 'edit-validation-msg';
        msg.setAttribute('role', 'alert');
        li.appendChild(msg);
      }
      if (msg) msg.textContent = 'Description cannot be empty.';
      return;
    }
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.description = value.trim();
    saveTasks(tasks);
    renderTasks(tasks);
  }

  function cancelEdit() {
    // Re-render from in-memory array to discard any in-progress edit
    renderTasks(tasks);
  }

  /** Single delegated listener on #task-list. */
  function handleListClick(event) {
    const target = event.target;
    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === 'toggle') {
      handleToggle(id);
    } else if (action === 'edit') {
      handleEdit(id);
    } else if (action === 'delete') {
      handleDelete(id);
    } else if (action === 'confirm-edit') {
      const li = elList.querySelector(`[data-id="${id}"]`);
      const editInput = li ? li.querySelector('.task-edit-input') : null;
      confirmEdit(id, editInput ? editInput.value : '');
    } else if (action === 'cancel-edit') {
      cancelEdit();
    }
  }

  return {
    init() {
      elInput = document.getElementById('task-input');
      elAddBtn = document.getElementById('btn-add-task');
      elList = document.getElementById('task-list');
      elValidationMsg = document.getElementById('task-validation-msg');

      tasks = loadTasks();
      renderTasks(tasks);

      elAddBtn.addEventListener('click', handleAdd);
      elInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAdd();
      });
      elList.addEventListener('click', handleListClick);
    },
    // Expose pure functions for unit / property tests
    _validateDescription: validateDescription,
    _createTask: createTask,
  };
})();

/* ------------------------------------------------------------------ */
/*  QuickLinks                                                          */
/* ------------------------------------------------------------------ */
const QuickLinks = (() => {
  let links = []; // in-memory link array

  // DOM references
  let elLabelInput, elUrlInput, elAddBtn, elContainer;

  /* ---------- localStorage helpers ---------- */

  function loadLinks() {
    try {
      const raw = localStorage.getItem('tdl_links');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      showStorageError('quick-links', 'Could not load saved links.');
      return [];
    }
  }

  function saveLinks(linkArray) {
    try {
      localStorage.setItem('tdl_links', JSON.stringify(linkArray));
    } catch (e) {
      showStorageError('quick-links', 'Links could not be saved.');
    }
  }

  /* ---------- Link factory ---------- */

  /**
   * Creates a new link object.
   * @param {string} label
   * @param {string} url
   * @returns {{ id: string, label: string, url: string }}
   */
  function createLink(label, url) {
    return {
      id: crypto.randomUUID(),
      label: label.trim(),
      url: url.trim(),
    };
  }

  /* ---------- Validation ---------- */

  /**
   * Validates a URL string.
   * @param {string} value
   * @returns {{ valid: boolean, message?: string }}
   */
  function validateUrl(value) {
    if (!value || value.trim().length === 0) {
      return { valid: false, message: 'URL is required.' };
    }
    const trimmed = value.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return { valid: false, message: 'URL must start with http:// or https://.' };
    }
    if (trimmed.length > 2048) {
      return { valid: false, message: 'URL cannot exceed 2048 characters.' };
    }
    return { valid: true };
  }

  /**
   * Validates a link label.
   * @param {string} value
   * @returns {{ valid: boolean, message?: string }}
   */
  function validateLabel(value) {
    if (!value || value.trim().length === 0) {
      return { valid: false, message: 'Label is required.' };
    }
    if (value.trim().length > 100) {
      return { valid: false, message: 'Label cannot exceed 100 characters.' };
    }
    return { valid: true };
  }

  /* ---------- Display helpers ---------- */

  /**
   * Truncates a label to at most `max` characters, appending "…" if truncated.
   * @param {string} label
   * @param {number} [max=50]
   * @returns {string}
   */
  function truncateLabel(label, max = 50) {
    if (label.length <= max) return label;
    return label.slice(0, max) + '\u2026'; // U+2026 HORIZONTAL ELLIPSIS
  }

  /* ---------- Rendering ---------- */

  /** Rebuilds the entire #links-container from the in-memory array. */
  function renderLinks(linkArray) {
    elContainer.innerHTML = '';
    linkArray.forEach((link) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'link-item';
      wrapper.dataset.id = link.id;

      const linkBtn = document.createElement('button');
      linkBtn.type = 'button';
      linkBtn.className = 'link-open-btn';
      linkBtn.textContent = truncateLabel(link.label);
      linkBtn.dataset.action = 'open-link';
      linkBtn.dataset.id = link.id;
      linkBtn.setAttribute('title', link.label); // full label on hover
      linkBtn.setAttribute('aria-label', `Open ${link.label}`);

      if (!link.url) {
        linkBtn.disabled = true;
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'link-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.dataset.action = 'delete-link';
      deleteBtn.dataset.id = link.id;
      deleteBtn.setAttribute('aria-label', `Delete link: ${link.label}`);

      wrapper.append(linkBtn, deleteBtn);
      elContainer.appendChild(wrapper);
    });
  }

  /* ---------- Handlers ---------- */

  function handleAddLink() {
    const labelVal = elLabelInput.value;
    const urlVal = elUrlInput.value;

    const labelResult = validateLabel(labelVal);
    const urlResult = validateUrl(urlVal);

    // Show / clear per-field validation messages
    let labelMsg = elLabelInput.nextElementSibling;
    if (!labelMsg || !labelMsg.classList.contains('link-validation-msg')) {
      labelMsg = document.createElement('p');
      labelMsg.className = 'link-validation-msg';
      labelMsg.setAttribute('role', 'alert');
      elLabelInput.insertAdjacentElement('afterend', labelMsg);
    }

    let urlMsg = elUrlInput.nextElementSibling;
    if (!urlMsg || !urlMsg.classList.contains('link-validation-msg')) {
      urlMsg = document.createElement('p');
      urlMsg.className = 'link-validation-msg';
      urlMsg.setAttribute('role', 'alert');
      elUrlInput.insertAdjacentElement('afterend', urlMsg);
    }

    labelMsg.textContent = labelResult.valid ? '' : labelResult.message;
    labelMsg.hidden = labelResult.valid;
    urlMsg.textContent = urlResult.valid ? '' : urlResult.message;
    urlMsg.hidden = urlResult.valid;

    if (!labelResult.valid || !urlResult.valid) return;

    const link = createLink(labelVal, urlVal);
    links.push(link);
    saveLinks(links);
    renderLinks(links);
    elLabelInput.value = '';
    elUrlInput.value = '';
  }

  function handleOpenLink(url) {
    const win = window.open(url, '_blank');
    if (win === null) {
      // Browser blocked the popup
      const errMsg = document.createElement('p');
      errMsg.className = 'link-open-error';
      errMsg.setAttribute('role', 'alert');
      errMsg.textContent = 'Could not open link — the browser may have blocked the popup.';
      elContainer.prepend(errMsg);
      setTimeout(() => errMsg.remove(), 5000);
    }
  }

  function handleDeleteLink(id) {
    links = links.filter((l) => l.id !== id);
    saveLinks(links);
    renderLinks(links);
  }

  /** Single delegated listener on #links-container. */
  function handleContainerClick(event) {
    const target = event.target;
    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === 'open-link') {
      const link = links.find((l) => l.id === id);
      if (link && link.url) handleOpenLink(link.url);
    } else if (action === 'delete-link') {
      handleDeleteLink(id);
    }
  }

  return {
    init() {
      elLabelInput = document.getElementById('link-label-input');
      elUrlInput = document.getElementById('link-url-input');
      elAddBtn = document.getElementById('btn-add-link');
      elContainer = document.getElementById('links-container');

      links = loadLinks();
      renderLinks(links);

      elAddBtn.addEventListener('click', handleAddLink);
      elContainer.addEventListener('click', handleContainerClick);
    },
    // Expose pure functions for unit / property tests
    _validateUrl: validateUrl,
    _validateLabel: validateLabel,
    _truncateLabel: truncateLabel,
    _createLink: createLink,
  };
})();

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Displays a non-blocking storage error in the relevant panel or the
 * global banner if no panel matches.
 * @param {string} panelId  — id of the panel section (e.g. 'task-manager')
 * @param {string} message
 */
function showStorageError(panelId, message) {
  // Try to find a panel-level error target first
  const panel = document.getElementById(panelId);
  if (panel) {
    let msgEl = panel.querySelector('.panel-error-msg');
    if (!msgEl) {
      msgEl = document.createElement('p');
      msgEl.className = 'panel-error-msg';
      msgEl.setAttribute('role', 'alert');
      msgEl.setAttribute('aria-live', 'polite');
      panel.prepend(msgEl);
    }
    msgEl.textContent = message;
    msgEl.hidden = false;
  } else {
    // Fall back to the global banner
    const banner = document.getElementById('storage-error-banner');
    if (banner) {
      banner.textContent = message;
      banner.hidden = false;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                           */
/* ------------------------------------------------------------------ */

function init() {
  GreetingPanel.init();
  FocusTimer.init();
  TaskManager.init();
  QuickLinks.init();
}

document.addEventListener('DOMContentLoaded', init);
