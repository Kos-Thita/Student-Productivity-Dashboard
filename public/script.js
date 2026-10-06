/* ============================================
   Student Productivity Dashboard - Frontend JS
   ============================================ */

(function () {
  'use strict';

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
    return task.status === 'Pending' && task.deadline < getToday();
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
      filtered = filtered.filter(function (t) { return t.status === 'Pending' && !isOverdue(t); });
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
      statusLabel = 'Pending';
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

  // --- Init ---
  loadTasks();
})();
