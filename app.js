const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

const DATA_DIR = path.join(__dirname, 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory and tasks file exist
function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(TASKS_FILE)) {
      fs.writeFileSync(TASKS_FILE, '[]', 'utf8');
    }
  } catch (err) {
    console.error('Error ensuring data file exists:', err.message);
  }
}

// Read tasks from file
function readTasks() {
  try {
    ensureDataFile();
    const data = fs.readFileSync(TASKS_FILE, 'utf8');
    const trimmed = data.trim();
    if (!trimmed) {
      return [];
    }
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading tasks file:', err.message);
    return [];
  }
}

// Write tasks to file
function writeTasks(tasks) {
  try {
    ensureDataFile();
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing tasks file:', err.message);
    return false;
  }
}

// Generate a unique ID
function generateId(tasks) {
  if (tasks.length === 0) return 1;
  const maxId = Math.max(...tasks.map(t => t.id));
  return maxId + 1;
}

// Validate task input
function validateTask(body) {
  const errors = [];
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    errors.push('Task title is required.');
  }
  if (!body.subject || typeof body.subject !== 'string' || !body.subject.trim()) {
    errors.push('Subject is required.');
  }
  if (!body.deadline) {
    errors.push('Deadline is required.');
  } else {
    const deadlineDate = new Date(body.deadline);
    if (isNaN(deadlineDate.getTime())) {
      errors.push('Deadline must be a valid date.');
    }
  }
  const validPriorities = ['Low', 'Medium', 'High'];
  if (body.priority && !validPriorities.includes(body.priority)) {
    errors.push('Priority must be Low, Medium, or High.');
  }
  const validStatuses = ['Pending', 'Completed'];
  if (body.status && !validStatuses.includes(body.status)) {
    errors.push('Status must be Pending or Completed.');
  }
  return errors;
}

// ============ API Routes ============

// GET /api/tasks - Return all tasks
app.get('/api/tasks', (req, res) => {
  const tasks = readTasks();
  res.json(tasks);
});

// POST /api/tasks - Create a new task
app.post('/api/tasks', (req, res) => {
  const errors = validateTask(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const tasks = readTasks();
  const newTask = {
    id: generateId(tasks),
    title: req.body.title.trim(),
    subject: req.body.subject.trim(),
    description: req.body.description ? req.body.description.trim() : '',
    deadline: req.body.deadline,
    priority: req.body.priority || 'Medium',
    status: 'Pending',
    createdAt: new Date().toISOString().split('T')[0]
  };

  tasks.push(newTask);
  if (!writeTasks(tasks)) {
    return res.status(500).json({ error: 'Failed to save task. Please try again.' });
  }
  res.status(201).json(newTask);
});

// PUT /api/tasks/:id - Update a task
app.put('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid task ID.' });
  }

  const tasks = readTasks();
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  // Only validate fields that are being updated
  const body = req.body;
  if (body.title !== undefined && (!body.title || typeof body.title !== 'string' || !body.title.trim())) {
    return res.status(400).json({ error: 'Task title cannot be empty.' });
  }
  if (body.subject !== undefined && (!body.subject || typeof body.subject !== 'string' || !body.subject.trim())) {
    return res.status(400).json({ error: 'Subject cannot be empty.' });
  }
  if (body.deadline !== undefined) {
    const deadlineDate = new Date(body.deadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ error: 'Deadline must be a valid date.' });
    }
  }
  const validPriorities = ['Low', 'Medium', 'High'];
  if (body.priority && !validPriorities.includes(body.priority)) {
    return res.status(400).json({ error: 'Priority must be Low, Medium, or High.' });
  }
  const validStatuses = ['Pending', 'Completed'];
  if (body.status && !validStatuses.includes(body.status)) {
    return res.status(400).json({ error: 'Status must be Pending or Completed.' });
  }

  // Update allowed fields
  const task = tasks[taskIndex];
  if (body.title !== undefined) task.title = body.title.trim();
  if (body.subject !== undefined) task.subject = body.subject.trim();
  if (body.description !== undefined) task.description = body.description.trim();
  if (body.deadline !== undefined) task.deadline = body.deadline;
  if (body.priority !== undefined) task.priority = body.priority;
  if (body.status !== undefined) task.status = body.status;

  tasks[taskIndex] = task;
  if (!writeTasks(tasks)) {
    return res.status(500).json({ error: 'Failed to update task. Please try again.' });
  }
  res.json(task);
});

// DELETE /api/tasks/:id - Delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid task ID.' });
  }

  const tasks = readTasks();
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  tasks.splice(taskIndex, 1);
  if (!writeTasks(tasks)) {
    return res.status(500).json({ error: 'Failed to delete task. Please try again.' });
  }
  res.json({ message: 'Task deleted successfully.' });
});

// GET /api/stats - Return dashboard statistics
app.get('/api/stats', (req, res) => {
  const tasks = readTasks();
  const today = new Date().toISOString().split('T')[0];

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const pending = tasks.filter(t => t.status === 'Pending').length;
  const overdue = tasks.filter(t => t.status === 'Pending' && t.deadline < today).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.json({
    total,
    completed,
    pending,
    overdue,
    completionRate
  });
});

// Start server
ensureDataFile();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
