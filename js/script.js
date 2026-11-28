const STORAGE_KEY = 'taskr_tasks';
    let tasks = [];
    let activeFilter = 'all';
    let activePriority = 'all'; // 'all' | 'Low' | 'Medium' | 'High'
    let sortOrder = 'newest'; // 'newest' | 'oldest' | 'due' | 'priority' — tasks are stored newest-first

    // --- Dark mode toggle (dark is the default theme, choice persists) ---
    const THEME_KEY = 'taskr_theme';
    function applyTheme(theme) {
      const light = theme === 'light';
      document.body.classList.toggle('light', light);
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.textContent = light ? '🌙 Dark mode' : '☀️ Light mode';
    }
    function loadTheme() {
      try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; }
      catch { return 'dark'; }
    }
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const next = document.body.classList.contains('light') ? 'dark' : 'light';
      try { localStorage.setItem(THEME_KEY, next); } catch {}
      applyTheme(next);
    });
    let searchQuery = '';

    // --- Load from localStorage ---
    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        tasks = raw ? JSON.parse(raw) : [];
      } catch { tasks = []; }
    }

    // --- Save to localStorage ---
    function save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }

    // --- Add task (dueDate is an optional 'YYYY-MM-DD' string; priority defaults to Medium) ---
    function addTask(text, dueDate, priority) {
      const trimmed = text.trim();
      if (!trimmed) return;
      tasks.unshift({
        id: Date.now(),
        text: trimmed,
        priority: priority || 'Medium',
        completed: false,
        createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        dueDate: dueDate || null
      });
      save();
      render();
    }

    // --- Format a stored due date for display, e.g. 'Due 28 Oct' ---
    function formatDueDate(dueDate) {
      if (!dueDate) return '';
      const d = new Date(dueDate + 'T00:00:00');
      if (isNaN(d)) return '';
      return 'Due ' + d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }

    // --- Overdue: a due date before today on a task that is not completed ---
    function isOverdue(task) {
      if (!task || task.completed || !task.dueDate) return false;
      const due = new Date(task.dueDate + 'T00:00:00');
      if (isNaN(due)) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return due < today;
    }

    // --- Toggle complete ---
    function toggleTask(id) {
      const t = tasks.find(t => t.id === id);
      if (t) { t.completed = !t.completed; save(); render(); }
    }

    // --- Edit task (inline) ---
    function editTask(id, itemEl) {
      const t = tasks.find(t => t.id === id);
      if (!t || !itemEl) return;
      const span = itemEl.querySelector('.task-text');
      if (!span || itemEl.querySelector('.edit-input')) return;

      const input = document.createElement('input');
      input.className = 'edit-input';
      input.type = 'text';
      input.maxLength = 200;
      input.value = t.text;
      span.replaceWith(input);
      input.focus();
      input.select();

      let done = false;
      const commit = saveIt => {
        if (done) return;
        done = true;
        const text = input.value.trim();
        if (saveIt && text) { t.text = text; save(); }
        render();
      };
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') commit(true);
        if (e.key === 'Escape') commit(false);
      });
      input.addEventListener('blur', () => commit(true));
    }

    // --- Delete task: asks first, then offers a short undo window ---
    let lastDeleted = null; // { task, index } of the most recently deleted task
    let undoTimer = null;

    function hideUndoToast() {
      const toast = document.getElementById('undo-toast');
      if (toast) toast.style.display = 'none';
      if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
      lastDeleted = null;
    }

    function showUndoToast() {
      const toast = document.getElementById('undo-toast');
      if (!toast) return;
      if (undoTimer) clearTimeout(undoTimer);
      toast.style.display = 'flex';
      // Undo stays available for 5 seconds, then the deletion is final.
      undoTimer = setTimeout(hideUndoToast, 5000);
    }

    function undoDelete() {
      if (!lastDeleted) return;
      const { task, index } = lastDeleted;
      if (index >= 0 && index <= tasks.length) tasks.splice(index, 0, task);
      else tasks.unshift(task);
      hideUndoToast();
      save();
      render();
    }

    function deleteTask(id) {
      const index = tasks.findIndex(t => t.id === id);
      if (index === -1) return;
      if (!confirm('Delete "' + tasks[index].text + '"?')) return;
      lastDeleted = { task: tasks[index], index };
      tasks = tasks.filter(t => t.id !== id);
      save();
      render();
      showUndoToast();
    }

    // --- Duplicate task: copies text, due date and priority (not completed),
    // inserted right after the original and saved like a normal task ---
    function duplicateTask(id) {
      const index = tasks.findIndex(t => t.id === id);
      if (index === -1) return;
      const src = tasks[index];
      let newId = Date.now();
      while (tasks.some(t => t.id === newId)) newId++;
      const copy = {
        id: newId,
        text: src.text,
        priority: src.priority || 'Medium',
        completed: false,
        createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        dueDate: src.dueDate || null
      };
      tasks.splice(index + 1, 0, copy);
      save();
      render();
    }

    // --- Mark all complete: marks every pending task complete.
    // Clear Completed keeps working as before (it removes completed tasks).
    function markAllComplete() {
      if (!tasks.some(t => !t.completed)) return;
      tasks.forEach(t => { t.completed = true; });
      save();
      render();
    }

    // --- Clear completed ---
    function clearCompleted() {
      tasks = tasks.filter(t => !t.completed);
      save();
      render();
    }

    // --- Delete all tasks: removes every task after a confirm prompt,
    // so a stray click cannot wipe the list. Empty list is a no-op. ---
    function deleteAllTasks() {
      if (tasks.length === 0) return;
      const label = tasks.length === 1 ? '1 task' : tasks.length + ' tasks';
      if (!confirm('Delete all ' + label + '? This cannot be undone.')) return;
      tasks = [];
      save();
      render();
    }

    // --- Export tasks: downloads the current task list as a plain-text file ---
    function exportTasks() {
      const lines = ['TASKR — My Tasks', ''];
      if (tasks.length === 0) {
        lines.push('No tasks yet.');
      } else {
        tasks.forEach((t, i) => {
          const status = t.completed ? '[x]' : '[ ]';
          const due = t.dueDate ? ' — ' + formatDueDate(t.dueDate) : '';
          lines.push((i + 1) + '. ' + status + ' ' + t.text + ' (' + (t.priority || 'Medium') + ')' + due);
        });
      }
      const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'taskr-tasks.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    // --- Import tasks: reads a plain-text task file (one task per line,
    // the same format the Export button produces) and adds the lines as
    // new tasks. Header lines and blank lines are skipped; a leading
    // "1. " number, "[x]"/"[ ]" status, trailing " (Priority)" and
    // trailing " — Due 28 Oct" are parsed back into the task fields. ---
    const IMPORT_MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

    function parseImportedLine(line) {
      let s = line.trim();
      if (!s) return null;
      if (s === 'TASKR — My Tasks' || s === 'No tasks yet.') return null;
      s = s.replace(/^\d+\.\s*/, '');
      let completed = false;
      const status = s.match(/^\[(x| )\]\s*/i);
      if (status) { completed = status[1].toLowerCase() === 'x'; s = s.slice(status[0].length); }
      let dueDate = null;
      const due = s.match(/\s*—\s*Due\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*$/i);
      if (due) {
        const monthName = due[2][0].toUpperCase() + due[2].slice(1).toLowerCase();
        const d = new Date(new Date().getFullYear(), IMPORT_MONTHS[monthName], Number(due[1]));
        if (!isNaN(d)) dueDate = d.toISOString().slice(0, 10);
        s = s.slice(0, due.index).trim();
      }
      let priority = 'Medium';
      const prio = s.match(/\s*\((Low|Medium|High)\)\s*$/i);
      if (prio) { priority = prio[1][0].toUpperCase() + prio[1].slice(1).toLowerCase(); s = s.slice(0, prio.index).trim(); }
      if (!s) return null;
      return { text: s, priority, completed, dueDate };
    }

    function importTasksFromText(text) {
      const parsed = text.split(/\r?\n/).map(parseImportedLine).filter(Boolean);
      let added = 0;
      parsed.forEach(p => {
        let newId = Date.now();
        while (tasks.some(t => t.id === newId)) newId++;
        tasks.unshift({
          id: newId,
          text: p.text,
          priority: p.priority,
          completed: p.completed,
          createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          dueDate: p.dueDate
        });
        added++;
      });
      if (added > 0) { save(); render(); }
      return added;
    }

    // --- Get filtered tasks ---
    function filtered() {
      let list;
      if (activeFilter === 'pending')   list = tasks.filter(t => !t.completed);
      else if (activeFilter === 'completed') list = tasks.filter(t => t.completed);
      else list = tasks.slice();
      // Priority filter works together with the status filter above.
      if (activePriority !== 'all') list = list.filter(t => (t.priority || 'Medium') === activePriority);
      // Live text search works together with the status and priority filters above.
      // It matches the task title, and also the task's priority text, so typing
      // "high", "medium" or "low" shows only tasks of that priority.
      if (searchQuery) list = list.filter(t =>
        t.text.toLowerCase().includes(searchQuery) ||
        (t.priority || 'Medium').toLowerCase().includes(searchQuery));
      // Tasks are stored newest-first, so oldest order is just the reverse;
      // filtering and searching happen first, so sorting works with both.
      // Due-date order: earliest due date first; tasks with no due date
      // (or an invalid one) go last, keeping their relative order.
      // Priority order: High first, then Medium, then Low; tasks with
      // the same priority keep their relative order (sort is stable).
      if (sortOrder === 'priority') {
        const rank = { High: 0, Medium: 1, Low: 2 };
        return list.slice().sort((a, b) =>
          (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1));
      }
      if (sortOrder === 'due') {
        return list.slice().sort((a, b) => {
          const da = a.dueDate ? new Date(a.dueDate + 'T00:00:00') : NaN;
          const db = b.dueDate ? new Date(b.dueDate + 'T00:00:00') : NaN;
          const aHas = !isNaN(da), bHas = !isNaN(db);
          if (aHas && bHas) return da - db;
          if (aHas) return -1;
          if (bHas) return 1;
          return 0;
        });
      }
      return sortOrder === 'oldest' ? list.reverse() : list;
    }

    // --- Update stats ---
    function updateStats() {
      const total   = tasks.length;
      const done    = tasks.filter(t => t.completed).length;
      const pending = total - done;
      document.getElementById('stat-total').textContent   = total;
      document.getElementById('stat-pending').textContent = pending;
      document.getElementById('stat-done').textContent    = done;
      document.getElementById('remaining-count').textContent =
        pending === 0 ? 'All caught up ✓' : `${pending} task${pending !== 1 ? 's' : ''} remaining`;
      // Completion progress bar: percentage of tasks done, updated on every render.
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      const bar = document.getElementById('progress-bar');
      if (bar) bar.style.width = pct + '%';
      const wrap = document.getElementById('progress-wrap');
      if (wrap) wrap.setAttribute('aria-valuenow', String(pct));
      const label = document.getElementById('progress-label');
      if (label) label.textContent = pct + '% complete';
    }

    // --- Render ---
    function render() {
      const list  = document.getElementById('task-list');
      const empty = document.getElementById('empty-state');
      const items = filtered();

      list.innerHTML = '';

      if (items.length === 0) {
        empty.style.display = 'block';
      } else {
        empty.style.display = 'none';
        items.forEach(task => {
          const el = document.createElement('div');
          el.className = 'task-item' + (task.completed ? ' completed' : '') + (isOverdue(task) ? ' overdue' : '');
          el.innerHTML = `
            <div class="check-wrap" data-id="${task.id}" title="Toggle complete">
              <span class="check-icon">✓</span>
            </div>
            <span class="task-text">${escHtml(task.text)}</span>
            ${task.dueDate ? `<span class="task-due">${escHtml(formatDueDate(task.dueDate))}</span>` : ''}
            ${isOverdue(task) ? '<span class="overdue-tag">Overdue</span>' : ''}
            <span class="priority-badge priority-${(task.priority || 'Medium').toLowerCase()}">${escHtml(task.priority || 'Medium')}</span>
            <span class="task-date">${task.createdAt}</span>
            <button class="edit-btn" data-id="${task.id}" title="Edit">✎</button>
            <button class="dup-btn" data-id="${task.id}" title="Duplicate">⧉</button>
            <button class="del-btn" data-id="${task.id}" title="Delete">✕</button>
          `;
          list.appendChild(el);
        });
      }

      updateStats();
    }

    // --- Escape HTML ---
    function escHtml(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // --- Event delegation ---
    document.getElementById('task-list').addEventListener('click', e => {
      const check = e.target.closest('.check-wrap');
      const del   = e.target.closest('.del-btn');
      const edit  = e.target.closest('.edit-btn');
      const dup   = e.target.closest('.dup-btn');
      if (check) toggleTask(Number(check.dataset.id));
      if (del)   deleteTask(Number(del.dataset.id));
      if (edit)  editTask(Number(edit.dataset.id), edit.closest('.task-item'));
      if (dup)   duplicateTask(Number(dup.dataset.id));
    });

    // --- Quick due-date buttons: Today / Tomorrow ---
    // Format a Date as a local 'YYYY-MM-DD' string for the date input.
    function toLocalDateString(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }
    // Highlight the quick button whose date matches the current due value.
    function syncDueQuickButtons() {
      const due = document.getElementById('task-due');
      if (!due) return;
      const today = toLocalDateString(new Date());
      const tomorrow = toLocalDateString(new Date(Date.now() + 86400000));
      document.querySelectorAll('.due-quick-btn').forEach(btn => {
        const target = Number(btn.dataset.days) === 0 ? today : tomorrow;
        btn.classList.toggle('active', due.value === target);
      });
    }
    document.querySelectorAll('.due-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const due = document.getElementById('task-due');
        const days = Number(btn.dataset.days) || 0;
        due.value = toLocalDateString(new Date(Date.now() + days * 86400000));
        syncDueQuickButtons();
        document.getElementById('task-input').focus();
      });
    });
    document.getElementById('task-due').addEventListener('change', syncDueQuickButtons);

    // Add button
    document.getElementById('add-btn').addEventListener('click', () => {
      const inp = document.getElementById('task-input');
      const due = document.getElementById('task-due');
      addTask(inp.value, due.value, document.getElementById('priority-select').value);
      inp.value = '';
      due.value = '';
      syncDueQuickButtons();
      inp.focus();
    });

    // Enter key
    document.getElementById('task-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const due = document.getElementById('task-due');
        addTask(e.target.value, due.value, document.getElementById('priority-select').value);
        e.target.value = '';
        due.value = '';
        syncDueQuickButtons();
      }
    });

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        render();
      });
    });

    // Priority filter: All / Low / Medium / High, works with the status
    // filter, live search and sort above.
    document.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePriority = btn.dataset.priority;
        render();
      });
    });

    // Sort select: newest / oldest / due date / priority, working with the filters
    // and live search above.
    document.getElementById('sort-select').addEventListener('change', e => {
      sortOrder = e.target.value;
      render();
    });

    // Live search: filters tasks by title or priority text, together with the active filters
    document.getElementById('search-input').addEventListener('input', e => {
      searchQuery = e.target.value.trim().toLowerCase();
      render();
    });

    // Mark all complete: marks every pending task complete
    document.getElementById('mark-all-btn').addEventListener('click', markAllComplete);

    // Clear completed
    document.getElementById('clear-btn').addEventListener('click', clearCompleted);

    // Delete all tasks (with confirm prompt)
    document.getElementById('delete-all-btn').addEventListener('click', deleteAllTasks);

    // Export tasks as a plain-text download
    document.getElementById('export-btn').addEventListener('click', exportTasks);

    // Import tasks from a plain-text file (same format as Export):
    // the button opens the file picker; the chosen file is read and
    // its lines are added as new tasks, with a short count feedback.
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-input').click();
    });
    document.getElementById('import-input').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const count = importTasksFromText(String(reader.result || ''));
        const btn = document.getElementById('import-btn');
        if (btn) {
          btn.textContent = count === 0 ? 'No tasks found in file' : `Imported ${count} task${count === 1 ? '' : 's'}`;
          setTimeout(() => { btn.textContent = 'Import Tasks'; }, 2500);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Undo the most recent delete, while the toast is shown
    document.getElementById('undo-btn').addEventListener('click', undoDelete);

    // Boot
    applyTheme(loadTheme());
    load();
    render();
    document.getElementById('task-input').focus();
