const express = require('express');
const router = express.Router();
const { createTask, getTasks } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// all task routes require login — apply protect to every route in this file
router.use(protect);

// POST /api/tasks  →  create a task
router.post('/', createTask);

// GET /api/tasks  →  get the logged-in user's tasks
router.get('/', getTasks);

module.exports = router;