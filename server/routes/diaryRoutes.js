const express = require('express');
const router = express.Router();
const { createEntry, getEntries, deleteEntry } = require('../controllers/diaryController');
const { protect } = require('../middleware/authMiddleware');

// all diary routes require login
router.use(protect);

// POST   /api/diary      →  create an entry (auto-extracts tasks + memories)
router.post('/', createEntry);

// GET    /api/diary      →  list entries, newest first
router.get('/', getEntries);

// DELETE /api/diary/:id  →  delete an entry
router.delete('/:id', deleteEntry);

module.exports = router;