const STORAGE_KEY = 'taskr_tasks';
    let tasks = [];
    let activeFilter = 'all';
    let sortOrder = 'newest'; // 'newest' | 'oldest' — tasks are stored newest-first

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

    // --- Add task (dueDate is an optional 'YYYY-MM-DD' string) ---
    function addTask(text, dueDate) {
      const trimmed = text.trim();
      if (!trimmed) return;
      tasks.unshift({
        id: Date.now(),
        text: trimmed,
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

    // --- Delete task, with a short undo window ---
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
      lastDeleted = { task: tasks[index], index };
      tasks = tasks.filter(t => t.id !== id);
      save();
      render();
      showUndoToast();
    }

    // --- Clear completed ---
    function clearCompleted() {
      tasks = tasks.filter(t => !t.completed);
      save();
      render();
    }

    // --- Get filtered tasks ---
    function filtered() {
      let list;
      if (activeFilter === 'pending')   list = tasks.filter(t => !t.completed);
      else if (activeFilter === 'completed') list = tasks.filter(t => t.completed);
      else list = tasks.slice();
      // Tasks are stored newest-first, so oldest order is just the reverse;
      // filtering happens first, so sorting works with the active filter.
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
          el.className = 'task-item' + (task.completed ? ' completed' : '');
          el.innerHTML = `
            <div class="check-wrap" data-id="${task.id}" title="Toggle complete">
              <span class="check-icon">✓</span>
            </div>
            <span class="task-text">${escHtml(task.text)}</span>
            ${task.dueDate ? `<span class="task-due">${escHtml(formatDueDate(task.dueDate))}</span>` : ''}
            <span class="task-date">${task.createdAt}</span>
            <button class="edit-btn" data-id="${task.id}" title="Edit">✎</button>
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
      if (check) toggleTask(Number(check.dataset.id));
      if (del)   deleteTask(Number(del.dataset.id));
      if (edit)  editTask(Number(edit.dataset.id), edit.closest('.task-item'));
    });

    // Add button
    document.getElementById('add-btn').addEventListener('click', () => {
      const inp = document.getElementById('task-input');
      const due = document.getElementById('task-due');
      addTask(inp.value, due.value);
      inp.value = '';
      due.value = '';
      inp.focus();
    });

    // Enter key
    document.getElementById('task-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const due = document.getElementById('task-due');
        addTask(e.target.value, due.value);
        e.target.value = '';
        due.value = '';
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

    // Sort toggle: newest <-> oldest
    document.getElementById('sort-btn').addEventListener('click', e => {
      sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
      e.target.textContent = sortOrder === 'newest' ? 'Sort: Newest ↓' : 'Sort: Oldest ↑';
      render();
    });

    // Clear completed
    document.getElementById('clear-btn').addEventListener('click', clearCompleted);

    // Undo the most recent delete, while the toast is shown
    document.getElementById('undo-btn').addEventListener('click', undoDelete);

    // Boot
    load();
    render();
    document.getElementById('task-input').focus();