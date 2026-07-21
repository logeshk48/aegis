const express = require('express');
const router = express.Router();
const { parseAndCreateTasks, askAboutMyData } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// all AI routes require login
router.use(protect);

// POST /api/ai/parse  →  parse text into tasks and save them
router.post('/parse', parseAndCreateTasks);

// POST /api/ai/ask    →  answer a question about the user's data
router.post('/ask', askAboutMyData);

module.exports = router;