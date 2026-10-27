const STORAGE_KEY = 'taskr_tasks';
    let tasks = [];
    let activeFilter = 'all';

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

    // --- Add task ---
    function addTask(text) {
      const trimmed = text.trim();
      if (!trimmed) return;
      tasks.unshift({
        id: Date.now(),
        text: trimmed,
        completed: false,
        createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      });
      save();
      render();
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

    // --- Delete task ---
    function deleteTask(id) {
      tasks = tasks.filter(t => t.id !== id);
      save();
      render();
    }

    // --- Clear completed ---
    function clearCompleted() {
      tasks = tasks.filter(t => !t.completed);
      save();
      render();
    }

    // --- Get filtered tasks ---
    function filtered() {
      if (activeFilter === 'pending')   return tasks.filter(t => !t.completed);
      if (activeFilter === 'completed') return tasks.filter(t => t.completed);
      return tasks;
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
      addTask(inp.value);
      inp.value = '';
      inp.focus();
    });

    // Enter key
    document.getElementById('task-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        addTask(e.target.value);
        e.target.value = '';
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

    // Clear completed
    document.getElementById('clear-btn').addEventListener('click', clearCompleted);

    // Boot
    load();
    render();
    document.getElementById('task-input').focus();