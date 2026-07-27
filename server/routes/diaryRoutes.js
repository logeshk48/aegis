const express = require('express');
const router = express.Router();
const { createEntry, getEntries, deleteEntry } = require('../controllers/diaryController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createEntry);       // create an entry
router.get('/', getEntries);         // list entries
router.delete('/:id', deleteEntry);  // delete an entry

module.exports = router;