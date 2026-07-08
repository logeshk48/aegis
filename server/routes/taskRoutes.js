const express = require('express');
const router = express.Router();
const {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// all task routes require login — apply protect to every route in this file
router.use(protect);

// POST /api/tasks       →  create a task
router.post('/', createTask);

// GET /api/tasks        →  get the logged-in user's tasks
router.get('/', getTasks);

// PUT /api/tasks/:id    →  update a specific task
router.put('/:id', updateTask);

// DELETE /api/tasks/:id →  delete a specific task
router.delete('/:id', deleteTask);

module.exports = router;