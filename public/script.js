/* ============================================
   Student Productivity Dashboard - Frontend JS
   ============================================ */

(function () {
  'use strict';

  // --- Appearance: persistent light/dark theme ---
  const themeToggle = document.getElementById('theme-toggle');
  const themeStorageKey = 'spd-theme';

  function applyTheme(theme) {
    const selectedTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = selectedTheme;
    if (themeToggle) {
      const nextTheme = selectedTheme === 'dark' ? 'light' : 'dark';
      themeToggle.setAttribute('aria-label', 'Switch to ' + nextTheme + ' mode');
      themeToggle.setAttribute('title', 'Switch to ' + nextTheme + ' mode');
    }
    try { localStorage.setItem(themeStorageKey, selectedTheme); } catch (_) { /* Storage may be unavailable. */ }
  }

  if (themeToggle) {
    applyTheme(document.documentElement.dataset.theme || 'light');
    themeToggle.addEventListener('click', function () {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }

  // --- State ---
  let tasks = [];
  let currentFilter = 'all';
  let currentSort = 'recent';
  let searchQuery = '';
  let editingTaskId = null;
  let deletingTaskId = null;

  // --- DOM Elements ---
  const btnAddTask = document.getElementById('btn-add-task');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalClose = document.getElementById('modal-close');
  const taskForm = document.getElementById('task-form');
  const btnCancel = document.getElementById('btn-cancel');
  const btnSubmit = document.getElementById('btn-submit');

  const deleteModalOverlay = document.getElementById('delete-modal-overlay');
  const deleteModalClose = document.getElementById('delete-modal-close');
  const btnDeleteCancel = document.getElementById('btn-delete-cancel');
  const btnDeleteConfirm = document.getElementById('btn-delete-confirm');

  const searchInput = document.getElementById('search-input');
  const filterGroup = document.getElementById('filter-group');
  const sortSelect = document.getElementById('sort-select');

  const tasksGrid = document.getElementById('tasks-grid');
  const emptyState = document.getElementById('empty-state');
  const emptyStateText = document.getElementById('empty-state-text');

  const statTotalValue = document.getElementById('stat-total-value');
  const statPendingValue = document.getElementById('stat-pending-value');
  const statCompletedValue = document.getElementById('stat-completed-value');
  const statOverdueValue = document.getElementById('stat-overdue-value');
  const statRateValue = document.getElementById('stat-rate-value');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressLegendText = document.getElementById('progress-legend-text');

  const toastContainer = document.getElementById('toast-container');

  // Form fields
  const fieldTitle = document.getElementById('task-title');
  const fieldSubject = document.getElementById('task-subject');
  const fieldDescription = document.getElementById('task-description');
  const fieldDeadline = document.getElementById('task-deadline');
  const fieldPriority = document.getElementById('task-priority');

  const errorTitle = document.getElementById('error-title');
  const errorSubject = document.getElementById('error-subject');
  const errorDeadline = document.getElementById('error-deadline');

  // --- Utility Functions ---

  function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function isOverdue(task) {
    return task.status !== 'Completed' && task.deadline < getToday();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('toast-out');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3000);
  }

  // --- API Functions ---

  function apiGet(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          throw new Error(data.error || 'Request failed.');
        });
      }
      return res.json();
    });
  }

  function apiPost(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          throw new Error(data.error || 'Request failed.');
        });
      }
      return res.json();
    });
  }

  function apiPut(url, body) {
    return fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          throw new Error(data.error || 'Request failed.');
        });
      }
      return res.json();
    });
  }

  function apiDelete(url) {
    return fetch(url, {
      method: 'DELETE'
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          throw new Error(data.error || 'Request failed.');
        });
      }
      return res.json();
    });
  }

  // --- Data Loading ---

  function loadTasks() {
    apiGet('/api/tasks')
      .then(function (data) {
        tasks = data;
        renderTasks();
        loadStats();
        if (!analyticsPage.hidden) renderAnalytics();
        if (!calendarPage.hidden) renderCalendar();
        if (!kanbanPage.hidden) renderKanban();
      })
      .catch(function (err) {
        showToast('Failed to load tasks.', 'error');
        console.error(err);
      });
  }

  function loadStats() {
    apiGet('/api/stats')
      .then(function (stats) {
        statTotalValue.textContent = stats.total;
        statPendingValue.textContent = stats.pending;
        statCompletedValue.textContent = stats.completed;
        statOverdueValue.textContent = stats.overdue;
        statRateValue.textContent = stats.completionRate + '%';
        progressBarFill.style.width = stats.completionRate + '%';
        progressLegendText.textContent = stats.completed + ' of ' + stats.total + ' tasks completed';
      })
      .catch(function (err) {
        console.error(err);
      });
  }

  // --- Rendering ---

  function getFilteredTasks() {
    var filtered = tasks.slice();

    // Filter
    if (currentFilter === 'pending') {
      filtered = filtered.filter(function (t) { return t.status !== 'Completed' && !isOverdue(t); });
    } else if (currentFilter === 'completed') {
      filtered = filtered.filter(function (t) { return t.status === 'Completed'; });
    } else if (currentFilter === 'overdue') {
      filtered = filtered.filter(function (t) { return isOverdue(t); });
    }

    // Search
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      filtered = filtered.filter(function (t) {
        return t.title.toLowerCase().indexOf(q) !== -1 ||
               t.subject.toLowerCase().indexOf(q) !== -1;
      });
    }

    // Sort
    if (currentSort === 'deadline') {
      filtered.sort(function (a, b) {
        return a.deadline.localeCompare(b.deadline);
      });
    } else if (currentSort === 'priority') {
      var priorityOrder = { High: 0, Medium: 1, Low: 2 };
      filtered.sort(function (a, b) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    } else {
      // recent — newest first
      filtered.sort(function (a, b) {
        return b.id - a.id;
      });
    }

    return filtered;
  }

  function renderTasks() {
    var filtered = getFilteredTasks();

    if (filtered.length === 0) {
      tasksGrid.style.display = 'none';
      emptyState.style.display = '';
      if (tasks.length === 0) {
        emptyStateText.textContent = 'Add your first assignment to get started.';
      } else {
        emptyStateText.textContent = 'No tasks match your current filters.';
      }
      return;
    }

    tasksGrid.style.display = '';
    emptyState.style.display = 'none';
    tasksGrid.innerHTML = '';

    filtered.forEach(function (task) {
      tasksGrid.appendChild(createTaskCard(task));
    });
  }

  function createTaskCard(task) {
    var taskOverdue = isOverdue(task);
    var card = document.createElement('div');
    card.className = 'task-card';
    if (task.status === 'Completed') card.className += ' completed';
    else if (taskOverdue) card.className += ' overdue';
    card.setAttribute('data-id', task.id);

    // Status badge class
    var statusBadgeClass = 'badge badge-status-';
    var statusLabel;
    if (task.status === 'Completed') {
      statusBadgeClass += 'completed';
      statusLabel = 'Completed';
    } else if (taskOverdue) {
      statusBadgeClass += 'overdue';
      statusLabel = 'Overdue';
    } else {
      statusBadgeClass += 'pending';
      statusLabel = task.status === 'In Progress' ? 'In Progress' : 'Pending';
    }

    // Priority badge class
    var priorityBadgeClass = 'badge badge-priority-' + task.priority.toLowerCase();

    // Description
    var descriptionHTML = '';
    if (task.description) {
      descriptionHTML = '<p class="task-card-description">' + escapeHtml(task.description) + '</p>';
    }

    // Deadline display
    var deadlineClass = taskOverdue ? 'task-card-meta-item overdue-text' : 'task-card-meta-item';

    // Toggle button
    var toggleTitle, toggleSvg;
    if (task.status === 'Completed') {
      toggleTitle = 'Mark as Pending';
      toggleSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>';
    } else {
      toggleTitle = 'Mark as Completed';
      toggleSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    }

    card.innerHTML =
      '<div class="task-card-header">' +
        '<div>' +
          '<h3 class="task-card-title">' + escapeHtml(task.title) + '</h3>' +
          '<span class="task-card-subject">' + escapeHtml(task.subject) + '</span>' +
        '</div>' +
        '<div class="task-card-badges">' +
          '<span class="' + priorityBadgeClass + '">' + escapeHtml(task.priority) + '</span>' +
          '<span class="' + statusBadgeClass + '">' + statusLabel + '</span>' +
        '</div>' +
      '</div>' +
      descriptionHTML +
      '<div class="task-card-meta">' +
        '<span class="' + deadlineClass + '">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>' +
            '<line x1="16" y1="2" x2="16" y2="6"></line>' +
            '<line x1="8" y1="2" x2="8" y2="6"></line>' +
            '<line x1="3" y1="10" x2="21" y2="10"></line>' +
          '</svg> ' +
          'Due: ' + formatDate(task.deadline) +
        '</span>' +
        '<span class="task-card-meta-item">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<circle cx="12" cy="12" r="10"></circle>' +
            '<polyline points="12 6 12 12 16 14"></polyline>' +
          '</svg> ' +
          formatDate(task.createdAt) +
        '</span>' +
        '<div class="task-card-actions">' +
          '<button class="btn-icon success" title="' + toggleTitle + '" data-action="toggle" data-id="' + task.id + '" type="button">' +
            toggleSvg +
          '</button>' +
          '<button class="btn-icon" title="Edit" data-action="edit" data-id="' + task.id + '" type="button">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>' +
              '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>' +
            '</svg>' +
          '</button>' +
          '<button class="btn-icon danger" title="Delete" data-action="delete" data-id="' + task.id + '" type="button">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline points="3 6 5 6 21 6"></polyline>' +
              '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
              '<line x1="10" y1="11" x2="10" y2="17"></line>' +
              '<line x1="14" y1="11" x2="14" y2="17"></line>' +
            '</svg>' +
          '</button>' +
        '</div>' +
      '</div>';

    return card;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // --- Modal Handling ---

  function openAddModal() {
    editingTaskId = null;
    modalTitle.textContent = 'Add Assignment';
    btnSubmit.textContent = 'Add Assignment';
    taskForm.reset();
    clearFormErrors();
    modalOverlay.classList.add('open');
    fieldTitle.focus();
  }

  function openEditModal(taskId) {
    var task = tasks.find(function (t) { return t.id === taskId; });
    if (!task) return;

    editingTaskId = taskId;
    modalTitle.textContent = 'Edit Assignment';
    btnSubmit.textContent = 'Save Changes';
    clearFormErrors();

    fieldTitle.value = task.title;
    fieldSubject.value = task.subject;
    fieldDescription.value = task.description || '';
    fieldDeadline.value = task.deadline;
    fieldPriority.value = task.priority;

    modalOverlay.classList.add('open');
    fieldTitle.focus();
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    editingTaskId = null;
  }

  function openDeleteModal(taskId) {
    deletingTaskId = taskId;
    deleteModalOverlay.classList.add('open');
  }

  function closeDeleteModal() {
    deleteModalOverlay.classList.remove('open');
    deletingTaskId = null;
  }

  function clearFormErrors() {
    errorTitle.textContent = '';
    errorSubject.textContent = '';
    errorDeadline.textContent = '';
    fieldTitle.classList.remove('invalid');
    fieldSubject.classList.remove('invalid');
    fieldDeadline.classList.remove('invalid');
  }

  // --- Form Validation ---

  function validateForm() {
    var valid = true;
    clearFormErrors();

    if (!fieldTitle.value.trim()) {
      errorTitle.textContent = 'Title is required.';
      fieldTitle.classList.add('invalid');
      valid = false;
    }
    if (!fieldSubject.value.trim()) {
      errorSubject.textContent = 'Subject is required.';
      fieldSubject.classList.add('invalid');
      valid = false;
    }
    if (!fieldDeadline.value) {
      errorDeadline.textContent = 'Deadline is required.';
      fieldDeadline.classList.add('invalid');
      valid = false;
    }

    return valid;
  }

  // --- Task Actions ---

  function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    var body = {
      title: fieldTitle.value.trim(),
      subject: fieldSubject.value.trim(),
      description: fieldDescription.value.trim(),
      deadline: fieldDeadline.value,
      priority: fieldPriority.value
    };

    if (editingTaskId) {
      apiPut('/api/tasks/' + editingTaskId, body)
        .then(function () {
          closeModal();
          loadTasks();
          showToast('Assignment updated successfully.', 'success');
        })
        .catch(function (err) {
          showToast(err.message, 'error');
        });
    } else {
      apiPost('/api/tasks', body)
        .then(function () {
          closeModal();
          loadTasks();
          showToast('Assignment added successfully.', 'success');
        })
        .catch(function (err) {
          showToast(err.message, 'error');
        });
    }
  }

  function toggleTaskStatus(taskId) {
    var task = tasks.find(function (t) { return t.id === taskId; });
    if (!task) return;

    var newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    apiPut('/api/tasks/' + taskId, { status: newStatus })
      .then(function () {
        loadTasks();
        showToast(
          newStatus === 'Completed' ? 'Assignment marked as completed.' : 'Assignment marked as pending.',
          'success'
        );
      })
      .catch(function (err) {
        showToast(err.message, 'error');
      });
  }

  function deleteTask() {
    if (!deletingTaskId) return;
    apiDelete('/api/tasks/' + deletingTaskId)
      .then(function () {
        closeDeleteModal();
        loadTasks();
        showToast('Assignment deleted.', 'success');
      })
      .catch(function (err) {
        showToast(err.message, 'error');
      });
  }

  // --- Event Listeners ---

  // Add task button
  btnAddTask.addEventListener('click', openAddModal);

  // Modal close
  modalClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  // Delete modal close
  deleteModalClose.addEventListener('click', closeDeleteModal);
  btnDeleteCancel.addEventListener('click', closeDeleteModal);
  deleteModalOverlay.addEventListener('click', function (e) {
    if (e.target === deleteModalOverlay) closeDeleteModal();
  });
  btnDeleteConfirm.addEventListener('click', deleteTask);

  // Form submit
  taskForm.addEventListener('submit', handleFormSubmit);

  // Task card actions (delegated)
  tasksGrid.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;

    var action = btn.getAttribute('data-action');
    var id = parseInt(btn.getAttribute('data-id'));

    if (action === 'toggle') {
      toggleTaskStatus(id);
    } else if (action === 'edit') {
      openEditModal(id);
    } else if (action === 'delete') {
      openDeleteModal(id);
    }
  });

  // Search
  searchInput.addEventListener('input', function () {
    searchQuery = searchInput.value;
    renderTasks();
  });

  // Filter buttons
  filterGroup.addEventListener('click', function (e) {
    var btn = e.target.closest('.filter-btn');
    if (!btn) return;

    currentFilter = btn.getAttribute('data-filter');
    var allBtns = filterGroup.querySelectorAll('.filter-btn');
    for (var i = 0; i < allBtns.length; i++) {
      allBtns[i].classList.remove('active');
    }
    btn.classList.add('active');
    renderTasks();
  });

  // Sort
  sortSelect.addEventListener('change', function () {
    currentSort = sortSelect.value;
    renderTasks();
  });

  // Keyboard: Escape to close modals
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('open')) closeModal();
      if (deleteModalOverlay.classList.contains('open')) closeDeleteModal();
    }
  });


  // --- Navigation, analytics, and live cloud monitor ---
  const navButtons = document.querySelectorAll('.nav-btn');
  const statsSection = document.getElementById('stats-section');
  const toolbarSection = document.getElementById('toolbar');
  const tasksSection = document.getElementById('tasks-section');
  const analyticsPage = document.getElementById('page-analytics');
  const cloudPage = document.getElementById('page-cloud');
  const calendarPage = document.getElementById('page-calendar');
  const kanbanPage = document.getElementById('page-kanban');
  const focusPage = document.getElementById('page-focus');
  let monitorTimer = null;

  function showPage(page) {
    navButtons.forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-page') === page);
    });
    statsSection.hidden = page !== 'overview';
    toolbarSection.hidden = page !== 'overview' && page !== 'tasks';
    tasksSection.hidden = page !== 'overview' && page !== 'tasks';
    analyticsPage.hidden = page !== 'analytics';
    cloudPage.hidden = page !== 'cloud';
    calendarPage.hidden = page !== 'calendar';
    kanbanPage.hidden = page !== 'kanban';
    focusPage.hidden = page !== 'focus';
    if (page === 'analytics') renderAnalytics();
    if (page === 'cloud') refreshMonitor();
    if (page === 'calendar') renderCalendar();
    if (page === 'kanban') renderKanban();
  }

  navButtons.forEach(function (button) {
    button.addEventListener('click', function () { showPage(button.getAttribute('data-page')); });
  });

  function addAnalyticsBar(container, label, count, total, colorClass) {
    const row = document.createElement('div');
    row.className = 'analytics-bar-row';
    const safeTotal = Math.max(total, 1);
    row.innerHTML = '<div class="analytics-bar-label"><span></span><strong></strong></div><div class="analytics-track"><span></span></div>';
    row.querySelector('.analytics-bar-label span').textContent = label;
    row.querySelector('.analytics-bar-label strong').textContent = count;
    const fill = row.querySelector('.analytics-track span');
    fill.style.width = Math.round(count / safeTotal * 100) + '%';
    fill.className = colorClass || '';
    container.appendChild(row);
  }

  function renderAnalytics() {
    const status = document.getElementById('analytics-status');
    const priority = document.getElementById('analytics-priority');
    const recommendations = document.getElementById('study-recommendations');
    status.textContent = '';
    priority.textContent = '';
    recommendations.textContent = '';
    const completed = tasks.filter(function (task) { return task.status === 'Completed'; }).length;
    const overdue = tasks.filter(isOverdue).length;
    const pending = tasks.filter(function (task) { return task.status !== 'Completed' && !isOverdue(task); }).length;
    addAnalyticsBar(status, 'Completed', completed, tasks.length, 'bar-green');
    addAnalyticsBar(status, 'Pending', pending, tasks.length, 'bar-yellow');
    addAnalyticsBar(status, 'Overdue', overdue, tasks.length, 'bar-red');
    ['High', 'Medium', 'Low'].forEach(function (level, index) {
      addAnalyticsBar(priority, level, tasks.filter(function (task) { return task.priority === level; }).length, tasks.length, ['bar-red', 'bar-yellow', 'bar-blue'][index]);
    });
    const suggestions = [];
    if (overdue) suggestions.push(overdue + ' overdue task' + (overdue === 1 ? ' needs' : 's need') + ' your attention first.');
    const upcoming = tasks.filter(function (task) { return task.status !== 'Completed' && task.deadline >= getToday(); }).sort(function (a, b) { return a.deadline.localeCompare(b.deadline); })[0];
    if (upcoming) suggestions.push('Next deadline: "' + upcoming.title + '" on ' + formatDate(upcoming.deadline) + '.');
    if (!tasks.length) suggestions.push('Add your first assignment to unlock personalized workload insights.');
    if (tasks.length && !overdue && !upcoming) suggestions.push('Great work — there are no pending or overdue assignments.');
    suggestions.forEach(function (suggestion) {
      const item = document.createElement('p');
      item.className = 'recommendation-item';
      item.textContent = suggestion;
      recommendations.appendChild(item);
    });
  }

  function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = seconds % 60;
    return (days ? days + 'd ' : '') + hours + 'h ' + minutes + 'm ' + secs + 's';
  }

  function refreshMonitor() {
    apiGet('/api/monitor').then(function (data) {
      document.getElementById('monitor-banner').classList.remove('monitor-offline');
      document.getElementById('monitor-status').textContent = 'Application is healthy';
      document.getElementById('monitor-updated').textContent = 'Last updated: ' + new Date(data.timestamp).toLocaleTimeString();
      document.getElementById('monitor-uptime').textContent = formatUptime(data.uptimeSeconds);
      document.getElementById('monitor-cpu').textContent = data.cpuPercent === null ? 'Collecting sample…' : data.cpuPercent + '%';
      document.getElementById('monitor-cpu-bar').style.width = (data.cpuPercent === null ? 0 : data.cpuPercent) + '%';
      document.getElementById('monitor-memory').textContent = data.processMemoryMB + ' MB';
      document.getElementById('monitor-memory-bar').style.width = Math.min(100, data.processMemoryMB / Math.max(data.runtimeTotalMemoryMB, 1) * 100) + '%';
      document.getElementById('monitor-heap').textContent = data.heapUsedMB + ' / ' + data.heapTotalMB + ' MB';
      document.getElementById('monitor-node').textContent = data.nodeVersion;
      document.getElementById('monitor-platform').textContent = data.platform;
      document.getElementById('monitor-pid').textContent = data.pid;
      document.getElementById('monitor-cores').textContent = data.cpuCores;
    }).catch(function () {
      document.getElementById('monitor-banner').classList.add('monitor-offline');
      document.getElementById('monitor-status').textContent = 'Application unavailable';
      document.getElementById('monitor-updated').textContent = 'Cannot reach /api/monitor. Check whether the app is running.';
      ['monitor-uptime','monitor-cpu','monitor-memory','monitor-heap'].forEach(function (id) {
        document.getElementById(id).textContent = '—';
      });
    });
  }
  document.getElementById('monitor-refresh').addEventListener('click', refreshMonitor);
  document.getElementById('analytics-refresh').addEventListener('click', renderAnalytics);
  monitorTimer = setInterval(function () {
    if (!cloudPage.hidden) refreshMonitor();
  }, 5000);



  // --- Calendar view ---
  let calendarCursor = new Date();
  let selectedCalendarDate = getToday();
  function dateKey(year, month, day) { return year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0'); }
  function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const year = calendarCursor.getFullYear(), month = calendarCursor.getMonth();
    document.getElementById('calendar-month-label').textContent = calendarCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    grid.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((firstDay + days) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
      const day = i - firstDay + 1;
      const cell = document.createElement('button');
      cell.type = 'button'; cell.className = 'calendar-day';
      if (day < 1 || day > days) { cell.classList.add('outside'); cell.disabled = true; }
      else {
        const key = dateKey(year, month, day);
        const dayTasks = tasks.filter(t => t.deadline === key);
        if (key === getToday()) cell.classList.add('today');
        if (key === selectedCalendarDate) cell.classList.add('selected');
        const number = document.createElement('span'); number.className = 'calendar-day-number'; number.textContent = day; cell.appendChild(number);
        if (dayTasks.length) {
          const dots = document.createElement('span'); dots.className = 'calendar-task-dots';
          dayTasks.slice(0, 3).forEach(t => { const dot = document.createElement('i'); dot.className = t.status === 'Completed' ? 'done' : (isOverdue(t) ? 'late' : ''); dots.appendChild(dot); });
          cell.appendChild(dots);
          const count = document.createElement('small'); count.textContent = dayTasks.length + (dayTasks.length === 1 ? ' task' : ' tasks'); cell.appendChild(count);
        }
        cell.addEventListener('click', function () { selectedCalendarDate = key; renderCalendar(); renderCalendarAgenda(); });
      }
      grid.appendChild(cell);
    }
    renderCalendarAgenda();
  }
  function renderCalendarAgenda() {
    const date = document.getElementById('agenda-date');
    const list = document.getElementById('calendar-agenda-list');
    date.textContent = formatDate(selectedCalendarDate); list.innerHTML = '';
    const matches = tasks.filter(t => t.deadline === selectedCalendarDate);
    if (!matches.length) { const empty = document.createElement('p'); empty.className = 'muted-copy'; empty.textContent = 'No assignments due on this date.'; list.appendChild(empty); return; }
    matches.forEach(task => { const item = document.createElement('button'); item.type = 'button'; item.className = 'agenda-task'; const title = document.createElement('strong'); title.textContent = task.title; const meta = document.createElement('span'); meta.textContent = task.subject + ' · ' + task.status; item.append(title, meta); item.addEventListener('click', () => { showPage('tasks'); showToast('Find “' + task.title + '” in your task list.', 'success'); }); list.appendChild(item); });
  }
  document.getElementById('calendar-prev').addEventListener('click', () => { calendarCursor.setMonth(calendarCursor.getMonth() - 1); renderCalendar(); });
  document.getElementById('calendar-next').addEventListener('click', () => { calendarCursor.setMonth(calendarCursor.getMonth() + 1); renderCalendar(); });
  document.getElementById('calendar-today').addEventListener('click', () => { calendarCursor = new Date(); selectedCalendarDate = getToday(); renderCalendar(); });
  document.getElementById('calendar-add-task').addEventListener('click', () => { showPage('tasks'); btnAddTask.click(); });

  // --- Kanban board with persisted status changes ---
  function renderKanban() {
    const columns = { 'Pending': document.getElementById('kanban-pending'), 'In Progress': document.getElementById('kanban-progress'), 'Completed': document.getElementById('kanban-completed') };
    Object.values(columns).forEach(el => el.innerHTML = '');
    const counts = { 'Pending': 0, 'In Progress': 0, 'Completed': 0 };
    tasks.forEach(task => {
      const status = columns[task.status] ? task.status : 'Pending'; counts[status]++;
      const card = document.createElement('article'); card.className = 'kanban-card'; card.draggable = true; card.dataset.id = task.id;
      const title = document.createElement('h4'); title.textContent = task.title;
      const subject = document.createElement('p'); subject.textContent = task.subject;
      const footer = document.createElement('div'); footer.className = 'kanban-card-footer';
      const priority = document.createElement('span'); priority.className = 'priority-chip priority-' + String(task.priority).toLowerCase(); priority.textContent = task.priority;
      const due = document.createElement('span'); due.textContent = formatDate(task.deadline);
      footer.append(priority, due); card.append(title, subject, footer);
      card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(task.id)); card.classList.add('dragging'); });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      columns[status].appendChild(card);
    });
    document.getElementById('count-pending').textContent = counts.Pending;
    document.getElementById('count-progress').textContent = counts['In Progress'];
    document.getElementById('count-completed').textContent = counts.Completed;
  }
  document.querySelectorAll('.kanban-column').forEach(column => {
    column.addEventListener('dragover', e => { e.preventDefault(); column.classList.add('drag-over'); });
    column.addEventListener('dragleave', () => column.classList.remove('drag-over'));
    column.addEventListener('drop', e => {
      e.preventDefault(); column.classList.remove('drag-over');
      const id = Number(e.dataTransfer.getData('text/plain')); const status = column.dataset.status;
      const task = tasks.find(t => t.id === id); if (!task || task.status === status) return;
      apiPut('/api/tasks/' + id, { status }).then(() => { loadTasks(); renderKanban(); showToast('Task moved to ' + status + '.', 'success'); }).catch(err => showToast(err.message, 'error'));
    });
  });
  document.getElementById('kanban-add-task').addEventListener('click', () => { showPage('tasks'); btnAddTask.click(); });

  // --- Pomodoro timer (session statistics are stored per browser) ---
  let focusDuration = 25 * 60, focusRemaining = focusDuration, focusInterval = null, focusRunning = false, focusMode = 'Focus';
  const focusStatsKey = 'spd-focus-stats-' + getToday();
  function getFocusStats() { try { return JSON.parse(localStorage.getItem(focusStatsKey)) || { sessions: 0, minutes: 0 }; } catch (_) { return { sessions: 0, minutes: 0 }; } }
  function renderFocusStats() { const stats = getFocusStats(); document.getElementById('focus-session-count').textContent = stats.sessions; document.getElementById('focus-minutes-count').textContent = stats.minutes; }
  function renderFocusClock() { const m = Math.floor(focusRemaining / 60), sec = focusRemaining % 60; document.getElementById('focus-clock').textContent = String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0'); document.title = focusRunning ? document.getElementById('focus-clock').textContent + ' · Focus' : 'Student Productivity Dashboard'; }
  function stopFocusTimer() { if (focusInterval) clearInterval(focusInterval); focusInterval = null; focusRunning = false; document.getElementById('focus-start').textContent = 'Start'; }
  function completeFocusTimer() {
    stopFocusTimer();
    if (focusMode === 'Focus') { const stats = getFocusStats(); stats.sessions++; stats.minutes += Math.round(focusDuration / 60); localStorage.setItem(focusStatsKey, JSON.stringify(stats)); renderFocusStats(); }
    document.getElementById('focus-hint').textContent = focusMode + ' complete. Take a moment before the next session.';
    if ('Notification' in window && Notification.permission === 'granted') new Notification(focusMode + ' complete', { body: 'Your timer has finished.' });
    renderFocusClock();
  }
  document.getElementById('focus-start').addEventListener('click', function () {
    if (focusRunning) { stopFocusTimer(); return; }
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    focusRunning = true; this.textContent = 'Pause'; document.getElementById('focus-hint').textContent = 'Stay with the task until the timer ends.';
    focusInterval = setInterval(() => { focusRemaining--; renderFocusClock(); if (focusRemaining <= 0) completeFocusTimer(); }, 1000);
  });
  document.getElementById('focus-reset').addEventListener('click', () => { stopFocusTimer(); focusRemaining = focusDuration; renderFocusClock(); document.getElementById('focus-hint').textContent = 'Timer reset. Start when you are ready.'; });
  document.querySelectorAll('.focus-mode').forEach(button => button.addEventListener('click', function () {
    stopFocusTimer(); focusMode = this.dataset.mode; focusDuration = Number(this.dataset.minutes) * 60; focusRemaining = focusDuration;
    document.querySelectorAll('.focus-mode').forEach(b => b.classList.toggle('active', b === this));
    document.getElementById('focus-mode-label').textContent = focusMode.toUpperCase() + ' SESSION'; document.getElementById('focus-hint').textContent = 'Settle in and begin when ready.'; renderFocusClock();
  }));
  document.getElementById('focus-clear-stats').addEventListener('click', () => { localStorage.removeItem(focusStatsKey); renderFocusStats(); });
  renderFocusStats(); renderFocusClock();

  // --- Init ---
  loadTasks();
})();
