const express = require('express');
const router = express.Router();
const {
  getMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  clearMemories,
} = require('../controllers/memoryController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getMemories);
router.post('/', createMemory);
router.put('/:id', updateMemory);
router.delete('/:id', deleteMemory);
router.delete('/', clearMemories);

module.exports = router;